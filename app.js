const express = require("express");
const puppeteer = require("puppeteer");

const app = express();

app.get("/check-browser", async (req, res) => {
  const url = req.query.url;
  if (!url) {
    return res.status(400).json({ message: "Missing url" });
  }

  let browser;
  try {
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    const response = await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 15000,
    });

    const content = await page.content();
    const status = response ? response.status() : null;

    res.json({
      url,
      status,
      has404Text: content.includes("404 Not Found"),
      isBroken: status === 404 || content.includes("404 Not Found"),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    if (browser) await browser.close();
  }
});