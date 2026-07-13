const { clientIp, send } = require("../utils/helpers");

const rateLimitBuckets = new Map();

function enforceRateLimit(req, res, url) {
  const sensitive = /^\/api\/auth\/(login|signup|request-password-reset|reset-password|verify-email)$/.test(url.pathname);
  const limit = sensitive ? Number(process.env.AUTH_RATE_LIMIT || 12) : Number(process.env.API_RATE_LIMIT || 180);
  const windowMs = 60 * 1000;
  const key = `${clientIp(req)}:${sensitive ? "auth" : "api"}`;
  const current = rateLimitBuckets.get(key);
  const bucket = !current || current.resetAt <= Date.now() ? { count: 0, resetAt: Date.now() + windowMs } : current;
  bucket.count += 1;
  rateLimitBuckets.set(key, bucket);
  res.setHeader("RateLimit-Limit", String(limit));
  res.setHeader("RateLimit-Remaining", String(Math.max(0, limit - bucket.count)));
  res.setHeader("RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));
  if (bucket.count <= limit) return false;
  send(res, 429, { error: "too many requests; try again shortly" });
  return true;
}

module.exports = {
  enforceRateLimit,
};

// Periodic garbage collection for expired rate limit buckets (prevents memory leak)
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of rateLimitBuckets.entries()) {
    if (bucket.resetAt <= now) {
      rateLimitBuckets.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

