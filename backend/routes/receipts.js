const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const pool = require("../db");

// ===============================
// CREATE RECEIPT
// ===============================
router.post("/", auth, async (req, res) => {
  try {
    const { student_id, amount, payment_method = "Cash" } = req.body;

    const schoolId = req.user.schoolId;

    if (!student_id || !amount) {
      return res.status(400).json({ error: "Missing fields" });
    }

    // Get student
    const studentResult = await pool.query(
      `SELECT * FROM students 
       WHERE id = $1 AND school_id = $2`,
      [student_id, schoolId]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }

    const student = studentResult.rows[0];

    // Generate receipt number
    const receipt_number =
      "RCPT-" + Date.now() + "-" + Math.floor(Math.random() * 1000);

    // Save payment
    const paymentResult = await pool.query(
      `INSERT INTO payments
       (school_id, student_id, amount, payment_method, receipt_number)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [schoolId, student_id, amount, payment_method, receipt_number]
    );

    res.json({
      message: "Receipt created",
      receipt: {
        receipt_number,
        student: {
          id: student.id,
          full_name: student.full_name,
        },
        amount,
        payment_method,
        created_at: paymentResult.rows[0].created_at,
      },
    });
  } catch (error) {
    console.error("Receipt error:", error);
    res.status(500).json({ error: "Failed to create receipt" });
  }
});

module.exports = router;