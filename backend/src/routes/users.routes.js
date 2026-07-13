const userController = require("../controllers/user.controller");
const { getAuthUser, enforceAuthGuards } = require("../middleware/auth.middleware");

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
    "/api/billing/cancel"
  ];
  const workflowMatch = req.method === "PATCH" && url.pathname.match(/^\/api\/workflows\/([^/]+)$/);
  const approvalMatch = req.method === "POST" && url.pathname.match(/^\/api\/approvals\/([^/]+)\/(approve|reject)$/);

  const isUserRoute = userPaths.includes(url.pathname) || workflowMatch || approvalMatch;
  if (!isUserRoute) return false;

  // Enforce auth
  const user = await getAuthUser(req, store);
  if (!enforceAuthGuards(req, res, user, url)) return true;

  if (req.method === "GET" && url.pathname === "/api/me") {
    await userController.getMe(req, res, store, user);
    return true;
  }
  if (req.method === "POST" && url.pathname === "/api/onboarding/business") {
    await userController.updateBusiness(req, res, store, user, { writeStore });
    return true;
  }
  if (req.method === "GET" && url.pathname === "/api/dashboard") {
    await userController.getDashboard(req, res, store, user);
    return true;
  }
  if (req.method === "GET" && url.pathname === "/api/dashboard/analytics") {
    await userController.getDashboardAnalytics(req, res, store, user);
    return true;
  }
  if (req.method === "GET" && url.pathname === "/api/workflows") {
    await userController.getWorkflows(req, res, store, user);
    return true;
  }
  if (req.method === "GET" && url.pathname === "/api/leads") {
    await userController.getLeads(req, res, store, user);
    return true;
  }
  if (req.method === "GET" && url.pathname === "/api/approvals") {
    await userController.getApprovals(req, res, store, user);
    return true;
  }
  if (req.method === "GET" && url.pathname === "/api/integrations") {
    await userController.getIntegrations(req, res, store, user);
    return true;
  }
  if (req.method === "POST" && url.pathname === "/api/workflows/from-template") {
    await userController.createWorkflowFromTemplate(req, res, store, user, { writeStore });
    return true;
  }
  if (workflowMatch) {
    await userController.updateWorkflowStatus(req, res, store, user, workflowMatch[1], { writeStore });
    return true;
  }
  if (req.method === "POST" && url.pathname === "/api/leads") {
    await userController.createLead(req, res, store, user, { writeStore });
    return true;
  }
  if (req.method === "GET" && url.pathname === "/api/activity") {
    await userController.getActivity(req, res, store, user);
    return true;
  }
  if (approvalMatch) {
    await userController.resolveApproval(req, res, store, user, approvalMatch[1], approvalMatch[2], { writeStore, sendGmailFollowUp });
    return true;
  }
  if (req.method === "POST" && url.pathname === "/api/ai/draft-follow-up") {
    await userController.generateAIDraft(req, res, store, user);
    return true;
  }
  if (req.method === "POST" && url.pathname === "/api/billing/subscription") {
    await userController.createBillingSubscription(req, res, store, user, { writeStore, BILLING_DISABLED });
    return true;
  }
  if (req.method === "GET" && url.pathname === "/api/billing/portal") {
    await userController.getBillingPortal(req, res, store, user, { BILLING_DISABLED });
    return true;
  }
  if (req.method === "POST" && url.pathname === "/api/billing/cancel") {
    await userController.cancelBillingSubscription(req, res, store, user, { writeStore, BILLING_DISABLED });
    return true;
  }

  return false;
}

module.exports = usersRoutes;
