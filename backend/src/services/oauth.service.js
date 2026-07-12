const crypto = require("crypto");
const { API_PUBLIC_URL } = require("../config/env");
const { signToken, verifyToken } = require("./jwt.service");
const { decryptSecret, encryptSecret } = require("../utils/crypto");
const { now, id } = require("../utils/helpers");

function integrationConfig(provider) {
  if (provider === "gmail") return { clientId: process.env.GMAIL_CLIENT_ID, clientSecret: process.env.GMAIL_CLIENT_SECRET };
  if (provider === "hubspot") return { clientId: process.env.HUBSPOT_CLIENT_ID, clientSecret: process.env.HUBSPOT_CLIENT_SECRET };
  return {};
}

function oauthRedirectUri(provider) {
  return `${API_PUBLIC_URL}/api/oauth/${provider}/callback`;
}

function oauthAuthorizationUrl(provider, userId) {
  const config = integrationConfig(provider);
  if (!config.clientId || !config.clientSecret) return null;
  const state = signToken({ sub: userId, provider });
  if (provider === "gmail") {
    const params = new URLSearchParams({ client_id: config.clientId, redirect_uri: oauthRedirectUri(provider), response_type: "code", access_type: "offline", prompt: "consent", scope: "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly", state });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }
  if (provider === "hubspot") {
    const params = new URLSearchParams({ client_id: config.clientId, redirect_uri: oauthRedirectUri(provider), scope: "crm.objects.contacts.read crm.objects.contacts.write", state });
    return `https://app.hubspot.com/oauth/authorize?${params}`;
  }
  return null;
}

function getGoogleAuthUrl() {
  const config = integrationConfig("gmail");
  if (!config.clientId || !config.clientSecret) return null;
  const state = signToken({ sub: "google_login", provider: "google_login" });
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: `${API_PUBLIC_URL}/api/auth/google/callback`,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.readonly",
    ].join(" "),
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

async function exchangeOauthCode(provider, code) {
  const config = integrationConfig(provider);
  const values = { code, client_id: config.clientId, client_secret: config.clientSecret, redirect_uri: oauthRedirectUri(provider), grant_type: "authorization_code" };
  const endpoint = provider === "gmail" ? "https://oauth2.googleapis.com/token" : "https://api.hubapi.com/oauth/v3/token";
  const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(values), signal: AbortSignal.timeout(12000) });
  const tokens = await response.json();
  if (!response.ok) throw new Error(tokens.error_description || tokens.error || `${provider} OAuth exchange failed`);
  return { ...tokens, obtainedAt: Date.now() };
}

async function getIntegrationAccessToken(integration) {
  const tokens = decryptSecret(integration.encryptedCredentials);
  if (!tokens?.access_token) return null;
  const expiresAt = Number(tokens.obtainedAt || 0) + Number(tokens.expires_in || 0) * 1000;
  if (!tokens.refresh_token || !tokens.expires_in || expiresAt > Date.now() + 60000) return tokens.access_token;
  const config = integrationConfig(integration.provider);
  const endpoint = integration.provider === "gmail" ? "https://oauth2.googleapis.com/token" : "https://api.hubapi.com/oauth/v3/token";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: tokens.refresh_token,
      grant_type: "refresh_token"
    }),
    signal: AbortSignal.timeout(12000)
  });
  const refreshed = await response.json();
  if (!response.ok) throw new Error(`${integration.provider} token refresh failed`);
  integration.encryptedCredentials = encryptSecret({
    ...tokens,
    ...refreshed,
    refresh_token: refreshed.refresh_token || tokens.refresh_token,
    obtainedAt: Date.now()
  });
  integration.updatedAt = now();
  return refreshed.access_token;
}

async function fetchGoogleProfile(accessToken) {
  const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(8000),
  });
  const profile = await profileRes.json();
  if (!profileRes.ok || !profile.email) throw new Error("Could not fetch Google profile");
  return profile;
}

async function processGoogleLogin(code, store, { logActivity, writeStore }) {
  const config = integrationConfig("gmail");
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: `${API_PUBLIC_URL}/api/auth/google/callback`,
      grant_type: "authorization_code"
    }),
    signal: AbortSignal.timeout(12000),
  });
  const tokens = await tokenRes.json();
  if (!tokenRes.ok) throw new Error(tokens.error_description || tokens.error || "Google token exchange failed");

  const profile = await fetchGoogleProfile(tokens.access_token);

  const googleTokens = { ...tokens, obtainedAt: Date.now() };
  let user = store.users.find((u) => u.email === profile.email.toLowerCase());
  const isNewUser = !user;
  if (!user) {
    user = {
      id: id("usr"),
      name: profile.name || profile.email,
      email: profile.email.toLowerCase(),
      passwordHash: null,
      emailVerified: true,
      googleId: profile.id,
      plan: "free",
      createdAt: now(),
    };
    store.users.push(user);
    logActivity(store, { userId: user.id, type: "user.created", label: "Account created via Google", source: "google_oauth" });
  } else {
    user.googleId = profile.id;
    user.emailVerified = true;
    if (!user.name && profile.name) user.name = profile.name;
  }

  upsertIntegration(store, user.id, "gmail", {
    status: "connected",
    encryptedCredentials: encryptSecret(googleTokens),
    connectedEmail: profile.email.toLowerCase(),
  });
  logActivity(store, { userId: user.id, type: "integration.connected", label: `Gmail connected via Google login`, source: "google_oauth" });

  await writeStore(store);
  return { user, isNewUser };
}

function verifyOauthState(stateParam, expectedProvider) {
  const stateToken = verifyToken(stateParam);
  if (!stateToken || stateToken.provider !== expectedProvider) return null;
  return stateToken;
}

function upsertIntegration(store, userId, provider, values = {}) {
  let integration = store.integrations.find((item) => item.userId === userId && item.provider === provider);
  if (!integration) {
    integration = { id: id("int"), userId, provider, createdAt: now() };
    store.integrations.push(integration);
  }
  Object.assign(integration, values, { updatedAt: now() });
  return integration;
}

async function syncHubspotLead(store, user, lead) {
  if (user.id === "usr_demo_founder") return { provider: "simulation" };
  const integration = store.integrations.find((item) => item.userId === user.id && item.provider === "hubspot" && item.status === "connected" && item.encryptedCredentials);
  if (!integration) return { provider: "simulation" };
  const accessToken = await getIntegrationAccessToken(integration);
  const response = await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ properties: { email: lead.email || "", firstname: lead.name, phone: lead.phone || "" } }),
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok && response.status !== 409) throw new Error(`HubSpot contact sync failed: ${response.status}`);
  return { provider: "hubspot" };
}

module.exports = {
  integrationConfig,
  oauthRedirectUri,
  oauthAuthorizationUrl,
  getGoogleAuthUrl,
  exchangeOauthCode,
  getIntegrationAccessToken,
  fetchGoogleProfile,
  processGoogleLogin,
  verifyOauthState,
  upsertIntegration,
  syncHubspotLead,
};
