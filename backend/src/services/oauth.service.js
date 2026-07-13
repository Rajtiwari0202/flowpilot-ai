const crypto = require("crypto");
const { APP_ORIGIN } = require("../config/env");
const { decryptSecret, encryptSecret } = require("../utils/crypto");
const { id, now } = require("../utils/helpers");

const integrationConfig = {
  gmail: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    clientId: process.env.GMAIL_CLIENT_ID,
    clientSecret: process.env.GMAIL_CLIENT_SECRET,
    scopes: [
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/userinfo.email"
    ]
  },
  hubspot: {
    authUrl: "https://app.hubspot.com/oauth/authorize",
    tokenUrl: "https://api.hubapi.com/oauth/v1/token",
    clientId: process.env.HUBSPOT_CLIENT_ID,
    clientSecret: process.env.HUBSPOT_CLIENT_SECRET,
    scopes: ["crm.objects.contacts.read", "crm.objects.contacts.write"]
  }
};

function oauthRedirectUri(provider) {
  return `${APP_ORIGIN}/api/oauth/${provider}/callback`;
}

async function oauthAuthorizationUrl(userId, provider) {
  const config = integrationConfig[provider];
  if (!config || !config.clientId) return null;

  const { repository } = require("../app");
  const state = crypto.randomBytes(16).toString("hex");

  await repository.authTokens.create({
    id: id("tok"),
    userId,
    kind: `${provider}_oauth_state`,
    tokenHash: state,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    createdAt: now()
  });

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: oauthRedirectUri(provider),
    response_type: "code",
    scope: config.scopes.join(" "),
    state,
    access_type: "offline",
    prompt: "consent"
  });

  return `${config.authUrl}?${params.toString()}`;
}

async function getGoogleAuthUrl() {
  const config = integrationConfig.gmail;
  if (!config || !config.clientId) return null;

  const { repository } = require("../app");
  const state = crypto.randomBytes(16).toString("hex");

  await repository.authTokens.create({
    id: id("tok"),
    userId: "anonymous",
    kind: "google_login_oauth_state",
    tokenHash: state,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    createdAt: now()
  });

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: oauthRedirectUri("gmail"),
    response_type: "code",
    scope: config.scopes.join(" "),
    state,
    access_type: "offline",
    prompt: "consent"
  });

  return `${config.authUrl}?${params.toString()}`;
}

async function exchangeOauthCode(provider, code) {
  const config = integrationConfig[provider];
  if (!config) throw new Error(`unknown OAuth provider: ${provider}`);

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: oauthRedirectUri(provider),
    code
  });

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    signal: AbortSignal.timeout(12000)
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || data.error || "Token exchange failed");

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token || null,
    expires_in: data.expires_in,
    obtained_at: now()
  };
}

async function getIntegrationAccessToken(integration) {
  const tokens = decryptSecret(integration.encryptedCredentials, integration.userId);
  if (!tokens) return null;

  const config = integrationConfig[integration.provider];
  if (!config) return null;

  const secondsSinceObtained = (Date.now() - new Date(tokens.obtained_at).getTime()) / 1000;
  if (secondsSinceObtained < tokens.expires_in - 60) return tokens.access_token;

  if (!tokens.refresh_token) return null;

  try {
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: tokens.refresh_token
    });

    const response = await fetch(config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: AbortSignal.timeout(12000)
    });

    const data = await response.json();
    if (!response.ok) return null;

    const refreshedTokens = {
      access_token: data.access_token,
      refresh_token: data.refresh_token || tokens.refresh_token,
      expires_in: data.expires_in,
      obtained_at: now()
    };

    const { repository } = require("../app");
    await repository.integrations.upsert(integration.userId, integration.provider, {
      encryptedCredentials: encryptSecret(refreshedTokens, integration.userId)
    });

    return data.access_token;
  } catch (error) {
    console.error(`Token refresh failed for ${integration.provider}:`, error.message);
    return null;
  }
}

async function fetchGoogleProfile(accessToken) {
  const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error(`Google profile fetch failed: ${response.status}`);
  return response.json();
}

async function processGoogleLogin(code) {
  const tokens = await exchangeOauthCode("gmail", code);
  const profile = await fetchGoogleProfile(tokens.access_token);
  const { repository } = require("../app");

  let user = await repository.users.getByEmail(profile.email);
  let isNewUser = false;

  if (!user) {
    isNewUser = true;
    user = {
      id: id("usr"),
      name: profile.name || "Google User",
      email: profile.email.toLowerCase(),
      passwordHash: null,
      emailVerified: true,
      plan: "free",
      createdAt: now()
    };
    await repository.users.create(user);
    await repository.activity.create({
      userId: user.id,
      type: "user.created",
      label: "Account created via Google",
      source: "google_oauth",
      status: "success"
    });
  }

  await repository.integrations.upsert(user.id, "gmail", {
    status: "connected",
    encryptedCredentials: encryptSecret(tokens, user.id),
    connectedEmail: profile.email
  });

  await repository.activity.create({
    userId: user.id,
    type: "integration.connected",
    label: "Gmail connected via Google login",
    source: "google_oauth",
    status: "success"
  });

  return { user, isNewUser };
}

async function verifyOauthState(stateParam, expectedProvider) {
  if (!stateParam) return null;
  const { repository } = require("../app");
  
  const token = await repository.authTokens.consumeOauthState(stateParam);
  if (!token) return null;

  return { sub: token.userId };
}

async function syncHubspotLead(store, user, lead) {
  if (user.id === "usr_demo_founder") return { provider: "simulation" };
  const { repository } = require("../app");
  const integration = await repository.integrations.getByUserIdAndProvider(user.id, "hubspot");
  if (!integration || integration.status !== "connected" || !integration.encryptedCredentials) return { provider: "simulation" };
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
  syncHubspotLead,
};
