// const express = require("express");
// const router = express.Router();
// const pool = require("../db");

// // SUMMARY REPORT
// router.get("/summary", async (req, res) => {
//   try {
//     const schoolId = req.user?.school_id || "test_school";

//     const payments = await pool.query(
//       "SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE school_id = $1",
//       [schoolId]
//     );

//     const students = await pool.query(
//       "SELECT COUNT(*) FROM students WHERE school_id = $1",
//       [schoolId]
//     );

//     res.json({
//       totalCollected: Number(payments.rows[0].total),
//       totalOutstanding: 0,
//       totalTransactions: 0,
//       activeStudents: Number(students.rows[0].count),
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Failed to load reports" });
//   }
// });

// module.exports = router;






const express = require("express");
const router = express.Router();

router.get("/summary", async (req, res) => {
  res.json({
    totalStudents: 0,
    totalCollected: 0,
    totalOutstanding: 0,
    transactions: 0
  });
});

module.exports = router;