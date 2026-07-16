const userController = require("../controllers/user.controller");
const { getAuthUser, enforceAuthGuards } = require("../middleware/auth.middleware");
const { requireWorkspaceRole } = require("../middleware/tenant.middleware");

async function runTenantMiddleware(req, res, allowedRoles) {
  return new Promise((resolve) => {
    requireWorkspaceRole(allowedRoles)(req, res, () => {
      resolve(true);
    });
  });
}

async function usersRoutes(req, res, url, store, context) {
  const { writeStore, sendGmailFollowUp, BILLING_DISABLED } = context;

  if (req.method === "GET" && url.pathname === "/api/templates") {
    await userController.searchTemplates(req, res, store, url);
    return true;
  }

  const userPaths = [
    "/api/me",
    "/api/onboarding/business",
    "/api/dashboard",
    "/api/dashboard/analytics",
    "/api/workflows",
    "/api/leads",
    "/api/approvals",
    "/api/integrations",
    "/api/workflows/from-template",
    "/api/activity",
    "/api/ai/draft-follow-up",
    "/api/billing/subscription",
    "/api/billing/portal",
    "/api/billing/cancel",
    "/api/notifications",
    "/api/notifications/read-all"
  ];
  const workflowMatch = req.method === "PATCH" && url.pathname.match(/^\/api\/workflows\/([^/]+)$/);
  const approvalMatch = req.method === "POST" && url.pathname.match(/^\/api\/approvals\/([^/]+)\/(approve|reject)$/);
  const notificationReadMatch = req.method === "POST" && url.pathname.match(/^\/api\/notifications\/([^/]+)\/read$/);

  const isUserRoute = userPaths.includes(url.pathname) || workflowMatch || approvalMatch || notificationReadMatch;
  if (!isUserRoute) return false;

  // Enforce auth
  const user = await getAuthUser(req, store);
  if (!enforceAuthGuards(req, res, user, url)) return true;

  // 1. General Profile Routes (Workspace independent)
  if (req.method === "GET" && url.pathname === "/api/me") {
    await userController.getMe(req, res, store, user);
    return true;
  }
  if (req.method === "POST" && url.pathname === "/api/onboarding/business") {
    await userController.updateBusiness(req, res, store, user, { writeStore });
    return true;
  }

  // 2. Tenant verification for Dashboard & Analytics
  if (req.method === "GET" && url.pathname === "/api/dashboard") {
    const isAllowed = await runTenantMiddleware(req, res, ["owner", "admin", "member", "viewer"]);
    if (!isAllowed) return true;
    await userController.getDashboard(req, res, store, user);
    return true;
  }
  if (req.method === "GET" && url.pathname === "/api/dashboard/analytics") {
    const isAllowed = await runTenantMiddleware(req, res, ["owner", "admin", "member", "viewer"]);
    if (!isAllowed) return true;
    await userController.getDashboardAnalytics(req, res, store, user);
    return true;
  }

  // 3. Tenant verification for Workflows
  if (req.method === "GET" && url.pathname === "/api/workflows") {
    const isAllowed = await runTenantMiddleware(req, res, ["owner", "admin", "member", "viewer"]);
    if (!isAllowed) return true;
    await userController.getWorkflows(req, res, store, user);
    return true;
  }
  if (req.method === "POST" && url.pathname === "/api/workflows/from-template") {
    const isAllowed = await runTenantMiddleware(req, res, ["owner", "admin"]);
    if (!isAllowed) return true;
    await userController.createWorkflowFromTemplate(req, res, store, user, { writeStore });
    return true;
  }
  if (workflowMatch) {
    const isAllowed = await runTenantMiddleware(req, res, ["owner", "admin"]);
    if (!isAllowed) return true;
    await userController.updateWorkflowStatus(req, res, store, user, workflowMatch[1], { writeStore });
    return true;
  }

  // 4. Tenant verification for Leads
  if (req.method === "GET" && url.pathname === "/api/leads") {
    const isAllowed = await runTenantMiddleware(req, res, ["owner", "admin", "member", "viewer"]);
    if (!isAllowed) return true;
    await userController.getLeads(req, res, store, user);
    return true;
  }
  if (req.method === "POST" && url.pathname === "/api/leads") {
    const isAllowed = await runTenantMiddleware(req, res, ["owner", "admin", "member"]);
    if (!isAllowed) return true;
    await userController.createLead(req, res, store, user, { writeStore });
    return true;
  }

  // 5. Tenant verification for Approvals
  if (req.method === "GET" && url.pathname === "/api/approvals") {
    const isAllowed = await runTenantMiddleware(req, res, ["owner", "admin", "member", "viewer"]);
    if (!isAllowed) return true;
    await userController.getApprovals(req, res, store, user);
    return true;
  }
  if (approvalMatch) {
    const isAllowed = await runTenantMiddleware(req, res, ["owner", "admin", "member"]);
    if (!isAllowed) return true;
    await userController.resolveApproval(req, res, store, user, approvalMatch[1], approvalMatch[2], { writeStore, sendGmailFollowUp });
    return true;
  }

  // 6. Tenant verification for Integrations
  if (req.method === "GET" && url.pathname === "/api/integrations") {
    const isAllowed = await runTenantMiddleware(req, res, ["owner", "admin", "member", "viewer"]);
    if (!isAllowed) return true;
    await userController.getIntegrations(req, res, store, user);
    return true;
  }

  // 7. Tenant verification for Activity Logs
  if (req.method === "GET" && url.pathname === "/api/activity") {
    const isAllowed = await runTenantMiddleware(req, res, ["owner", "admin", "member", "viewer"]);
    if (!isAllowed) return true;
    await userController.getActivity(req, res, store, user);
    return true;
  }

  // 8. Tenant verification for AI Generation
  if (req.method === "POST" && url.pathname === "/api/ai/draft-follow-up") {
    const isAllowed = await runTenantMiddleware(req, res, ["owner", "admin", "member"]);
    if (!isAllowed) return true;
    await userController.generateAIDraft(req, res, store, user);
    return true;
  }

  // 9. Billing Routes (Workspace owner scoped)
  if (req.method === "POST" && url.pathname === "/api/billing/subscription") {
    const isAllowed = await runTenantMiddleware(req, res, ["owner"]);
    if (!isAllowed) return true;
    await userController.createBillingSubscription(req, res, store, user, { writeStore, BILLING_DISABLED });
    return true;
  }
  if (req.method === "GET" && url.pathname === "/api/billing/portal") {
    const isAllowed = await runTenantMiddleware(req, res, ["owner"]);
    if (!isAllowed) return true;
    await userController.getBillingPortal(req, res, store, user, { BILLING_DISABLED });
    return true;
  }
  if (req.method === "POST" && url.pathname === "/api/billing/cancel") {
    const isAllowed = await runTenantMiddleware(req, res, ["owner"]);
    if (!isAllowed) return true;
    await userController.cancelBillingSubscription(req, res, store, user, { writeStore, BILLING_DISABLED });
    return true;
  }

  // 10. Notifications Routes (Workspace roles scope)
  if (req.method === "GET" && url.pathname === "/api/notifications") {
    const isAllowed = await runTenantMiddleware(req, res, ["owner", "admin", "member", "viewer"]);
    if (!isAllowed) return true;
    await userController.getNotifications(req, res, store, user);
    return true;
  }
  if (req.method === "POST" && url.pathname === "/api/notifications/read-all") {
    const isAllowed = await runTenantMiddleware(req, res, ["owner", "admin", "member", "viewer"]);
    if (!isAllowed) return true;
    await userController.markAllNotificationsRead(req, res, store, user);
    return true;
  }
  if (notificationReadMatch) {
    const isAllowed = await runTenantMiddleware(req, res, ["owner", "admin", "member", "viewer"]);
    if (!isAllowed) return true;
    await userController.markNotificationRead(req, res, store, user, notificationReadMatch[1]);
    return true;
  }

  return false;
}

module.exports = usersRoutes;
