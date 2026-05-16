const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const pool = require("../db");

// ===============================
// CREATE PAYMENT (CORE ENGINE)
// ===============================
router.post("/", auth, async (req, res) => {
  try {
    const { student_id, amount, payment_method, notes } = req.body;

    const school_id = req.user.schoolId;

    // 1. Validate input
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

    // 2. Check student exists for this school
    const studentResult = await pool.query(
      `SELECT * FROM students 
       WHERE id = $1 AND school_id = $2`,
      [student_id, school_id]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({
        error: "Student not found",
      });
    }

    // 3. Generate receipt number
    const receipt_number =
      "RCP-" + Date.now() + "-" + Math.floor(Math.random() * 1000);

    // 4. Insert payment
    const result = await pool.query(
      `INSERT INTO payments 
        (school_id, student_id, receipt_number, amount, payment_method, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        school_id,
        student_id,
        receipt_number,
        amount,
        payment_method || "Cash",
        notes || null,
      ]
    );

    // 5. Response
    res.status(201).json({
      message: "Payment recorded successfully",
      payment: result.rows[0],
    });
  } catch (error) {
    console.error("PAYMENT ERROR:", error);
    res.status(500).json({
      error: "Failed to record payment",
    });
  }
});

// ===============================
// GET STUDENT PAYMENTS
// ===============================
router.get("/:student_id", auth, async (req, res) => {
  try {
    const school_id = req.user.schoolId;
    const student_id = req.params.student_id;

    const result = await pool.query(
  `INSERT INTO payments 
   (school_id, student_id, receipt_number, amount, payment_method, category, term, academic_year, notes)
   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
   RETURNING *`,
  [
    school_id,
    student_id,
    receipt_number,
    amount,
    payment_method || "Cash",
    req.body.category || "Tuition",
    req.body.term || "Term 1",
    req.body.academic_year || "2026",
    notes || null
  ]
);

    res.json({
      payments: result.rows,
    });
  } catch (error) {
    console.error("GET PAYMENTS ERROR:", error);
    res.status(500).json({
      error: "Failed to fetch payments",
    });
  }
});

module.exports = router;