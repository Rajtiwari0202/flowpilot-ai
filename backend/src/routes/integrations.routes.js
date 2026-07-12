const userController = require("../controllers/user.controller");
const { getAuthUser, enforceAuthGuards } = require("../middleware/auth.middleware");

async function integrationsRoutes(req, res, url, store, context) {
  const { writeStore, readRawBody, APP_ORIGIN } = context;

  // Webhooks
  const leadWebhookMatch = req.method === "POST" && url.pathname.match(/^\/api\/webhooks\/lead\/([^/]+)$/);
  if (leadWebhookMatch) {
    await userController.leadWebhook(req, res, store, leadWebhookMatch[1], { writeStore });
    return true;
  }
  if (req.method === "GET" && url.pathname === "/api/webhooks/whatsapp") {
    await userController.whatsappVerifyWebhook(req, res, url);
    return true;
  }
  if (req.method === "POST" && url.pathname === "/api/webhooks/whatsapp") {
    await userController.whatsappWebhook(req, res, store, { writeStore, readRawBody });
    return true;
  }
  if (req.method === "POST" && url.pathname === "/api/webhooks/razorpay") {
    await userController.razorpayWebhook(req, res, store, { writeStore, readRawBody });
    return true;
  }

  // OAuth Callbacks
  const oauthCallbackMatch = req.method === "GET" && url.pathname.match(/^\/api\/oauth\/(gmail|hubspot)\/callback$/);
  if (oauthCallbackMatch) {
    await userController.integrationCallback(req, res, store, oauthCallbackMatch[1], { APP_ORIGIN, writeStore });
    return true;
  }

  // Connect integration
  const integrationMatch = req.method === "POST" && url.pathname.match(/^\/api\/integrations\/([^/]+)\/connect$/);
  if (integrationMatch) {
    const user = getAuthUser(req, store);
    if (!enforceAuthGuards(req, res, user, url)) return true;
    await userController.connectIntegration(req, res, store, user, integrationMatch[1], { writeStore });
    return true;
  }

  return false;
}

module.exports = integrationsRoutes;
