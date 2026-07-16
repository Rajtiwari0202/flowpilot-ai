const { send } = require("../utils/helpers");

function requireWorkspaceRole(allowedRoles = ["owner", "admin", "member", "viewer"]) {
  return async (req, res, next) => {
    const { repository } = require("../app");
    const userId = req.user?.id;
    
    // Scopes workspaceId from request headers, query parameters, or body
    const workspaceId = req.headers["x-workspace-id"] || req.query.workspaceId || req.body.workspaceId;

    if (!userId) {
      return send(res, 401, { error: "Unauthorized: Missing user authentication session context" });
    }

    if (!workspaceId) {
      return send(res, 400, { error: "Bad Request: Missing 'x-workspace-id' header or 'workspaceId' query/body parameter" });
    }

    try {
      const membership = await repository.workspaceMembers.getByWorkspaceAndUser(workspaceId, userId);
      if (!membership) {
        return send(res, 403, { error: "Forbidden: You do not belong to the requested workspace" });
      }

      if (!allowedRoles.includes(membership.role)) {
        return send(res, 403, { error: "Forbidden: Insufficient permissions for workspace role " + membership.role });
      }

      // Attach workspace parameters for downstream scoping
      req.workspaceId = workspaceId;
      req.workspaceRole = membership.role;
      
      if (repository.withWorkspaceContext) {
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
