const express = require("express");
const router = express.Router();

const pool = require("../db");
const auth = require("../middleware/auth");

// ========================================
// STUDENT STATEMENT ENGINE v3 (BULLETPROOF)
// ========================================
// GET /api/statements/:studentId
router.get("/:studentId", auth, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { schoolId } = req.user;

    // Validate student ID
    if (!studentId || isNaN(Number(studentId))) {
      return res.status(400).json({
        error: "Invalid student ID",
      });
    }

    // ========================================
    // GET STUDENT
    // ========================================
    const studentResult = await pool.query(
      `
      SELECT
        id,
        school_id,
        full_name,
        admission_number,
        class_name,
        COALESCE(expected_fees, fee_expected, 50000) AS expected_fees
      FROM students
      WHERE id = $1 AND school_id = $2
      `,
      [Number(studentId), schoolId]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({
        error: "Student not found",
      });
    }

    const student = studentResult.rows[0];
    const expectedFees = Number(student.expected_fees || 0);

    // ========================================
    // GET PAYMENTS (SAFE EVEN IF TABLE EMPTY)
    // ========================================
    let payments = [];
    try {
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
        WHERE student_id = $1 AND school_id = $2
        ORDER BY created_at ASC
        `,
        [Number(studentId), schoolId]
      );

      payments = paymentsResult.rows;
    } catch (err) {
      console.error("PAYMENTS QUERY ERROR:", err.message);
      payments = [];
    }

    // ========================================
    // GET LEDGER (OPTIONAL TABLE)
    // ========================================
    let ledger = [];
    try {
      const ledgerResult = await pool.query(
        `
        SELECT
          id,
          category,
          amount,
          description,
          created_at
        FROM student_ledger
        WHERE student_id = $1 AND school_id = $2
        ORDER BY created_at ASC
        `,
        [Number(studentId), schoolId]
      );

      ledger = ledgerResult.rows;
    } catch (err) {
      // Table may not exist yet — do not crash
      console.warn("LEDGER QUERY WARNING:", err.message);
      ledger = [];
    }

    // ========================================
    // CALCULATIONS
    // ========================================
    const totalPaid = payments.reduce(
      (sum, payment) => sum + Number(payment.amount || 0),
      0
    );

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

    // ========================================
    // ANALYTICS
    // ========================================
    const paymentCount = payments.length;

    const totalAllocated = ledger.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0
    );

    const breakdown = ledger.reduce((acc, item) => {
      const category = item.category || "General";
      acc[category] = (acc[category] || 0) + Number(item.amount || 0);
      return acc;
    }, {});

    const lastPayment =
      payments.length > 0 ? payments[payments.length - 1] : null;

    // ========================================
    // RESPONSE
    // ========================================
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

      // Both names included for frontend compatibility
      payments,
      ledger: ledger.length > 0 ? ledger : payments,
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