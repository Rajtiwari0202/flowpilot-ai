const { decryptSecret, encryptSecret } = require("../utils/crypto");
const { now } = require("../utils/helpers");
const { REAL_EMAIL_SEND_DISABLED } = require("../config/env");
const { integrationConfig, getIntegrationAccessToken } = require("./oauth.service");
const { structuredLog } = require("../utils/logger");

function encodeEmail({ to, subject, body }) {
  return Buffer.from(`To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${body}`).toString("base64url");
}

async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  let delay = 1000;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      
      // Retry on Rate Limit (429) or Server Error (5xx)
      if (response.status === 429 || (response.status >= 500 && response.status < 600)) {
        if (attempt === maxRetries) return response;
        structuredLog("warn", "gmail.api.retry", { status: response.status, attempt, delay });
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
        continue;
      }
      return response;
    } catch (err) {
      if (attempt === maxRetries) throw err;
      structuredLog("warn", "gmail.api.retry.error", { message: err.message, attempt, delay });
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
}

async function sendGmailFollowUp(store, user, lead, draft, { getUserBusiness }) {
  if (REAL_EMAIL_SEND_DISABLED || user.id === "usr_demo_founder" || !lead?.email) return { provider: "simulation" };
  const { repository } = require("../app");
  const integration = await repository.integrations.getByUserIdAndProvider(user.id, "gmail");
  if (!integration || integration.status !== "connected" || !integration.encryptedCredentials) return { provider: "simulation" };
  const accessToken = await getIntegrationAccessToken(integration);
  
  const response = await fetchWithRetry("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
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

async function listGmailInboxMessages(accessToken, query, maxPages = 3) {
  let messages = [];
  let pageToken = null;
  for (let page = 0; page < maxPages; page++) {
    const params = new URLSearchParams({ q: query, maxResults: "15" });
    if (pageToken) params.append("pageToken", pageToken);
    
    const response = await fetchWithRetry(`https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(12000)
    });
    if (!response.ok) throw new Error(`Gmail inbox list failed: ${response.status}`);
    const data = await response.json();
    if (data.messages) {
      messages.push(...data.messages);
    }
    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }
  return messages;
}

async function getGmailMessage(accessToken, messageId) {
  const params = new URLSearchParams({ format: "metadata" });
  params.append("metadataHeaders", "From");
  params.append("metadataHeaders", "Subject");
  const response = await fetchWithRetry(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error(`Gmail message fetch failed: ${response.status}`);
  return response.json();
}

async function syncGmailInbox(user, { createLeadApproval }) {
  const { repository } = require("../app");
  const integration = await repository.integrations.getByUserIdAndProvider(user.id, "gmail");
  if (!integration || integration.status !== "connected" || !integration.encryptedCredentials) {
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

  const refs = await listGmailInboxMessages(accessToken, "in:inbox -in:chats -category:promotions -category:social newer_than:7d");
  const createdLeads = [];

  for (const ref of refs) {
    const exists = await repository.leads.getByGmailMessageId(user.id, ref.id);
    if (exists) continue;
    
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

    const { lead } = await createLeadApproval(user, {
      name: sender.name,
      email: sender.email,
      message: `${subject}: ${summary}`,
      source: "Gmail",
      gmailMessageId: ref.id
    });
    
    createdLeads.push(lead);
    if (createdLeads.length >= 10) break;
  }

  return {
    count: createdLeads.length,
    leads: createdLeads
  };
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
