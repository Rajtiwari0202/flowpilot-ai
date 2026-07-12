const { decryptSecret, encryptSecret } = require("../utils/crypto");
const { now } = require("../utils/helpers");
const { REAL_EMAIL_SEND_DISABLED } = require("../config/env");
const { integrationConfig, getIntegrationAccessToken } = require("./oauth.service");

function encodeEmail({ to, subject, body }) {
  return Buffer.from(`To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${body}`).toString("base64url");
}

async function sendGmailFollowUp(store, user, lead, draft, { getUserBusiness }) {
  if (REAL_EMAIL_SEND_DISABLED || user.id === "usr_demo_founder" || !lead?.email) return { provider: "simulation" };
  const integration = store.integrations.find((item) => item.userId === user.id && item.provider === "gmail" && item.status === "connected" && item.encryptedCredentials);
  if (!integration) return { provider: "simulation" };
  const accessToken = await getIntegrationAccessToken(integration);
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      raw: encodeEmail({
        to: lead.email,
        subject: `Following up from ${getUserBusiness(store, user.id)?.name || "our team"}`,
        body: draft
      })
    }),
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error(`Gmail send failed: ${response.status}`);
  return { provider: "gmail", message: await response.json() };
}

function parseGmailFromHeader(value = "") {
  const trimmed = value.trim();
  const match = trimmed.match(/^(.*?)<(.+)>$/);
  if (match) {
    const name = match[1].trim().replace(/^"|"$/g, "");
    const email = match[2].trim();
    return { name: name || email, email };
  }
  return { name: trimmed, email: trimmed };
}

async function listGmailInboxMessages(accessToken, query) {
  const params = new URLSearchParams({ q: query, maxResults: "15" });
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error(`Gmail inbox list failed: ${response.status}`);
  const data = await response.json();
  return data.messages || [];
}

async function getGmailMessage(accessToken, messageId) {
  const params = new URLSearchParams({ format: "metadata" });
  params.append("metadataHeaders", "From");
  params.append("metadataHeaders", "Subject");
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error(`Gmail message fetch failed: ${response.status}`);
  return response.json();
}

async function syncGmailInbox(store, user, { createLeadApproval, writeStore }) {
  const integration = store.integrations.find((item) => item.userId === user.id && item.provider === "gmail" && item.status === "connected" && item.encryptedCredentials);
  if (!integration) {
    const error = new Error("Gmail is not connected for this account");
    error.status = 400;
    throw error;
  }

  const accessToken = await getIntegrationAccessToken(integration);
  if (!accessToken) {
    const error = new Error("Gmail access token is unavailable; reconnect Gmail in Integrations");
    error.status = 400;
    throw error;
  }

  const alreadyCaptured = new Set(
    store.leads.filter((lead) => lead.userId === user.id && lead.gmailMessageId).map((lead) => lead.gmailMessageId)
  );

  const refs = await listGmailInboxMessages(accessToken, "in:inbox -in:chats -category:promotions -category:social newer_than:7d");
  const createdLeads = [];

  for (const ref of refs) {
    if (alreadyCaptured.has(ref.id)) continue;
    let message;
    try {
      message = await getGmailMessage(accessToken, ref.id);
    } catch (error) {
      console.error("Gmail message fetch:", error.message);
      continue;
    }
    const headers = Object.fromEntries((message.payload?.headers || []).map((header) => [header.name, header.value]));
    const sender = parseGmailFromHeader(headers.From || "");
    const subject = headers.Subject || "New inbox inquiry";
    const summary = message.snippet || subject;

    const { lead } = await createLeadApproval(store, user, {
      name: sender.name,
      email: sender.email,
      message: `${subject}: ${summary}`,
      source: "Gmail"
    });
    lead.gmailMessageId = ref.id;
    createdLeads.push(lead);
    if (createdLeads.length >= 10) break;
  }

  await writeStore(store);
  return createdLeads;
}

module.exports = {
  integrationConfig,
  getIntegrationAccessToken,
  encodeEmail,
  sendGmailFollowUp,
  parseGmailFromHeader,
  listGmailInboxMessages,
  getGmailMessage,
  syncGmailInbox,
};
