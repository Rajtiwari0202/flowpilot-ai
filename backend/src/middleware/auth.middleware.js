const { verifyToken } = require("../services/jwt.service");
const { send } = require("../utils/helpers");

async function getAuthUser(req, store) {
  const authHeader = req.headers.authorization || "";
  const hasAuthorizationHeader = !!authHeader;
  const authorizationPrefix = authHeader.split(" ")[0] || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const tokenPresent = !!token;

  console.log("JWT Auth Middleware Diagnostics:", JSON.stringify({
    hasAuthorizationHeader,
    authorizationPrefix,
    tokenPresent,
    tokenLength: token.length
  }));

  const payload = verifyToken(token);
  if (!payload) {
    console.log("JWT Verify Failure: payload is null for token:", token);
    return null;
  }
  const { repository } = require("../app");
  return repository.users.getById(payload.sub);
}

function enforceAuthGuards(req, res, user, url) {
  if (url.pathname.startsWith("/api/") && !user) {
    send(res, 401, { error: "missing or invalid bearer token" });
    return false;
  }
  if (process.env.NODE_ENV === "production" && user && !user.emailVerified && url.pathname !== "/api/me") {
    send(res, 403, { error: "verify your email before using the workspace" });
    return false;
  }
  return true;
}

module.exports = {
  getAuthUser,
  enforceAuthGuards,
};
