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

  if (
    store.users.some(
      (user) => user.email.toLowerCase() === body.email.toLowerCase()
    )
  ) {
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

  store.users.push(user);

  logActivity(store, {
    userId: user.id,
    type: "user.created",
    label: "Account created",
    source: "auth"
  });

  const verificationToken = issueAccountToken(
    store,
    user,
    "verify_email",
    60 * 24
  );

  const email = queueAccountEmail(
    store,
    user,
    "verify_email",
    verificationToken
  );

  try {
    await deliverAccountEmail(email);
  } catch (error) {
    console.warn("Email delivery skipped:", error.message);
  }

  await writeStore(store);

  return send(res, 201, {
    user: publicUser(user),
    token: signToken({ sub: user.id }),
    ...developmentToken(verificationToken)
  });
}

async function login(req, res, store) {
  const body = await parseBody(req);
  const user = store.users.find((candidate) => candidate.email === String(body.email || "").toLowerCase());
  if (!user || !verifyPassword(body.password || "", user.passwordHash)) {
    return send(res, 401, { error: "invalid credentials" });
  }
  return send(res, 200, { user: publicUser(user), token: signToken({ sub: user.id }) });
}

async function requestEmailVerification(req, res, store, { writeStore }) {
  const body = await parseBody(req);
  const user = store.users.find((item) => item.email === String(body.email || "").toLowerCase());
  if (!user) return send(res, 200, { message: "If the account exists, a verification email has been queued." });
  const token = issueAccountToken(store, user, "verify_email", 60 * 24);
  const email = queueAccountEmail(store, user, "verify_email", token);
  await deliverAccountEmail(email);
  await writeStore(store);
  return send(res, 200, { message: "If the account exists, a verification email has been queued.", ...developmentToken(token) });
}

async function verifyEmail(req, res, store, { writeStore }) {
  const body = await parseBody(req);
  const user = consumeAccountToken(store, body.token, "verify_email");
  if (!user) return send(res, 400, { error: "verification token is invalid or expired" });
  const { now } = require("../utils/helpers");
  user.emailVerified = true;
  user.emailVerifiedAt = now();
  await writeStore(store);
  return send(res, 200, { message: "Email verified successfully." });
}

async function requestPasswordReset(req, res, store, { writeStore }) {
  const body = await parseBody(req);
  const user = store.users.find((item) => item.email === String(body.email || "").toLowerCase());
  if (!user) return send(res, 200, { message: "If the account exists, a password reset email has been queued." });
  const token = issueAccountToken(store, user, "reset_password", 30);
  const email = queueAccountEmail(store, user, "reset_password", token);
  await deliverAccountEmail(email);
  await writeStore(store);
  return send(res, 200, { message: "If the account exists, a password reset email has been queued.", ...developmentToken(token) });
}

async function resetPassword(req, res, store, { writeStore }) {
  const body = await parseBody(req);
  if (String(body.password || "").length < 8) return send(res, 400, { error: "password must be at least 8 characters" });
  const user = consumeAccountToken(store, body.token, "reset_password");
  if (!user) return send(res, 400, { error: "password reset token is invalid or expired" });
  const { now } = require("../utils/helpers");
  user.passwordHash = hashPassword(body.password);
  user.passwordChangedAt = now();
  await writeStore(store);
  return send(res, 200, { message: "Password reset successfully." });
}

async function googleLogin(req, res) {
  const authUrl = getGoogleAuthUrl();
  if (!authUrl) return send(res, 503, { error: "Google login is not configured on this server" });
  return redirect(res, authUrl);
}

async function googleCallback(req, res, store, { logActivity, writeStore, APP_ORIGIN }) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const stateToken = verifyOauthState(url.searchParams.get("state"), "google_login");
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
  const user = await seedDemoWorkspace(store, { writeStore });
  return send(res, 200, { user: publicUser(user), token: signToken({ sub: user.id }), demo: true });
}

async function sandboxStart(req, res, store, { PUBLIC_SANDBOX_ENABLED, writeStore }) {
  if (!PUBLIC_SANDBOX_ENABLED) return send(res, 404, { error: "public sandbox is disabled" });
  const user = await seedDemoWorkspace(store, { writeStore });
  return send(res, 200, { user: publicUser(user), token: signToken({ sub: user.id }), sandbox: true });
}

async function demoReset(req, res, store, { writeStore, user }) {
  if (user.id !== "usr_demo_founder") return send(res, 403, { error: "demo reset is only available in the demo workspace" });
  const demoUser = await seedDemoWorkspace(store, { writeStore });
  return send(res, 200, { user: publicUser(demoUser), token: signToken({ sub: demoUser.id }), demo: true });
}

async function sandboxReset(req, res, store, { writeStore, user }) {
  if (user.id !== "usr_demo_founder") return send(res, 403, { error: "sandbox reset is only available in the sandbox workspace" });
  const sandboxUser = await seedDemoWorkspace(store, { writeStore });
  return send(res, 200, { user: publicUser(sandboxUser), token: signToken({ sub: sandboxUser.id }), sandbox: true });
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
};
