const express = require("express");
const router = express.Router();

const pool = require("../db");
const auth = require("../middleware/auth");

/**
 * GET STUDENT STATEMENT
 * /api/students/:id/statement
 */
router.get("/:id/statement", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { schoolId } = req.user;

    // =========================
    // 1. GET STUDENT INFO
    // =========================
    const studentRes = await pool.query(
      `SELECT id, full_name, admission_number, class_name, expected_fees
       FROM students
       WHERE id = $1 AND school_id = $2`,
      [id, schoolId]
    );

    if (studentRes.rows.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }

    const student = studentRes.rows[0];

    // =========================
    // 2. GET ALL PAYMENTS
    // =========================
    const paymentsRes = await pool.query(
      `SELECT id, amount, payment_method, category, term, academic_year, notes, created_at, allocation
       FROM payments
       WHERE student_id = $1 AND school_id = $2
       ORDER BY created_at ASC`,
      [id, schoolId]
    );

    const payments = paymentsRes.rows;

    // =========================
    // 3. BUILD LEDGER
    // =========================
    let balance = Number(student.expected_fees);
    const ledger = [];

    // Opening balance row
    ledger.push({
      date: null,
      description: "Opening Balance",
      debit: balance,
      credit: 0,
      balance,
    });

    // Process payments
    for (const p of payments) {
      balance -= Number(p.amount);

      ledger.push({
        date: p.created_at,
        description: `Payment - ${p.category} (${p.payment_method})`,
        debit: 0,
        credit: Number(p.amount),
        balance,
        allocation: p.allocation,
        receipt: p.id,
      });
    }

    // =========================
    // 4. SUMMARY
    // =========================
    const totalPaid = payments.reduce(
      (sum, p) => sum + Number(p.amount),
      0
    );

    const statement = {
      student,
      summary: {
        expectedFees: Number(student.expected_fees),
        totalPaid,
        balance,
        status:
          balance <= 0
            ? "CLEARED"
            : totalPaid === 0
            ? "NOT PAID"
            : "OWING",
      },
      ledger,
    };

    res.json(statement);
  } catch (error) {
    console.error("STATEMENT ERROR:", error);
    res.status(500).json({
      error: "Failed to generate statement",
    });
  }
});

module.exports = router;