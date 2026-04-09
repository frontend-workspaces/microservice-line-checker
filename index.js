const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
require("dotenv").config();

const { checkLineIdType } = require("./utils/utils");
const { sendTelegramNotice } = require("./utils/telegram");

const app = express();
const PORT = 3000;

app.use(express.json());

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

  // axios in Node usually exposes the final redirected URL here
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
    // title,
    // pTexts,
    ...detection,
  };
}

// health check
app.get("/", async (req, res) => {
  return res.json({
    status: true,
    version: "1.0.0",
    app: "microservice-line-checker",
  });
});

// single check
app.get("/check-line", async (req, res) => {
  console.log("[/check-line]");
  console.log("req.query.id:", req.query.id);

  const lineId = req.query.id;

  if (!lineId) {
    return res.status(400).json({
      ok: false,
      message: "Missing ?id= parameter",
    });
  }

  try {
    const result = await checkLineId(lineId);

    return res.json({
      ok: true,
      result,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: error.message,
    });
  }
});

// batch check
app.post("/check-line-list", async (req, res) => {
  console.log("[/check-line-list]");
  console.log("req.body?.ids:", req.body?.ids);

  const ids = req.body?.ids;

  if (!Array.isArray(ids)) {
    return res.status(400).json({
      ok: false,
      message: "Request body must contain ids array",
      example: {
        ids: ["@abc", "@xyz"],
      },
    });
  }

  if (ids.length === 0) {
    return res.status(400).json({
      ok: false,
      message: "ids array is empty",
    });
  }

  try {
    const results = [];

    for (const id of ids) {
      try {
        const result = await checkLineId(id);
        results.push(result);
      } catch (error) {
        results.push({
          lineId: id,
          status: "ERROR",
          message: error.message,
          matchedRule: "REQUEST_ERROR",
        });
      }
    }

    const summary = {
      ACTIVE: 0,
      SUSPENDED: 0,
      NOT_FOUND: 0,
      UNKNOWN: 0,
      ERROR: 0,
    };

    for (const item of results) {
      if (summary[item.status] !== undefined) {
        summary[item.status]++;
      } else {
        summary.UNKNOWN++;
      }
    }

    return res.json({
      ok: true,
      total: results.length,
      summary,
      results,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: error.message,
    });
  }
});

app.post("/check-line-status", async (req, res) => {
  console.log("[/check-line-status]");

  const textResponse = (lineId, status) => {
    if (status === "ACTIVE") return `สถานะ LINE ID ${lineId}: 🟢 ปกติ`;
    if (status === "SUSPENDED") return `สถานะ LINE ID ${lineId}: 🔴 ถูกระงับ`;
    if (status === "NOT_FOUND")
      return `สถานะ LINE ID ${lineId}: 🟠 ไม่พบข้อมูล`;

    return `สถานะ LINE ID ${lineId}: ${status}`;
  };

  const lineIds = (process.env.LINE_ID_LIST || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  if (lineIds.length === 0) {
    return res.status(400).json({
      ok: false,
      message: "lineIds array is empty",
    });
  }

  try {
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

    return res.json({
      ok: true,
      lineIds,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
