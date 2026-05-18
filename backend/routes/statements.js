const express = require("express");
const router = express.Router();

const pool = require("../db");
const auth = require("../middleware/auth");

// =========================
// STUDENT STATEMENT ENGINE v2 (FIXED)
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

    const payments = paymentsResult.rows || [];

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

    const ledger = ledgerResult.rows || [];

    // =========================
    // SAFE FIELD MAPPING FIX
    // =========================
    const totalPaidResult = await pool.query(
      `
      SELECT COALESCE(SUM(amount), 0) as total
      FROM payments
      WHERE student_id = $1 AND school_id = $2
      `,
      [studentId, schoolId]
    );

    const totalPaid = Number(totalPaidResult.rows[0].total || 0);

    // FIX: handle BOTH naming styles safely
    const expectedFees = Number(
      student.expected_fees ?? student.fee_expected ?? 0
    );

    // =========================
    // FINANCIAL LOGIC
    // =========================
    let balance = expectedFees - totalPaid;
    let credit = 0;
    let status = "OWING";

    if (totalPaid === expectedFees) {
      balance = 0;
      status = "PAID";
    } else if (totalPaid > expectedFees) {
      credit = totalPaid - expectedFees;
      balance = 0;
      status = "OVERPAID";
    }

    // =========================
    // SAFE REDUCE (NO CRASH)
    // =========================
    const totalAllocated = ledger.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0
    );

    const breakdown = ledger.reduce((acc, item) => {
      const key = item.category || "uncategorized";
      acc[key] = (acc[key] || 0) + Number(item.amount || 0);
      return acc;
    }, {});

    const lastPayment =
      payments.length > 0 ? payments[payments.length - 1] : null;

    // =========================
    // RESPONSE
    // =========================
    res.json({
      student: {
        id: student.id,
        school_id: student.school_id,
        full_name: student.full_name,
        admission_number: student.admission_number,
        class_name: student.class_name,
        expected_fees: expectedFees,
      },

      summary: {
        expectedFees,
        totalPaid,
        balance,
        credit,
        status,
      },

      analytics: {
        paymentCount: payments.length,
        totalAllocated,
        breakdown,
      },

      lastPayment,
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