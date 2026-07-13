const authController = require("../controllers/auth.controller");

async function authRoutes(req, res, url, store, context) {
  const { PUBLIC_SANDBOX_ENABLED, writeStore, logActivity, APP_ORIGIN } = context;

  if (req.method === "POST" && url.pathname === "/api/demo/start") {
    await authController.demoStart(req, res, store, { PUBLIC_SANDBOX_ENABLED, writeStore });
    return true;
  }
  if (req.method === "POST" && url.pathname === "/api/sandbox/start") {
    await authController.sandboxStart(req, res, store, { PUBLIC_SANDBOX_ENABLED, writeStore });
    return true;
  }
  if (req.method === "GET" && url.pathname === "/api/auth/google") {
    await authController.googleLogin(req, res, store, { writeStore });
    return true;
  }
  if (req.method === "GET" && url.pathname === "/api/auth/google/callback") {
    await authController.googleCallback(req, res, store, { logActivity, writeStore, APP_ORIGIN });
    return true;
  }
  if (req.method === "POST" && url.pathname === "/api/auth/request-email-verification") {
    await authController.requestEmailVerification(req, res, store, { writeStore });
    return true;
  }
  if (req.method === "POST" && url.pathname === "/api/auth/verify-email") {
    await authController.verifyEmail(req, res, store, { writeStore });
    return true;
  }
  if (req.method === "POST" && url.pathname === "/api/auth/request-password-reset") {
    await authController.requestPasswordReset(req, res, store, { writeStore });
    return true;
  }
  if (req.method === "POST" && url.pathname === "/api/auth/reset-password") {
    await authController.resetPassword(req, res, store, { writeStore });
    return true;
  }
  if (req.method === "POST" && url.pathname === "/api/auth/signup") {
    await authController.signup(req, res, store, { writeStore, logActivity });
    return true;
  }
  if (req.method === "POST" && url.pathname === "/api/auth/login") {
    await authController.login(req, res, store, { writeStore });
    return true;
  }
  if (req.method === "POST" && url.pathname === "/api/auth/refresh") {
    await authController.refreshToken(req, res, store, { writeStore });
    return true;
  }

  // Protected actions
  const { getAuthUser, enforceAuthGuards } = require("../middleware/auth.middleware");

  if (req.method === "POST" && url.pathname === "/api/demo/reset") {
    const user = await getAuthUser(req, store);
    if (!enforceAuthGuards(req, res, user, url)) return true;
    await authController.demoReset(req, res, store, { writeStore, user });
    return true;
  }
  if (req.method === "POST" && url.pathname === "/api/sandbox/reset") {
    const user = await getAuthUser(req, store);
    if (!enforceAuthGuards(req, res, user, url)) return true;
    await authController.sandboxReset(req, res, store, { writeStore, user });
    return true;
  }

  return false;
}

module.exports = authRoutes;
