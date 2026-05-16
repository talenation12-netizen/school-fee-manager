const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const pool = require("../db");

// ========================================
// GET /api/reports/dashboard
// Financial dashboard summary
// ========================================
router.get("/dashboard", auth, async (req, res) => {
  try {
    const schoolId = req.user.schoolId;

    // Total students
    const studentsResult = await pool.query(
      `
      SELECT COUNT(*) AS total_students
      FROM students
      WHERE school_id = $1
      `,
      [schoolId]
    );

    // Total collected and transaction count
    const paymentsResult = await pool.query(
      `
      SELECT
        COALESCE(SUM(amount), 0) AS total_collected,
        COUNT(*) AS transactions,
        COALESCE(AVG(amount), 0) AS avg_payment
      FROM payments
      WHERE school_id = $1
      `,
      [schoolId]
    );

    // Total expected fees
    const expectedResult = await pool.query(
      `
      SELECT COALESCE(SUM(expected_fees), 0) AS total_expected
      FROM students
      WHERE school_id = $1
      `,
      [schoolId]
    );

    const totalStudents = Number(
      studentsResult.rows[0].total_students || 0
    );

    const totalCollected = Number(
      paymentsResult.rows[0].total_collected || 0
    );

    const transactions = Number(
      paymentsResult.rows[0].transactions || 0
    );

    const avgPayment = Number(
      paymentsResult.rows[0].avg_payment || 0
    );

    const totalExpected = Number(
      expectedResult.rows[0].total_expected || 0
    );

    const totalOutstanding = totalExpected - totalCollected;

    const collectionRate =
      totalExpected > 0
        ? (totalCollected / totalExpected) * 100
        : 0;

    res.json({
      totalStudents,
      totalCollected,
      totalOutstanding,
      transactions,
      avgPayment,
      totalExpected,
      collectionRate: Number(collectionRate.toFixed(2)),
    });
  } catch (error) {
    console.error("Dashboard report error:", error);

    res.status(500).json({
      error: "Failed to load dashboard",
    });
  }
});

// ========================================
// GET /api/reports/defaulters
// Students with outstanding balances
// ========================================
router.get("/defaulters", auth, async (req, res) => {
  try {
    const schoolId = req.user.schoolId;

    const result = await pool.query(
      `
      SELECT
        s.id,
        s.full_name,
        s.admission_number,
        s.class_name,
        s.expected_fees,
        COALESCE(SUM(p.amount), 0) AS total_paid,
        s.expected_fees - COALESCE(SUM(p.amount), 0) AS balance
      FROM students s
      LEFT JOIN payments p
        ON s.id = p.student_id
       AND p.school_id = s.school_id
      WHERE s.school_id = $1
      GROUP BY
        s.id,
        s.full_name,
        s.admission_number,
        s.class_name,
        s.expected_fees
      HAVING s.expected_fees - COALESCE(SUM(p.amount), 0) > 0
      ORDER BY balance DESC, s.full_name ASC
      `,
      [schoolId]
    );

    res.json({
      count: result.rows.length,
      students: result.rows.map((row) => ({
        ...row,
        expected_fees: Number(row.expected_fees),
        total_paid: Number(row.total_paid),
        balance: Number(row.balance),
      })),
    });
  } catch (error) {
    console.error("Defaulters report error:", error);

    res.status(500).json({
      error: "Failed to generate defaulters report",
    });
  }
});

module.exports = router;