const express = require("express");
const router = express.Router();
const pool = require("../db");
const auth = require("../middleware/Auth");

// ===============================
// ALLOCATION ENGINE
// ===============================
function allocatePayment(amount) {
  const rules = {
    tuition: 0.6,
    transport: 0.15,
    meals: 0.1,
    boarding: 0.1,
    development: 0.05,
  };

  const allocation = {};

  for (const key in rules) {
    allocation[key] = parseFloat((amount * rules[key]).toFixed(2));
  }

  return allocation;
}

// ===============================
// POST PAYMENT (CORE ENGINE)
// ===============================
router.post("/", auth, async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const {
      student_id,
      amount,
      payment_method = "Cash",
      category = "Tuition",
      term = "Term 1",
      academic_year = "2026",
      notes = "",
    } = req.body;

    const schoolId = req.user.schoolId;

    // ===============================
    // VALIDATION
    // ===============================
    if (!student_id || !amount) {
      return res.status(400).json({
        error: "student_id and amount are required",
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        error: "Amount must be greater than 0",
      });
    }

    // ===============================
    // GET STUDENT
    // ===============================
    const studentResult = await client.query(
      `SELECT * FROM students WHERE id = $1 AND school_id = $2`,
      [student_id, schoolId]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }

    const student = studentResult.rows[0];

    // ===============================
    // CALCULATE BALANCE
    // ===============================
    const paidResult = await client.query(
      `SELECT COALESCE(SUM(amount),0) AS total_paid
       FROM payments
       WHERE student_id = $1 AND school_id = $2`,
      [student_id, schoolId]
    );

    const totalPaidBefore = parseFloat(paidResult.rows[0].total_paid);
    const expectedFees = parseFloat(student.expected_fees || 0);

    const newTotalPaid = totalPaidBefore + parseFloat(amount);
    const balanceAfter = expectedFees - newTotalPaid;

    // ===============================
    // RECEIPT NUMBER
    // ===============================
    const receipt_number = `RCP-${Date.now()}-${Math.floor(
      Math.random() * 1000
    )}`;

    // ===============================
    // ALLOCATION ENGINE
    // ===============================
    const allocation = allocatePayment(parseFloat(amount));

    // ===============================
    // INSERT PAYMENT
    // ===============================
    const result = await client.query(
      `INSERT INTO payments (
        school_id,
        student_id,
        receipt_number,
        amount,
        payment_method,
        category,
        term,
        academic_year,
        notes,
        allocation
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *`,
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
        allocation,
      ]
    );

    const payment = result.rows[0];

    // ===============================
    // UPDATE BALANCE SNAPSHOT
    // ===============================
    await client.query(
      `UPDATE payments
       SET balance_after = $1
       WHERE id = $2`,
      [balanceAfter, payment.id]
    );

    await client.query("COMMIT");

    // ===============================
    // RESPONSE
    // ===============================
    res.json({
      message: "Payment recorded successfully",
      payment: {
        ...payment,
        allocation,
        balance_after: balanceAfter,
        expected_fees: expectedFees,
        total_paid: newTotalPaid,
      },
    });
  } catch (err) {
    await client.query("ROLLBACK");

    console.error("PAYMENT ERROR:", err.message);

    res.status(500).json({
      error: "Failed to create payment",
      details: err.message,
    });
  } finally {
    client.release();
  }
});

// ===============================
// GET ALL PAYMENTS (SCHOOL)
// ===============================
router.get("/", auth, async (req, res) => {
  try {
    const schoolId = req.user.schoolId;

    const result = await pool.query(
      `SELECT * FROM payments
       WHERE school_id = $1
       ORDER BY created_at DESC`,
      [schoolId]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({
      error: "Failed to fetch payments",
    });
  }
});

module.exports = router;