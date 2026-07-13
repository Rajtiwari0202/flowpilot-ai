const crypto = require("crypto");
const { APP_ORIGIN } = require("../config/env");
const { decryptSecret, encryptSecret } = require("../utils/crypto");
const { id, now } = require("../utils/helpers");
const { structuredLog } = require("../utils/logger");

const logger = {
  info(fields) {
    const { event, ...rest } = fields;
    structuredLog("info", event || "log", rest);
  }
};

if (!process.env.GOOGLE_CALLBACK_URL) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("GOOGLE_CALLBACK_URL missing");
  }
  process.env.GOOGLE_CALLBACK_URL = `${APP_ORIGIN}/api/auth/google/callback`;
} else if (process.env.NODE_ENV === "production" && !process.env.GOOGLE_CALLBACK_URL.startsWith("https://")) {
  throw new Error("GOOGLE_CALLBACK_URL must start with https:// in production");
}

logger.info({
  event: "oauth.startup.audit",
  GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL,
  NODE_ENV: process.env.NODE_ENV || "development"
});

process.env.GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
process.env.GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || process.env.GOOGLE_OAUTH_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;

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
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");

  await repository.authTokens.create({
    id: id("tok"),
    userId,
    kind: `${provider}_oauth_state`,
    tokenHash: `${state}:${verifier}`,
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
    prompt: "consent",
    code_challenge: challenge,
    code_challenge_method: "S256"
  });

  return `${config.authUrl}?${params.toString()}`;
}

async function getGoogleAuthUrl() {
  const config = integrationConfig.gmail;
  if (!config || !config.clientId) return null;

  const { repository } = require("../app");
  const state = crypto.randomBytes(16).toString("hex");
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");

  await repository.authTokens.create({
    id: id("tok"),
    userId: null,
    kind: "google_login_oauth_state",
    tokenHash: `${state}:${verifier}`,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    createdAt: now()
  });

  const redirectUri = process.env.GOOGLE_CALLBACK_URL;
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: config.scopes.join(" "),
    state,
    access_type: "offline",
    prompt: "consent",
    code_challenge: challenge,
    code_challenge_method: "S256"
  });
  const googleUrl = `${config.authUrl}?${params.toString()}`;

  logger.info({
    event: "oauth.final_google_url",
    redirectUri,
    googleUrl
  });

  return googleUrl;
}

async function exchangeOauthCode(provider, code, verifier = null, redirectUriOverride = null) {
  const config = integrationConfig[provider];
  if (!config) throw new Error(`unknown OAuth provider: ${provider}`);

  const redirectUri = redirectUriOverride || oauthRedirectUri(provider);

  const payloadParams = {
    grant_type: "authorization_code",
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: redirectUri,
    code
  };

  if (verifier) {
    payloadParams.code_verifier = verifier;
  }

  const body = new URLSearchParams(payloadParams);

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

async function acquireRedisLock(key, ttlMs = 15000) {
  try {
    const { getRedisConnection } = require("./queue.service");
    const redis = getRedisConnection();
    if (!redis) return null;

    const token = crypto.randomBytes(16).toString("hex");
    const res = await redis.set(key, token, "PX", ttlMs, "NX");
    if (res === "OK") {
      return token;
    }
  } catch (err) {
    console.error("acquireRedisLock failed:", err.message);
  }
  return null;
}

async function releaseRedisLock(key, token) {
  try {
    const { getRedisConnection } = require("./queue.service");
    const redis = getRedisConnection();
    if (!redis || !token) return;

    const luaScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    await redis.eval(luaScript, 1, key, token);
  } catch (err) {
    console.error("releaseRedisLock failed:", err.message);
  }
}

const activeRefreshes = new Map();

async function getIntegrationAccessToken(integration) {
  const key = `${integration.userId}:${integration.provider}`;
  const lockKey = `lock:refresh:${key}`;

  let lockToken = null;
  let useFallback = false;

  const start = Date.now();
  while (!lockToken && !useFallback) {
    lockToken = await acquireRedisLock(lockKey, 15000);
    if (lockToken) break;

    const { getRedisConnection } = require("./queue.service");
    if (!getRedisConnection()) {
      useFallback = true;
      break;
    }

    if (Date.now() - start > 12000) {
      throw new Error("Distributed lock acquisition timeout");
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  let resolveLock;
  if (useFallback) {
    const lockPromise = new Promise(resolve => { resolveLock = resolve; });
    while (activeRefreshes.has(key)) {
      await activeRefreshes.get(key);
    }
    activeRefreshes.set(key, lockPromise);
  }

  try {
    const { repository } = require("../app");
    
    const lockedIntegration = await repository.integrations.getByUserIdAndProviderForUpdate(
      integration.userId,
      integration.provider
    );
    if (!lockedIntegration) return null;

    const tokens = decryptSecret(lockedIntegration.encryptedCredentials, lockedIntegration.userId);
    if (!tokens) return null;

    const config = integrationConfig[lockedIntegration.provider];
    if (!config) return null;

    const secondsSinceObtained = (Date.now() - new Date(tokens.obtained_at).getTime()) / 1000;
    if (secondsSinceObtained < tokens.expires_in - 60) return tokens.access_token;

    if (!tokens.refresh_token) return null;

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

    await repository.integrations.upsert(lockedIntegration.userId, lockedIntegration.provider, {
      encryptedCredentials: encryptSecret(refreshedTokens, lockedIntegration.userId)
    });

    return data.access_token;
  } catch (error) {
    console.error(`Token refresh failed for ${integration.provider}:`, error.message);
    return null;
  } finally {
    if (useFallback) {
      activeRefreshes.delete(key);
      if (resolveLock) resolveLock();
    } else if (lockToken) {
      await releaseRedisLock(lockKey, lockToken);
    }
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

async function processGoogleLogin(code, verifier = null) {
  const tokens = await exchangeOauthCode("gmail", code, verifier, process.env.GOOGLE_CALLBACK_URL);
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
      googleId: profile.id || profile.sub || null,
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
  } else if (!user.googleId) {
    await repository.users.update(user.id, {
      googleId: profile.id || profile.sub || null,
      emailVerified: true
    });
    user.googleId = profile.id || profile.sub;
    user.emailVerified = true;
    await repository.activity.create({
      userId: user.id,
      type: "user.updated",
      label: "Linked Google account to existing user",
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

  const kind = expectedProvider === "google_login"
    ? "google_login_oauth_state"
    : `${expectedProvider}_oauth_state`;

  const tokenRecord = await repository.authTokens.consumeOauthState(stateParam, kind);
  if (!tokenRecord) return null;

  const [state, verifier] = tokenRecord.tokenHash.split(":");

  return { sub: tokenRecord.userId, verifier: verifier || null };
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
