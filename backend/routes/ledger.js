const express = require("express");
const router = express.Router();

const pool = require("../db");
const auth = require("../middleware/auth");

// GET STUDENT LEDGER
router.get("/:studentId", auth, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { schoolId } = req.user;

    // Student info
    const student = await pool.query(
      `
      SELECT * FROM students
      WHERE id = $1 AND school_id = $2
      `,
      [studentId, schoolId]
    );

    if (!student.rows.length) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Ledger entries
    const ledger = await pool.query(
      `
      SELECT *
      FROM student_ledger
      WHERE student_id = $1 AND school_id = $2
      ORDER BY created_at ASC
      `,
      [studentId, schoolId]
    );

    // Summary
    const payments = await pool.query(
      `
      SELECT COALESCE(SUM(amount),0) as total
      FROM payments
      WHERE student_id = $1 AND school_id = $2
      `,
      [studentId, schoolId]
    );

    const expected = Number(student.rows[0].expected_fees);
    const totalPaid = Number(payments.rows[0].total);
    const balance = expected - totalPaid;

    res.json({
      student: student.rows[0],
      summary: {
        expectedFees: expected,
        totalPaid,
        balance,
        status: balance <= 0 ? "PAID" : "OWING",
      },
      ledger: ledger.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ledger fetch failed" });
  }
});

module.exports = router;