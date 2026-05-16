const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const pool = require("../db");

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

// ========================================
// GET /api/reports/dashboard
// (Keep your existing dashboard endpoint below this)
// ========================================

module.exports = router;