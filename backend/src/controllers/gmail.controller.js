const { syncGmailInbox } = require("../services/gmail.service");
const { send } = require("../utils/helpers");

async function sync(req, res, store, user, { createLeadApproval, writeStore, logActivity }) {
  try {
    const createdLeads = await syncGmailInbox(store, user, { createLeadApproval, writeStore });
    if (createdLeads.length) {
      logActivity(store, { userId: user.id, type: "integration.synced", label: `${createdLeads.length} new lead${createdLeads.length === 1 ? "" : "s"} found in Gmail inbox`, source: "gmail" });
      await writeStore(store);
    }
    return send(res, 200, { created: createdLeads.length, leads: createdLeads });
  } catch (error) {
    console.error("Gmail inbox sync:", error.message);
    return send(res, error.status || 502, { error: error.message || "Gmail inbox sync failed" });
  }
}

module.exports = {
  sync,
};
