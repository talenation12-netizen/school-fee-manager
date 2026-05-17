const express = require("express");
const router = express.Router();

const pool = require("../db");
const auth = require("../middleware/auth");
const { allocatePayment } = require("../utils/allocationEngine");

// =========================
// TEST ROUTE
// =========================
router.get("/test", (req, res) => {
  res.json({
    ok: true,
    message: "Payments route working",
  });
});

// =========================
// CREATE PAYMENT (SPRINT 15 FINAL)
// =========================
router.post("/", auth, async (req, res) => {
  try {
    const { schoolId } = req.user;

    const {
      student_id,
      amount,
      payment_method,
      category,
      term,
      academic_year,
      notes,
    } = req.body;

    // =========================
    // VALIDATION
    // =========================
    if (!student_id || isNaN(student_id)) {
      return res.status(400).json({ error: "Invalid student_id" });
    }

    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    // =========================
    // FIND STUDENT
    // =========================
    const studentResult = await pool.query(
      `
      SELECT * FROM students
      WHERE id = $1 AND school_id = $2
      `,
      [student_id, schoolId]
    );

    if (!studentResult.rows.length) {
      return res.status(404).json({
        error: "Student not found in this school",
      });
    }

    const student = studentResult.rows[0];

    // =========================
    // ALLOCATION ENGINE
    // =========================
    const allocation = allocatePayment(amount);

    // =========================
    // BALANCE CALCULATION
    // =========================
    const totalPaidResult = await pool.query(
      `
      SELECT COALESCE(SUM(amount), 0) as total
      FROM payments
      WHERE student_id = $1 AND school_id = $2
      `,
      [student_id, schoolId]
    );

    const previousPaid = Number(totalPaidResult.rows[0].total);
    const newPaid = previousPaid + Number(amount);

    const expectedFees = Number(student.expected_fees);

    let balanceAfter = expectedFees - newPaid;

    // =========================
    // CREDIT LOGIC (OPTION 2 - COMPUTED ONLY)
    // =========================
    let credit = newPaid - expectedFees;

    if (credit < 0) {
      credit = 0;
    }

    if (balanceAfter < 0) {
      balanceAfter = 0;
    }

    // =========================
    // RECEIPT NUMBER
    // =========================
    const receipt_number = `RCP-${Date.now()}-${Math.floor(
      Math.random() * 1000
    )}`;

    // =========================
    // INSERT PAYMENT
    // =========================
    const paymentResult = await pool.query(
      `
      INSERT INTO payments (
        school_id,
        student_id,
        receipt_number,
        amount,
        payment_method,
        category,
        term,
        academic_year,
        notes,
        recorded_by,
        allocation,
        balance_after
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12
      )
      RETURNING *
      `,
      [
        schoolId,
        student_id,
        receipt_number,
        amount,
        payment_method,
        category,
        term,
        academic_year,
        notes,
        schoolId,
        allocation,
        balanceAfter,
      ]
    );

    const payment = paymentResult.rows[0];

    // =========================
    // LEDGER INSERTION
    // =========================
    const categories = ["tuition", "lunch", "transport"];

    for (const cat of categories) {
      if (allocation[cat] > 0) {
        await pool.query(
          `
          INSERT INTO student_ledger (
            school_id,
            student_id,
            payment_id,
            category,
            amount,
            balance_after
          )
          VALUES ($1,$2,$3,$4,$5,$6)
          `,
          [
            schoolId,
            student_id,
            payment.id,
            cat,
            allocation[cat],
            balanceAfter,
          ]
        );
      }
    }

    // =========================
    // RESPONSE
    // =========================
    res.status(201).json({
      message: "Payment recorded successfully",
      payment,
      student: {
        id: student.id,
        full_name: student.full_name,
      },
      meta: {
        expectedFees,
        totalPaid: newPaid,
        balance: balanceAfter,
        credit,
        allocation,
      },
    });
  } catch (error) {
    console.error("PAYMENT ERROR:", error);

    res.status(500).json({
      error: "Failed to create payment",
      details: error.message,
    });
  }
});

module.exports = router;