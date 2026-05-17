const express = require("express");
const router = express.Router();

const pool = require("../db");
const auth = require("../middleware/auth");

// GET /api/payments/test
router.get("/test", (req, res) => {
  res.json({
    ok: true,
    message: "Payments route working",
  });
});

// POST /api/payments
router.post("/", auth, async (req, res) => {
  try {
    const { schoolId } = req.user;

    const {
      student_id,
      amount,
      payment_method = "Cash",
      category = "Tuition",
      term = "Term 1",
      academic_year = "2026",
      notes = "",
    } = req.body;

    const receipt_number = `RCP-${Date.now()}-${Math.floor(
      Math.random() * 1000
    )}`;

    const result = await pool.query(
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
        recorded_by
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10
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
      ]
    );

    res.status(201).json({
      message: "Payment recorded successfully",
      payment: result.rows[0],
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