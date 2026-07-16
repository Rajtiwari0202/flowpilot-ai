const crypto = require("crypto");
const { structuredLog } = require("../utils/logger");

async function dispatchNotification(workspaceId, notification) {
  if (!workspaceId) throw new Error("Workspace context required");
  const { repository } = require("../app");
  
  const id = `ntf_${crypto.randomBytes(8).toString("hex")}`;
  const record = {
    id,
    workspaceId,
    workspace_id: workspaceId,
    userId: notification.userId,
    user_id: notification.userId,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    read: false,
    metadata: notification.metadata || {},
    createdAt: new Date().toISOString()
  };

  try {
    await repository.notifications.create(workspaceId, record);
    structuredLog("info", "notification.dispatched", { workspaceId, userId: notification.userId, type: notification.type, id });
    return record;
  } catch (err) {
    structuredLog("error", "notification.dispatch.failed", { workspaceId, error: err.message });
    return null;
  }
}

async function notifyWorkspaceUsers(workspaceId, { roles = ["owner", "admin"], type, title, message, metadata = {} }) {
  if (!workspaceId) throw new Error("Workspace context required");
  const { repository } = require("../app");

  try {
    const members = await repository.workspaceMembers.listByWorkspaceId(workspaceId);
    const targets = members.filter(m => roles.includes(m.role));
    
    const dispatches = [];
    for (const target of targets) {
      const result = await dispatchNotification(workspaceId, {
        userId: target.userId,
        type,
        title,
        message,
        metadata
      });
      if (result) dispatches.push(result);
    }
    return dispatches;
  } catch (err) {
    console.error("Failed to notify workspace users by role:", err.message);
    return [];
  }
}

module.exports = {
  dispatchNotification,
  notifyWorkspaceUsers
};
