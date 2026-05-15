console.log("🔥 LEDGER ROUTE ACTIVE VERSION 2");

console.log("JWT USER:", req.user);
console.log("schoolId:", req.user.schoolId);
console.log("params:", req.params.id);


const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const pool = require("../db");

// ===============================
// GET STUDENT LEDGER (CORE ENGINE)
// ===============================
router.get("/:id/ledger", auth, async (req, res) => {
  try {
    const studentId = req.params.id;
    const schoolId = req.user.schoolId; // ✅ FIXED

    // DEBUG (safe inside function)
    console.log("JWT USER:", req.user);
    console.log("schoolId USED:", schoolId);
    console.log("studentId:", studentId);

    // 1. Get student
    const studentResult = await pool.query(
      `SELECT * FROM students 
       WHERE id = $1 AND school_id = $2`,
      [studentId, schoolId]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }

    const student = studentResult.rows[0];

    // 2. Get total payments
    const paymentResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total_paid
       FROM payments
       WHERE student_id = $1 AND school_id = $2`,
      [studentId, schoolId]
    );

    const totalPaid = parseFloat(paymentResult.rows[0].total_paid || 0);

    // 3. Compute ledger values
    const expectedFees = parseFloat(student.expected_fees || 0);
    const balance = expectedFees - totalPaid;

    let status = "PAID";
    if (balance > 0) status = "OWING";
    if (balance < 0) status = "OVERPAID";

    // 4. Response
    res.json({
      student: {
        id: student.id,
        admission_number: student.admission_number,
        full_name: student.full_name,   // ✅ FIXED (was "name")
        class_name: student.class_name,  // ✅ FIXED (was "class")
        expected_fees: expectedFees
      },
      financials: {
        expectedFees,
        totalPaid,
        balance,
        status
      }
    });

  } catch (error) {
    console.error("Ledger error:", error);
    res.status(500).json({ error: "Failed to load ledger" });
  }
});

module.exports = router;