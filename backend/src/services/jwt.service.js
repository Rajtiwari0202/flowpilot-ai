const crypto = require("crypto");
const { JWT_SECRET } = require("../config/env");

function signToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 })).toString("base64url");
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

function verifyToken(token) {
  const [header, body, signature] = String(token || "").split(".");
  if (!header || !body || !signature) {
    console.log("JWT verify failed: missing header, body or signature parts");
    return null;
  }
  const expected = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  
  if (providedBuffer.length !== expectedBuffer.length) {
    console.log("JWT verify failed: length mismatch. provided length:", providedBuffer.length, "expected length:", expectedBuffer.length);
    return null;
  }
  
  if (!crypto.timingSafeEqual(providedBuffer, expectedBuffer)) {
    console.log("JWT verify failed: signature mismatch. expected:", expected, "provided:", signature);
    return null;
  }
  
  let payload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch (e) {
    console.log("JWT verify failed: JSON parse body failed", e.message);
    return null;
  }
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    console.log("JWT verify failed: token expired", payload.exp, Math.floor(Date.now() / 1000));
    return null;
  }
  return payload;
}

module.exports = {
  signToken,
  verifyToken,
};
