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
      payment_method,
      category,
      term,
      academic_year,
      notes,
      allocation,
    } = req.body;

    // =========================
    // VALIDATION (IMPORTANT)
    // =========================
    if (!student_id || isNaN(student_id)) {
      return res.status(400).json({
        error: "Invalid student_id",
      });
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        error: "Invalid amount",
      });
    }

    // =========================
    // STUDENT CHECK (FIXED)
    // =========================
    const studentCheck = await pool.query(
      `
      SELECT * FROM students
      WHERE id = $1 AND school_id = $2
      `,
      [student_id, schoolId]
    );

    if (!studentCheck.rows.length) {
      return res.status(404).json({
        error: "Student not found in this school",
        debug: {
          student_id,
          schoolId,
        },
      });
    }

    const student = studentCheck.rows[0];

    // =========================
    // RECEIPT NUMBER
    // =========================
    const receipt_number = `RCP-${Date.now()}-${Math.floor(
      Math.random() * 1000
    )}`;

    // =========================
    // INSERT PAYMENT
    // =========================
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
        recorded_by,
        allocation
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11
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
        allocation || {},
      ]
    );

    // =========================
    // RESPONSE
    // =========================
    res.status(201).json({
      message: "Payment recorded successfully",
      payment: result.rows[0],
      student: {
        id: student.id,
        full_name: student.full_name,
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