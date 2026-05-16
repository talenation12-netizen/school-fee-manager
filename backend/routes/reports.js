const express = require("express");
const router = express.Router();
const pool = require("../db");
const auth = require("../middleware/auth");

// =====================================
// DASHBOARD METRICS (LIVE FROM DATABASE)
// =====================================
router.get("/dashboard", auth, async (req, res) => {
  try {
    const schoolId = req.user.schoolId;

    // -----------------------------
    // Total students and expected fees
    // -----------------------------
    const studentStats = await pool.query(
      `
      SELECT
        COUNT(*) AS total_students,
        COALESCE(SUM(expected_fees + opening_balance), 0) AS total_expected
      FROM students
      WHERE school_id = $1
      `,
      [schoolId]
    );

    // -----------------------------
    // Total collected and transactions
    // -----------------------------
    const paymentStats = await pool.query(
      `
      SELECT
        COUNT(*) AS transactions,
        COALESCE(SUM(amount), 0) AS total_collected,
        COALESCE(AVG(amount), 0) AS avg_payment
      FROM payments
      WHERE school_id = $1
      `,
      [schoolId]
    );

    const totalStudents = parseInt(
      studentStats.rows[0].total_students,
      10
    );

    const totalExpected = parseFloat(
      studentStats.rows[0].total_expected
    );

    const transactions = parseInt(
      paymentStats.rows[0].transactions,
      10
    );

    const totalCollected = parseFloat(
      paymentStats.rows[0].total_collected
    );

    const avgPayment = parseFloat(
      paymentStats.rows[0].avg_payment
    );

    // -----------------------------
    // Derived metrics
    // -----------------------------
    const totalOutstanding = totalExpected - totalCollected;

    const collectionRate =
      totalExpected > 0
        ? parseFloat(
            ((totalCollected / totalExpected) * 100).toFixed(2)
          )
        : 0;

    // -----------------------------
    // Response
    // -----------------------------
    res.json({
      totalStudents,
      totalExpected,
      totalCollected,
      totalOutstanding,
      transactions,
      avgPayment: parseFloat(avgPayment.toFixed(2)),
      collectionRate,
    });
  } catch (err) {
    console.error("DASHBOARD ERROR:", err.message);

    res.status(500).json({
      error: "Failed to load dashboard",
      details: err.message,
    });
  }
});

module.exports = router;