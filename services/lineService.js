const axios = require("axios");
const cheerio = require("cheerio");

const { checkLineIdType } = require("../utils/utils");
const { sendTelegramNotice } = require("../utils/telegram");

function normalizeText(text = "") {
  return String(text).trim().toLowerCase();
}

function detectLineStatus({ finalUrl, title, pTexts }) {
  const normalizedTitle = normalizeText(title);
  const normalizedPTexts = pTexts.map(normalizeText);

  const has404Text = normalizedPTexts.some((text) =>
    text.includes("404 not found"),
  );

  const hasScanText = normalizedPTexts.some((text) =>
    text.includes("scan qr code to add friend"),
  );

  if (finalUrl.startsWith("https://store.line.me")) {
    return {
      status: "SUSPENDED",
      message: "LINE ID has been suspended",
      matchedRule: "STORE_LINE_REDIRECT",
    };
  }

  if (finalUrl.startsWith("https://page.line.me")) {
    return {
      status: "ACTIVE",
      message: "LINE ID exists and redirects to LINE page",
      matchedRule: "PAGE_LINE_REDIRECT",
    };
  }

  if (finalUrl.startsWith("https://line.me") && has404Text) {
    return {
      status: "NOT_FOUND",
      message: "LINE ID not found",
      matchedRule: "LINE_ME_404",
    };
  }

  if (
    finalUrl.startsWith("https://line.me") &&
    normalizedTitle === "add line friend" &&
    hasScanText
  ) {
    return {
      status: "ACTIVE",
      message: "LINE ID exists",
      matchedRule: "LINE_ME_ADD_FRIEND",
    };
  }

  return {
    status: "UNKNOWN",
    message: "Unable to determine LINE ID status",
    matchedRule: "UNKNOWN",
  };
}

async function fetchLinePage(url) {
  const response = await axios.get(url, {
    timeout: 15000,
    maxRedirects: 5,
    validateStatus: () => true,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      Connection: "keep-alive",
    },
  });

  const html =
    typeof response.data === "string"
      ? response.data
      : JSON.stringify(response.data);

  const finalUrl =
    response?.request?.res?.responseUrl || response?.request?.path || url;

  return {
    statusCode: response.status,
    finalUrl,
    html,
  };
}

function extractHtmlData(html) {
  const $ = cheerio.load(html);

  const title = $("title").first().text().trim();

  const pTexts = $("p")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean);

  return { title, pTexts };
}

async function checkLineId(lineId) {
  const cleanId = String(lineId).trim();
  const url = `https://line.me/R/ti/p/${cleanId}`;

  const { finalUrl, html, statusCode } = await fetchLinePage(url);
  const { title, pTexts } = extractHtmlData(html);
  const detection = detectLineStatus({ finalUrl, title, pTexts });

  return {
    lineId: cleanId,
    idType: checkLineIdType(cleanId),
    inputUrl: url,
    finalUrl,
    httpStatus: statusCode,
    ...detection,
  };
}

function getStatusEmoji(status) {
  if (status === "ACTIVE") return "🟢";
  if (status === "SUSPENDED") return "🔴";
  if (status === "NOT_FOUND") return "🟠";
  return "⚪";
}

function getStatusText(status) {
  if (status === "ACTIVE") return "ปกติ";
  if (status === "SUSPENDED") return "ถูกระงับ";
  if (status === "NOT_FOUND") return "ไม่พบข้อมูล";
  return "ไม่ทราบ";
}

function buildBrandHealthMessage(brand, ids = []) {
  const lines = [`<b>LINE CHECKER</b> - ${brand}`, `━━━━━━━━━━━━━━━━`];

  for (const item of ids) {
    const url = `https://line.me/R/ti/p/${item.label}`;
    lines.push(
      `${getStatusEmoji(item.status)} <b><a href="${url}">${item.label}</a></b> (${getStatusText(item.status)})`,
    );
  }

  return lines.join("\n");
}

async function sendBrandStatusesToTelegram(brand, ids) {
  const text = buildBrandHealthMessage(brand, ids);
  await sendTelegramNotice({ text });
}

// ---------- Get LINE ID From ENV -----------
function getEnvLineIds() {
  return (process.env.LINE_ID_LIST || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function textResponse(lineId, status) {
  if (status === "ACTIVE") {
    return `LINE ID <b><a href="https://line.me/R/ti/p/${lineId}">${lineId}</a></b>: สถานะ 🟢 ปกติ`;
  }
  if (status === "SUSPENDED") {
    return `LINE ID <b><a href="https://line.me/R/ti/p/${lineId}">${lineId}</a></b>: สถานะ 🔴 ถูกระงับ`;
  }
  if (status === "UNKNOWN") {
    return `LINE ID <b><a href="https://line.me/R/ti/p/${lineId}">${lineId}</a></b>: สถานะ ⚪ ไม่ทราบ`;
  }
  if (status === "NOT_FOUND") {
    return `LINE ID <b><a href="https://line.me/R/ti/p/${lineId}">${lineId}</a></b>: สถานะ 🟠 ไม่พบข้อมูล`;
  }

  return `สถานะ LINE ID ${lineId}: ${status}`;
}


async function sendLineStatusesToTelegram(lineIds) {
  for (const id of lineIds) {
    try {
      const result = await checkLineId(id);
      await sendTelegramNotice({
        text: textResponse(result.lineId, result.status),
      });
    } catch (error) {
      console.log("ERROR checkLineId:", error);
    }
  }
}
// ---------- Get LINE ID From ENV -----------

module.exports = {
  getEnvLineIds,
  sendLineStatusesToTelegram,
  checkLineId,
  sendBrandStatusesToTelegram,
  buildBrandHealthMessage,
};
