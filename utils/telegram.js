const axios = require("axios");

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function sendTelegramNotice({
  text,
  chatId = TELEGRAM_CHAT_ID,
  parseMode = "HTML",
  disableWebPagePreview = true,
}) {
  if (!TELEGRAM_BOT_TOKEN) {
    throw new Error("Missing TELEGRAM_BOT_TOKEN");
  }

  if (!chatId) {
    throw new Error("Missing TELEGRAM_CHAT_ID");
  }

  if (!text || !String(text).trim()) {
    throw new Error("Message text is required");
  }

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  const response = await axios.post(
    url,
    {
      chat_id: chatId,
      text: String(text),
      parse_mode: parseMode,
      disable_web_page_preview: disableWebPagePreview,
    },
    {
      timeout: 15000,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.data?.ok) {
    throw new Error(response.data?.description || "Telegram sendMessage failed");
  }

  return response.data;
}

module.exports = {
  sendTelegramNotice,
};