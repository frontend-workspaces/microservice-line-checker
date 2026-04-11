const {
  checkLineId,
  buildSummary,
  getEnvLineIds,
  sendLineStatusesToTelegram,
  sendBrandStatusesToTelegram
} = require("../services/lineService");

const Brand = require('../models/Brand')

async function healthCheck(req, res) {
  return res.json({
    status: true,
    version: "1.0.0",
    app: "microservice-line-checker",
  });
}

async function checkSingleLine(req, res) {
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
}

async function checkLineList(req, res) {
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

    return res.json({
      ok: true,
      total: results.length,
      summary: buildSummary(results),
      results,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: error.message,
    });
  }
}

async function checkLineStatus(req, res) {
  console.log("[/check-line-status]");

  const lineIds = getEnvLineIds();

  if (lineIds.length === 0) {
    return res.status(400).json({
      ok: false,
      message: "lineIds array is empty",
    });
  }

  try {
    await sendLineStatusesToTelegram(lineIds);

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
}

async function checkLineStatusDB(req, res) {
  console.log('[/check-line-status-db]')

  try {
    const brands = await Brand.find({}).select('-__v')

    if (!brands.length) {
      return res.status(404).json({
        ok: false,
        message: 'No brand data found'
      })
    }

    const updatedBrands = []

    for (const brandDoc of brands) {
      const updatedIds = []

      for (const item of brandDoc.ids) {
        try {
          const result = await checkLineId(item.label)

          updatedIds.push({
            label: item.label,
            status: result.status
          })
        } catch (error) {
          updatedIds.push({
            label: item.label,
            status: 'UNKNOWN'
          })
        }
      }

      brandDoc.ids = updatedIds
      await brandDoc.save()

      await sendBrandStatusesToTelegram(brandDoc.brand, updatedIds)

      updatedBrands.push({
        id: brandDoc.id,
        brand: brandDoc.brand,
        ids: updatedIds
      })
    }

    return res.json({
      ok: true,
      totalBrands: updatedBrands.length,
      data: updatedBrands
    })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: 'Failed to check LINE status from DB',
      error: error.message
    })
  }
}

module.exports = {
  healthCheck,
  checkSingleLine,
  checkLineList,
  checkLineStatus,
  checkLineStatusDB
};