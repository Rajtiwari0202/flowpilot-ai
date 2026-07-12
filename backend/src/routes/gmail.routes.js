const gmailController = require("../controllers/gmail.controller");
const { getAuthUser, enforceAuthGuards } = require("../middleware/auth.middleware");

async function gmailRoutes(req, res, url, store, context) {
  const { createLeadApproval, writeStore, logActivity } = context;

  if (req.method === "POST" && url.pathname === "/api/integrations/gmail/sync") {
    const user = getAuthUser(req, store);
    if (!enforceAuthGuards(req, res, user, url)) return true;
    await gmailController.sync(req, res, store, user, { createLeadApproval, writeStore, logActivity });
    return true;
  }

  return false;
}

module.exports = gmailRoutes;
