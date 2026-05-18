// const express = require("express");
// const router = express.Router();
// const pool = require("../db");

// // GET ALL STUDENTS
// router.get("/", async (req, res) => {
//   try {
//     const schoolId = req.user?.school_id || "test_school";

//     const result = await pool.query(
//       "SELECT * FROM students WHERE school_id = $1 ORDER BY id DESC",
//       [schoolId]
//     );

//     res.json(result.rows || []);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json([]);
//   }
// });

// module.exports = router;


const express = require("express");
const router = express.Router();

router.get("/", async (req, res) => {
  res.json([]);
});

module.exports = router;