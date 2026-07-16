const crypto = require("crypto");
const { structuredLog } = require("../utils/logger");

function sanitizeAuditState(state) {
  if (!state || typeof state !== "object") return state;
  try {
    const copy = JSON.parse(JSON.stringify(state));
    const sensitiveKeys = [
      "password", "password_hash", "passwordHash",
      "access_token", "accessToken", "refresh_token", "refreshToken",
      "client_secret", "clientSecret", "api_key", "apiKey",
      "token", "jwt", "encryptedCredentials", "encrypted_credentials",
      "secret"
    ];

    function recurse(obj) {
      if (!obj || typeof obj !== "object") return;
      for (const key of Object.keys(obj)) {
        if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
          obj[key] = "[REDACTED]";
        } else if (typeof obj[key] === "object") {
          recurse(obj[key]);
        }
      }
    }

    recurse(copy);
    return copy;
  } catch (err) {
    return "[UNCERTAIN/UNABLE TO SANITIZE]";
  }
}

async function logAuditAction(workspaceId, { actorId = null, actorType = null, entityType, entityId, action, beforeState = null, afterState = null }) {
  if (!workspaceId) throw new Error("Workspace context required");

  // Prevent Audit Log Recursion
  if (entityType === "audit_log" || entityType === "audit_logs" || action.startsWith("audit_log")) {
    return null;
  }

  // Deduce or enforce actorType (user, system, workflow)
  let resolvedActorType = actorType;
  if (!resolvedActorType) {
    resolvedActorType = actorId ? "user" : "system";
  }

  const { repository } = require("../app");
  const logId = `aud_${crypto.randomBytes(8).toString("hex")}`;
  
  const sanitizedBefore = beforeState ? sanitizeAuditState(beforeState) : null;
  const sanitizedAfter = afterState ? sanitizeAuditState(afterState) : null;

  const record = {
    id: logId,
    workspaceId,
    workspace_id: workspaceId,
    actorId,
    actor_id: actorId,
    actorType: resolvedActorType,
    actor_type: resolvedActorType,
    entityType,
    entity_type: entityType,
    entityId,
    entity_id: entityId,
    action,
    beforeState: sanitizedBefore,
    before_state: sanitizedBefore,
    afterState: sanitizedAfter,
    after_state: sanitizedAfter,
    createdAt: new Date().toISOString()
  };

  try {
    await repository.auditLogs.create(workspaceId, record);
    structuredLog("info", "audit.log.created", { workspaceId, entityType, action, logId });
    return record;
  } catch (err) {
    structuredLog("error", "audit.log.failed", { workspaceId, entityType, action, error: err.message });
    return null;
  }
}

module.exports = {
  sanitizeAuditState,
  logAuditAction
};
