const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const pool = require("../db");


// =====================================================
// 📊 DASHBOARD REPORT
// GET /api/reports/dashboard
// =====================================================
router.get("/dashboard", auth, async (req, res) => {
  try {
    const schoolId = req.user.schoolId;

    const students = await pool.query(
      `SELECT COUNT(*) FROM students WHERE school_id = $1`,
      [schoolId]
    );

    const payments = await pool.query(
      `
      SELECT 
        COALESCE(SUM(amount),0) AS total_collected,
        COUNT(*) AS transactions,
        COALESCE(AVG(amount),0) AS avg_payment
      FROM payments
      WHERE school_id = $1
      `,
      [schoolId]
    );

    const expected = await pool.query(
      `
      SELECT COALESCE(SUM(expected_fees),0) AS total_expected
      FROM students
      WHERE school_id = $1
      `,
      [schoolId]
    );

    const totalStudents = Number(students.rows[0].count);
    const totalCollected = Number(payments.rows[0].total_collected);
    const transactions = Number(payments.rows[0].transactions);
    const avgPayment = Number(payments.rows[0].avg_payment);
    const totalExpected = Number(expected.rows[0].total_expected);

    const totalOutstanding = totalExpected - totalCollected;

    const collectionRate =
      totalExpected > 0
        ? (totalCollected / totalExpected) * 100
        : 0;

    res.json({
      totalStudents,
      totalCollected,
      totalOutstanding,
      transactions,
      avgPayment,
      totalExpected,
      collectionRate: Number(collectionRate.toFixed(2)),
    });

  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ error: "Dashboard failed" });
  }
});


// =====================================================
// 🚨 DEFAULTERS REPORT
// GET /api/reports/defaulters
// =====================================================
router.get("/defaulters", auth, async (req, res) => {
  try {
    const schoolId = req.user.schoolId;

    const result = await pool.query(
      `
      SELECT 
        s.id,
        s.full_name,
        s.admission_number,
        s.class_name,
        s.expected_fees,
        COALESCE(SUM(p.amount),0) AS total_paid,
        s.expected_fees - COALESCE(SUM(p.amount),0) AS balance
      FROM students s
      LEFT JOIN payments p
        ON s.id = p.student_id
       AND p.school_id = s.school_id
      WHERE s.school_id = $1
      GROUP BY s.id
      HAVING s.expected_fees - COALESCE(SUM(p.amount),0) > 0
      ORDER BY balance DESC
      `,
      [schoolId]
    );

    res.json({
      count: result.rows.length,
      students: result.rows.map(r => ({
        ...r,
        expected_fees: Number(r.expected_fees),
        total_paid: Number(r.total_paid),
        balance: Number(r.balance),
      })),
    });

  } catch (err) {
    console.error("Defaulters error:", err);
    res.status(500).json({ error: "Defaulters failed" });
  }
});


// =====================================================
// 📄 STUDENT STATEMENT ENGINE (SPRINT 7)
// GET /api/reports/student-statement/:id
// =====================================================
router.get("/student-statement/:id", auth, async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const studentId = req.params.id;

    const studentResult = await pool.query(
      `
      SELECT id, full_name, admission_number, class_name, expected_fees, opening_balance
      FROM students
      WHERE id = $1 AND school_id = $2
      `,
      [studentId, schoolId]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }

    const student = studentResult.rows[0];

    let runningBalance =
      Number(student.opening_balance || 0) +
      Number(student.expected_fees || 0);

    const paymentsResult = await pool.query(
      `
      SELECT *
      FROM payments
      WHERE student_id = $1 AND school_id = $2
      ORDER BY created_at ASC
      `,
      [studentId, schoolId]
    );

    const entries = [];

    entries.push({
      type: "OPENING",
      description: "Opening balance + fees",
      debit: runningBalance,
      credit: 0,
      balance: runningBalance,
    });

    for (const p of paymentsResult.rows) {
      runningBalance -= Number(p.amount);

      entries.push({
        type: "PAYMENT",
        date: p.created_at,
        receipt: p.receipt_number,
        description: p.notes || "Payment",
        debit: 0,
        credit: Number(p.amount),
        balance: runningBalance,
      });
    }

    const totalPaid = paymentsResult.rows.reduce(
      (sum, p) => sum + Number(p.amount),
      0
    );

    const status =
      runningBalance > 0 ? "OWING" :
      runningBalance < 0 ? "OVERPAID" : "PAID";

    res.json({
      student,
      summary: {
        totalCharges: runningBalance + totalPaid,
        totalPaid,
        balance: runningBalance,
        status,
      },
      entries,
    });

  } catch (err) {
    console.error("Statement error:", err);
    res.status(500).json({ error: "Statement failed" });
  }
});


router.get("/reports/summary", async (req, res) => {
  const schoolId = req.school.school_id;

  const totalCollected = await pool.query(
    "SELECT COALESCE(SUM(amount),0) FROM payments WHERE school_id=$1",
    [schoolId]
  );

  const totalOutstanding = await pool.query(
    "SELECT COALESCE(SUM(expected_fees - COALESCE(total_paid,0)),0) FROM students WHERE school_id=$1",
    [schoolId]
  );

  const transactions = await pool.query(
    "SELECT COUNT(*) FROM payments WHERE school_id=$1",
    [schoolId]
  );

  res.json({
    totalCollected: totalCollected.rows[0].sum,
    totalOutstanding: totalOutstanding.rows[0].coalesce,
    totalTransactions: transactions.rows[0].count,
    activeStudents: 0,
    classPerformance: [],
    topDefaulters: [],
  });
});


module.exports = router;