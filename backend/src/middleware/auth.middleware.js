const { verifyToken } = require("../services/jwt.service");
const { send } = require("../utils/helpers");

async function getAuthUser(req, store) {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const payload = verifyToken(token);
  if (!payload) return null;
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
