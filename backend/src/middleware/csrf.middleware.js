const { APP_ORIGIN } = require("../config/env");
const { send } = require("../utils/helpers");

function enforceCsrfGuard(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  // Allow webhooks to bypass CSRF
  if (req.url.startsWith("/api/webhooks/")) {
    return next();
  }

  const origin = req.headers["origin"];
  const referer = req.headers["referer"];
  
  const appOriginUrl = new URL(APP_ORIGIN || "http://localhost:3000");

  if (origin) {
    try {
      const originUrl = new URL(origin);
      if (originUrl.host !== appOriginUrl.host && originUrl.hostname !== "localhost" && originUrl.hostname !== "127.0.0.1") {
        return send(res, 403, { error: "CSRF verification failed: invalid origin" });
      }
    } catch (e) {
      return send(res, 403, { error: "CSRF verification failed: malformed origin" });
    }
  } else if (referer) {
    try {
      const refererUrl = new URL(referer);
      if (refererUrl.host !== appOriginUrl.host && refererUrl.hostname !== "localhost" && refererUrl.hostname !== "127.0.0.1") {
        return send(res, 403, { error: "CSRF verification failed: invalid referer" });
      }
    } catch (e) {
      return send(res, 403, { error: "CSRF verification failed: malformed referer" });
    }
  } else {
    const csrfHeader = req.headers["x-csrf-token"] || req.headers["x-requested-with"];
    if (!csrfHeader && process.env.NODE_ENV === "production") {
      return send(res, 403, { error: "CSRF verification failed: missing origin or token header" });
    }
  }

  next();
}

module.exports = { enforceCsrfGuard };
