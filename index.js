// app.js
const express = require("express");
const puppeteer = require("puppeteer");
const { checkLineIdType } = require("./utils");

const app = express();
const PORT = 3000;

app.use(express.json());

function normalizeText(text = "") {
  return text.trim().toLowerCase();
}

function detectLineStatus({ finalUrl, title, pTexts }) {
  const normalizedTitle = normalizeText(title);
  const normalizedPTexts = pTexts.map(normalizeText);

  const has404Text = normalizedPTexts.some((text) =>
    text.includes("404 not found")
  );

  const hasScanText = normalizedPTexts.some((text) =>
    text.includes("scan qr code to add friend")
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

async function checkLineId(page, lineId) {
  const cleanId = lineId.trim();
  const url = `https://line.me/R/ti/p/${cleanId}`;

  await page.goto(url, {
    waitUntil: "networkidle2",
    timeout: 15000,
  });

  const finalUrl = page.url();
  const title = await page.title();

  const pTexts = await page.$$eval("p", (elements) =>
    elements.map((el) => el.textContent?.trim() || "").filter(Boolean)
  );

  const detection = detectLineStatus({ finalUrl, title, pTexts });

  return {
    lineId: cleanId,
    idType: checkLineIdType(cleanId),
    inputUrl: url,
    finalUrl,
    // title,
    // pTexts,
    ...detection,
  };
}

// single check
app.get("/check-line", async (req, res) => {
  const lineId = req.query.id;

  if (!lineId) {
    return res.status(400).json({
      ok: false,
      message: "Missing ?id= parameter",
    });
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    const result = await checkLineId(page, lineId);

    return res.json({
      ok: true,
      result,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: error.message,
    });
  } finally {
    if (browser) await browser.close();
  }
});

app.post("/check-line-list", async (req, res) => {
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

  let browser;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    const results = [];

    for (const id of ids) {
      try {
        const result = await checkLineId(page, id);
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

    // ✅ summary counter
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
  } finally {
    if (browser) await browser.close();
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
