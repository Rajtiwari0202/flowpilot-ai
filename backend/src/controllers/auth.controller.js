const crypto = require("crypto");
const {
  issueAccountToken,
  consumeAccountToken,
  queueAccountEmail,
  deliverAccountEmail,
  developmentToken,
  seedDemoWorkspace,
} = require("../services/auth.service");
const { getGoogleAuthUrl, processGoogleLogin, verifyOauthState } = require("../services/oauth.service");
const { hashPassword, verifyPassword } = require("../utils/crypto");
const { signToken } = require("../services/jwt.service");
const { publicUser } = require("../services/user.service");
const { send, redirect, parseBody } = require("../utils/helpers");

async function signup(req, res, store, { writeStore, logActivity }) {
  const body = await parseBody(req);

  if (!body.email || !body.password || !body.name) {
    return send(res, 400, { error: "name, email, and password are required" });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    return send(res, 400, { error: "enter a valid email address" });
  }

  if (String(body.password).length < 8) {
    return send(res, 400, { error: "password must be at least 8 characters" });
  }

  const { repository } = require("../app");
  const existing = await repository.users.getByEmail(body.email);
  if (existing) {
    return send(res, 409, { error: "email already exists" });
  }

  const { id, now } = require("../utils/helpers");

  const user = {
    id: id("usr"),
    name: body.name,
    email: body.email.toLowerCase(),
    passwordHash: hashPassword(body.password),
    emailVerified: false,
    plan: "free",
    createdAt: now()
  };

  await repository.users.create(user);

  await repository.activity.create({
    userId: user.id,
    type: "user.created",
    label: "Account created",
    source: "auth",
    status: "success"
  });

  const verificationToken = await issueAccountToken(
    user,
    "verify_email",
    60 * 24
  );

  const email = await queueAccountEmail(
    user,
    "verify_email",
    verificationToken
  );

  try {
    await deliverAccountEmail(email);
  } catch (error) {
    console.warn("Email delivery skipped:", error.message);
  }

  const accessToken = signToken({ sub: user.id }, 15 * 60);
  const refreshTokenVal = crypto.randomBytes(32).toString("hex");
  await repository.authTokens.create({
    id: `ref_${crypto.randomBytes(8).toString("hex")}`,
    userId: user.id,
    kind: "refresh_token",
    tokenHash: refreshTokenVal,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString()
  });

  const { captureEvent } = require("../services/observability.service");
  captureEvent(user.id, "user_signup", { email: user.email });

  return send(res, 201, {
    user: publicUser(user),
    token: signToken({ sub: user.id }),
    accessToken,
    refreshToken: refreshTokenVal,
    ...developmentToken(verificationToken)
  });
}

async function login(req, res, store, { writeStore }) {
  const body = await parseBody(req);
  const { repository } = require("../app");
  const user = await repository.users.getByEmail(body.email);
  if (!user || !verifyPassword(body.password || "", user.passwordHash)) {
    return send(res, 401, { error: "invalid credentials" });
  }
  const accessToken = signToken({ sub: user.id }, 15 * 60);
  const refreshTokenVal = crypto.randomBytes(32).toString("hex");
  await repository.authTokens.create({
    id: `ref_${crypto.randomBytes(8).toString("hex")}`,
    userId: user.id,
    kind: "refresh_token",
    tokenHash: refreshTokenVal,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString()
  });

  const { captureEvent } = require("../services/observability.service");
  captureEvent(user.id, "user_login");

  return send(res, 200, {
    user: publicUser(user),
    token: signToken({ sub: user.id }),
    accessToken,
    refreshToken: refreshTokenVal
  });
}

async function requestEmailVerification(req, res, store, { writeStore }) {
  const body = await parseBody(req);
  const { repository } = require("../app");
  const user = await repository.users.getByEmail(body.email);
  if (!user) return send(res, 200, { message: "If the account exists, a verification email has been queued." });
  const token = await issueAccountToken(user, "verify_email", 60 * 24);
  const email = await queueAccountEmail(user, "verify_email", token);
  await deliverAccountEmail(email);
  return send(res, 200, { message: "If the account exists, a verification email has been queued.", ...developmentToken(token) });
}

async function verifyEmail(req, res, store, { writeStore }) {
  const body = await parseBody(req);
  const user = await consumeAccountToken(body.token, "verify_email");
  if (!user) return send(res, 400, { error: "verification token is invalid or expired" });
  const { now } = require("../utils/helpers");
  const { repository } = require("../app");
  await repository.users.update(user.id, { emailVerified: true, emailVerifiedAt: now() });
  return send(res, 200, { message: "Email verified successfully." });
}

async function requestPasswordReset(req, res, store, { writeStore }) {
  const body = await parseBody(req);
  const { repository } = require("../app");
  const user = await repository.users.getByEmail(body.email);
  if (!user) return send(res, 200, { message: "If the account exists, a password reset email has been queued." });
  const token = await issueAccountToken(user, "reset_password", 30);
  const email = await queueAccountEmail(user, "reset_password", token);
  await deliverAccountEmail(email);
  return send(res, 200, { message: "If the account exists, a password reset email has been queued.", ...developmentToken(token) });
}

async function resetPassword(req, res, store, { writeStore }) {
  const body = await parseBody(req);
  if (String(body.password || "").length < 8) return send(res, 400, { error: "password must be at least 8 characters" });
  const user = await consumeAccountToken(body.token, "reset_password");
  if (!user) return send(res, 400, { error: "password reset token is invalid or expired" });
  const { now } = require("../utils/helpers");
  const { repository } = require("../app");
  await repository.users.update(user.id, { passwordHash: hashPassword(body.password), passwordChangedAt: now() });
  return send(res, 200, { message: "Password reset successfully." });
}

async function googleLogin(req, res, store, { writeStore }) {
  const authUrl = await getGoogleAuthUrl(store, { writeStore });
  if (!authUrl) return send(res, 503, { error: "Google login is not configured on this server" });
  return redirect(res, authUrl);
}

async function googleCallback(req, res, store, { logActivity, writeStore, APP_ORIGIN }) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const stateToken = verifyOauthState(url.searchParams.get("state"), "google_login", store);
  if (!stateToken) return redirect(res, `${APP_ORIGIN}/?google_error=invalid_state`);
  const code = url.searchParams.get("code");
  if (!code) return redirect(res, `${APP_ORIGIN}/?google_error=missing_code`);
  try {
    const { user, isNewUser } = await processGoogleLogin(code, store, { logActivity, writeStore });
    const flowpilotToken = signToken({ sub: user.id });
    return redirect(res, `${APP_ORIGIN}/?google_token=${flowpilotToken}&new_user=${isNewUser}`);
  } catch (error) {
    console.error("Google OAuth callback:", error.message);
    return redirect(res, `${APP_ORIGIN}/?google_error=${encodeURIComponent(error.message)}`);
  }
}

async function demoStart(req, res, store, { PUBLIC_SANDBOX_ENABLED, writeStore }) {
  if (!PUBLIC_SANDBOX_ENABLED) return send(res, 404, { error: "public sandbox is disabled" });
  const user = await seedDemoWorkspace();
  return send(res, 200, { user: publicUser(user), token: signToken({ sub: user.id }), demo: true });
}

async function sandboxStart(req, res, store, { PUBLIC_SANDBOX_ENABLED, writeStore }) {
  if (!PUBLIC_SANDBOX_ENABLED) return send(res, 404, { error: "public sandbox is disabled" });
  const user = await seedDemoWorkspace();
  return send(res, 200, { user: publicUser(user), token: signToken({ sub: user.id }), sandbox: true });
}

async function demoReset(req, res, store, { writeStore, user }) {
  if (user.id !== "usr_demo_founder") return send(res, 403, { error: "demo reset is only available in the demo workspace" });
  const demoUser = await seedDemoWorkspace();
  return send(res, 200, { user: publicUser(demoUser), token: signToken({ sub: demoUser.id }), demo: true });
}

async function sandboxReset(req, res, store, { writeStore, user }) {
  if (user.id !== "usr_demo_founder") return send(res, 403, { error: "sandbox reset is only available in the sandbox workspace" });
  const sandboxUser = await seedDemoWorkspace();
  return send(res, 200, { user: publicUser(sandboxUser), token: signToken({ sub: sandboxUser.id }), sandbox: true });
}

async function refreshToken(req, res, store, { writeStore }) {
  const body = await parseBody(req);
  const refToken = body.refreshToken;
  if (!refToken) return send(res, 400, { error: "refreshToken is required" });

  const { repository } = require("../app");
  const tokenRecord = await repository.authTokens.getByKindAndHash("refresh_token", refToken);

  if (!tokenRecord || new Date(tokenRecord.expiresAt) < new Date()) {
    return send(res, 401, { error: "invalid or expired refresh token" });
  }

  const user = await repository.users.getById(tokenRecord.userId);
  if (!user) return send(res, 401, { error: "user not found" });

  await repository.authTokens.delete(tokenRecord.id);

  const newAccessToken = signToken({ sub: user.id }, 15 * 60);
  const newRefreshTokenVal = crypto.randomBytes(32).toString("hex");
  await repository.authTokens.create({
    id: `ref_${crypto.randomBytes(8).toString("hex")}`,
    userId: user.id,
    kind: "refresh_token",
    tokenHash: newRefreshTokenVal,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString()
  });

  return send(res, 200, {
    token: signToken({ sub: user.id }),
    accessToken: newAccessToken,
    refreshToken: newRefreshTokenVal
  });
}

module.exports = {
  signup,
  login,
  requestEmailVerification,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
  googleLogin,
  googleCallback,
  demoStart,
  sandboxStart,
  demoReset,
  sandboxReset,
  refreshToken,
};
