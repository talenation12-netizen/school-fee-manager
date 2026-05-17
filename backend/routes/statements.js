const express = require("express");
const router = express.Router();

const pool = require("../db");
const auth = require("../middleware/auth");

// =========================
// STUDENT STATEMENT (SPRINT 16)
// =========================
router.get("/:studentId", auth, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { schoolId } = req.user;

    // =========================
    // GET STUDENT
    // =========================
    const studentResult = await pool.query(
      `
      SELECT * FROM students
      WHERE id = $1 AND school_id = $2
      `,
      [studentId, schoolId]
    );

    if (!studentResult.rows.length) {
      return res.status(404).json({ error: "Student not found" });
    }

    const student = studentResult.rows[0];

    // =========================
    // GET PAYMENTS
    // =========================
    const paymentsResult = await pool.query(
      `
      SELECT *
      FROM payments
      WHERE student_id = $1 AND school_id = $2
      ORDER BY created_at ASC
      `,
      [studentId, schoolId]
    );

    const payments = paymentsResult.rows;

    // =========================
    // GET LEDGER
    // =========================
    const ledgerResult = await pool.query(
      `
      SELECT *
      FROM student_ledger
      WHERE student_id = $1 AND school_id = $2
      ORDER BY created_at ASC
      `,
      [studentId, schoolId]
    );

    const ledger = ledgerResult.rows;

    // =========================
    // CALCULATE SUMMARY
    // =========================
    const totalPaidResult = await pool.query(
      `
      SELECT COALESCE(SUM(amount), 0) as total
      FROM payments
      WHERE student_id = $1 AND school_id = $2
      `,
      [studentId, schoolId]
    );

    const totalPaid = Number(totalPaidResult.rows[0].total);
    const expectedFees = Number(student.expected_fees);
    const balance = expectedFees - totalPaid;

    const status =
      balance <= 0 ? "PAID" : "OWING";

    // =========================
    // STATEMENT RESPONSE
    // =========================
    res.json({
      student,
      summary: {
        expectedFees,
        totalPaid,
        balance: balance < 0 ? 0 : balance,
        credit: balance < 0 ? Math.abs(balance) : 0,
        status,
      },
      payments,
      ledger,
    });
  } catch (error) {
    console.error("STATEMENT ERROR:", error);

    res.status(500).json({
      error: "Failed to generate statement",
      details: error.message,
    });
  }
});

module.exports = router;