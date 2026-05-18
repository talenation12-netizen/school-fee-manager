const express = require("express");
const router = express.Router();

const pool = require("../db");
const auth = require("../middleware/auth");

// =============================================
// STUDENT STATEMENT ENGINE v3 (BULLETPROOF)
// Handles students even if:
// - expected_fees is null
// - no payments exist
// - no ledger entries exist
// - student_ledger table is empty
// - some columns contain null values
// =============================================
router.get("/:studentId", auth, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { schoolId } = req.user;

    // =============================================
    // VALIDATE STUDENT ID
    // =============================================
    if (!studentId || isNaN(studentId)) {
      return res.status(400).json({
        error: "Invalid student ID",
      });
    }

    // =============================================
    // GET STUDENT
    // =============================================
    const studentResult = await pool.query(
      `
      SELECT
        id,
        school_id,
        full_name,
        admission_number,
        class_name,
        COALESCE(expected_fees, fee_expected, 0) AS expected_fees
      FROM students
      WHERE id = $1
        AND school_id = $2
      `,
      [studentId, schoolId]
    );

    if (!studentResult.rows.length) {
      return res.status(404).json({
        error: "Student not found",
      });
    }

    const student = studentResult.rows[0];

    // =============================================
    // GET PAYMENTS
    // =============================================
    const paymentsResult = await pool.query(
      `
      SELECT
        id,
        amount,
        receipt_number,
        payment_method,
        category,
        term,
        academic_year,
        notes,
        created_at
      FROM payments
      WHERE student_id = $1
        AND school_id = $2
      ORDER BY created_at ASC
      `,
      [studentId, schoolId]
    );

    const payments = paymentsResult.rows || [];

    // =============================================
    // GET LEDGER
    // (Safe even if table is empty)
    // =============================================
    let ledger = [];

    try {
      const ledgerResult = await pool.query(
        `
        SELECT
          id,
          amount,
          category,
          description,
          created_at
        FROM student_ledger
        WHERE student_id = $1
          AND school_id = $2
        ORDER BY created_at ASC
        `,
        [studentId, schoolId]
      );

      ledger = ledgerResult.rows || [];
    } catch (ledgerError) {
      // If student_ledger table has issues,
      // do not fail the entire statement.
      console.warn("LEDGER WARNING:", ledgerError.message);
      ledger = [];
    }

    // =============================================
    // CALCULATE TOTAL PAID
    // =============================================
    const totalPaidResult = await pool.query(
      `
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM payments
      WHERE student_id = $1
        AND school_id = $2
      `,
      [studentId, schoolId]
    );

    const totalPaid = Number(totalPaidResult.rows[0]?.total || 0);
    const expectedFees = Number(student.expected_fees || 0);

    // =============================================
    // CORE FINANCIAL LOGIC
    // =============================================
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

    // =============================================
    // ANALYTICS
    // =============================================
    const lastPayment =
      payments.length > 0 ? payments[payments.length - 1] : null;

    const paymentCount = payments.length;

    const totalAllocated = ledger.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0
    );

    const breakdown = ledger.reduce((acc, item) => {
      const category = item.category || "General";
      acc[category] =
        (acc[category] || 0) + Number(item.amount || 0);
      return acc;
    }, {});

    // =============================================
    // RESPONSE
    // =============================================
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
        paymentCount,
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