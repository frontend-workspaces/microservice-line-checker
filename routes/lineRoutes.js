const express = require("express");
const router = express.Router();
const lineController = require("../controllers/lineController");

router.get("/", lineController.healthCheck);
router.get("/check-line", lineController.checkSingleLine);
router.post("/check-line-list", lineController.checkLineList);
router.post("/check-line-status", lineController.checkLineStatus);
router.post('/check-line-status-db', lineController.checkLineStatusDB);

module.exports = router;