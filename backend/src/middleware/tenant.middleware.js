const { send } = require("../utils/helpers");

function requireWorkspaceRole(allowedRoles = ["owner", "admin", "member", "viewer"]) {
  return async (req, res, next) => {
    const { repository } = require("../app");
    const userId = req.user?.id;
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    
    if (!userId) {
      return send(res, 401, { error: "Unauthorized: Missing user authentication session context" });
    }

    try {
      const memberships = await repository.workspaceMembers.listByUserId(userId);
      
      let workspaceId = req.headers["x-workspace-id"] || req.query?.workspaceId || req.body?.workspaceId;
      let activeMembership = null;

      if (memberships.length === 0) {
        // Safe onboarding path for new users
        if (url.pathname === "/api/dashboard" || url.pathname === "/api/onboarding/business") {
          req.workspaceId = null;
          return next();
        }
        return send(res, 403, { error: "Forbidden: No workspaces found. Complete onboarding first." });
      }

      if (memberships.length === 1) {
        // Auto-resolve workspace context for single-workspace users
        const single = memberships[0];
        workspaceId = single.workspaceId;
        activeMembership = single;
      } else {
        // Multi-workspace users must supply x-workspace-id
        if (!workspaceId) {
          return send(res, 400, { error: "Bad Request: Missing 'x-workspace-id' header (user belongs to multiple workspaces)" });
        }
        activeMembership = memberships.find(m => m.workspaceId === workspaceId);
        if (!activeMembership) {
          return send(res, 403, { error: "Forbidden: You do not belong to the requested workspace" });
        }
      }

      if (!allowedRoles.includes(activeMembership.role)) {
        return send(res, 403, { error: "Forbidden: Insufficient permissions for workspace role " + activeMembership.role });
      }

      // Attach workspace parameters for downstream scoping
      req.workspaceId = workspaceId;
      req.workspaceRole = activeMembership.role;
      
      if (workspaceId && repository.withWorkspaceContext) {
        return repository.withWorkspaceContext(workspaceId, () => next());
      } else {
        return next();
      }
    } catch (err) {
      return send(res, 500, { error: `Internal Server Error: ${err.message}` });
    }
  };
}

module.exports = {
  requireWorkspaceRole
};
