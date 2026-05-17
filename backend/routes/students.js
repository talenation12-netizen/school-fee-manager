const express = require("express");
const router = express.Router();

const pool = require("../db");
const auth = require("../middleware/auth");

// ==========================================
// GET STUDENT LEDGER
// ==========================================
router.get("/:id/ledger", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const schoolId = req.user.schoolId;

    // ==========================
    // 1. LOAD STUDENT
    // ==========================
    const studentResult = await pool.query(
      `
      SELECT
        id,
        full_name,
        admission_number,
        class_name,
        expected_fees,
        opening_balance
      FROM students
      WHERE id = $1
        AND school_id = $2
      `,
      [id, schoolId]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({
        error: "Student not found",
      });
    }

    const student = studentResult.rows[0];

    // ==========================
    // 2. LOAD PAYMENTS
    // ==========================
    const paymentsResult = await pool.query(
      `
      SELECT
        id,
        receipt_number,
        amount,
        category,
        term,
        academic_year,
        notes,
        allocation,
        balance_after,
        created_at
      FROM payments
      WHERE student_id = $1
        AND school_id = $2
      ORDER BY created_at ASC, id ASC
      `,
      [id, schoolId]
    );

    const payments = paymentsResult.rows;

    // ==========================
    // 3. CALCULATE TOTAL PAID
    // ==========================
    const totalPaid = payments.reduce(
      (sum, payment) => sum + Number(payment.amount),
      0
    );

    // ==========================
    // 4. CALCULATE CURRENT BALANCE
    // ==========================
    const openingBalance = Number(student.opening_balance || 0);
    const expectedFees = Number(student.expected_fees || 0);

    const balance =
      openingBalance + expectedFees - totalPaid;

    // ==========================
    // 5. DETERMINE STATUS
    // ==========================
    let status = "OWING";

    if (balance <= 0) {
      status = balance < 0 ? "OVERPAID" : "CLEARED";
    }

    // ==========================
    // 6. BUILD TRANSACTION HISTORY
    // ==========================
    const transactions = [];

    // Opening balance entry
    if (openingBalance > 0) {
      transactions.push({
        type: "OPENING_BALANCE",
        description: "Opening Balance",
        amount: openingBalance,
        running_balance:
          openingBalance + expectedFees,
      });
    }

    // Expected fees entry
    transactions.push({
      type: "EXPECTED_FEES",
      description: "Expected Fees",
      amount: expectedFees,
      running_balance:
        openingBalance + expectedFees,
    });

    // Payment entries
    let runningBalance =
      openingBalance + expectedFees;

    for (const payment of payments) {
      runningBalance -= Number(payment.amount);

      transactions.push({
        type: "PAYMENT",
        description:
          payment.notes || "Fee Payment",
        receipt_number:
          payment.receipt_number,
        amount: Number(payment.amount),
        category: payment.category,
        term: payment.term,
        academic_year:
          payment.academic_year,
        allocation: payment.allocation,
        created_at: payment.created_at,
        running_balance,
      });
    }

    // ==========================
    // 7. RESPONSE
    // ==========================
    res.json({
      student: {
        id: student.id,
        full_name: student.full_name,
        admission_number:
          student.admission_number,
        class_name: student.class_name,
      },

      financials: {
        openingBalance,
        expectedFees,
        totalPaid,
        balance,
        status,
      },

      transactions,
    });
  } catch (err) {
    console.error(
      "Ledger engine error:",
      err.message
    );

    res.status(500).json({
      error: "Failed to generate ledger",
    });
  }
});

module.exports = router;