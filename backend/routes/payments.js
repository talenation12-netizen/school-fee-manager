const express = require("express");
const router = express.Router();

const pool = require("../db");
const auth = require("../middleware/auth");

// ==========================
// TEST ROUTE
// ==========================
router.get("/test", (req, res) => {
  res.json({
    ok: true,
    message: "Payments route working",
  });
});

// ==========================
// SMART PAYMENT ENGINE
// ==========================
router.post("/", auth, async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { schoolId } = req.user;

    const {
      student_id,
      amount,
      payment_method,
      category = "Tuition",
      term = "Term 1",
      academic_year = "2026",
      notes,
      allocation,
    } = req.body;

    // ==========================
    // 1. GET STUDENT FINANCIAL STATE
    // ==========================
    const studentRes = await client.query(
      `SELECT expected_fees FROM students WHERE id = $1 AND school_id = $2`,
      [student_id, schoolId]
    );

    if (studentRes.rows.length === 0) {
      throw new Error("Student not found");
    }

    const expectedFees = Number(studentRes.rows[0].expected_fees);

    // ==========================
    // 2. GET TOTAL PAID SO FAR
    // ==========================
    const paidRes = await client.query(
      `SELECT COALESCE(SUM(amount),0) as total_paid
       FROM payments
       WHERE student_id = $1 AND school_id = $2`,
      [student_id, schoolId]
    );

    const totalPaidBefore = Number(paidRes.rows[0].total_paid);

    // ==========================
    // 3. CALCULATE BALANCE
    // ==========================
    const totalPaidAfter = totalPaidBefore + Number(amount);
    const balanceAfter = expectedFees - totalPaidAfter;

    // ==========================
    // 4. SAFE ALLOCATION
    // ==========================
    const safeAllocation =
      allocation && typeof allocation === "object" ? allocation : {};

    // ==========================
    // 5. RECEIPT NUMBER
    // ==========================
    const receipt_number = `RCP-${Date.now()}-${Math.floor(
      Math.random() * 1000
    )}`;

    // ==========================
    // 6. INSERT PAYMENT
    // ==========================
    const result = await client.query(
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
        allocation,
        balance_after,
        recorded_by
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
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
        JSON.stringify(safeAllocation),
        balanceAfter,
        schoolId,
      ]
    );

    await client.query("COMMIT");

    // ==========================
    // RESPONSE
    // ==========================
    res.status(201).json({
      message: "Payment recorded successfully",
      payment: result.rows[0],
      meta: {
        expectedFees,
        totalPaidBefore,
        totalPaidAfter,
        balanceAfter,
        allocation: safeAllocation,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("PAYMENT ERROR:", error);

    res.status(500).json({
      error: "Failed to create payment",
      details: error.message,
    });
  } finally {
    client.release();
  }
});

module.exports = router;