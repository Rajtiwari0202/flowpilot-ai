const { send } = require("../utils/helpers");
const { enqueueGmailSync } = require("../services/queue.service");

async function sync(req, res, store, user) {
  try {
    const { repository } = require("../app");
    const integration = await repository.integrations.getByUserIdAndProvider(user.id, "gmail");
    if (!integration || integration.status !== "connected" || !integration.encryptedCredentials) {
      return send(res, 400, { error: "Gmail is not connected for this account" });
    }

    const job = await enqueueGmailSync(user.id);

    return send(res, 200, { 
      queued: true, 
      jobId: job.id
    });
  } catch (error) {
    console.error("Gmail inbox sync:", error.message);
    return send(res, error.status || 502, { error: error.message || "Gmail inbox sync failed" });
  }
}

module.exports = {
  sync,
};
