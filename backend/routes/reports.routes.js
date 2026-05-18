const express = require("express");
const router = express.Router();

// GET /api/reports/summary?period=monthly
router.get("/summary", async (req, res) => {
  const period = req.query.period || "monthly";

  res.json({
    period,
    totalStudents: 1,
    totalCollected: 50000,
    totalOutstanding: 0,
    transactions: 1,
    avgPayment: 50000
  });
});

module.exports = router;