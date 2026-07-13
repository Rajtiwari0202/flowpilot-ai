const { structuredLog } = require("../utils/logger");

async function sendWhatsAppFollowUp(store, user, lead, draft) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (user.id === "usr_demo_founder" || !token || !phoneId || !lead?.phone) {
    structuredLog("info", "whatsapp.send.simulation", {
      userId: user.id,
      leadId: lead?.id,
      phone: lead?.phone
    });
    return { provider: "simulation" };
  }

  // Normalize phone number (digits only)
  const recipient = lead.phone.replace(/\D/g, "");

  try {
    const response = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipient,
        type: "text",
        text: { body: draft }
      }),
      signal: AbortSignal.timeout(12000)
    });

    const resBody = await response.json();
    if (!response.ok) {
      throw new Error(`WhatsApp API error: ${response.status} - ${JSON.stringify(resBody)}`);
    }

    structuredLog("info", "whatsapp.send.success", {
      userId: user.id,
      leadId: lead.id,
      messageId: resBody.messages?.[0]?.id
    });

    return { provider: "whatsapp", data: resBody };
  } catch (err) {
    structuredLog("error", "whatsapp.send.failed", {
      userId: user.id,
      leadId: lead?.id,
      error: err.message
    });
    throw err;
  }
}

module.exports = {
  sendWhatsAppFollowUp
};
