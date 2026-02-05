const axios = require("axios");

function createWhatsAppCloudClient(env) {
  const token = env.WHATSAPP_TOKEN;
  const phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID;
  const graphApiVersion = env.GRAPH_API_VERSION || "v20.0";

  if (!token) throw new Error("Missing WHATSAPP_TOKEN in .env");
  if (!phoneNumberId)
    throw new Error("Missing WHATSAPP_PHONE_NUMBER_ID in .env");

  const baseURL = `https://graph.facebook.com/${graphApiVersion}/${phoneNumberId}`;

  const http = axios.create({
    baseURL,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    timeout: 30000,
  });

  async function sendTextMessage(toE164, body, options = {}) {
    const payload = {
      messaging_product: "whatsapp",
      to: toE164.replace(/^\+/, ""),
      type: "text",
      text: {
        preview_url: Boolean(options.previewUrl),
        body,
      },
    };

    try {
      const res = await http.post("/messages", payload);
      return { ok: true, data: res.data };
    } catch (err) {
      const status = err.response?.status;
      const data = err.response?.data;
      const message =
        data?.error?.message ||
        err.message ||
        "WhatsApp Cloud API request failed";
      return {
        ok: false,
        error: { status, message, data },
      };
    }
  }

  return { sendTextMessage, baseURL };
}

module.exports = { createWhatsAppCloudClient };
