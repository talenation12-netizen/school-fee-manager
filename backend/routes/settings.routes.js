// const express = require("express");
// const router = express.Router();
// const pool = require("../db");

// // GET SETTINGS
// router.get("/", async (req, res) => {
//   try {
//     const schoolId = req.user?.school_id || "test_school";

//     const result = await pool.query(
//       "SELECT * FROM settings WHERE school_id = $1 LIMIT 1",
//       [schoolId]
//     );

//     if (result.rows.length === 0) {
//       return res.json({
//         school_id: schoolId,
//         school_name: "Test School",
//         default_fee: 0,
//       });
//     }

//     res.json(result.rows[0]);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Failed to fetch settings" });
//   }
// });

// module.exports = router;






const express = require("express");
const router = express.Router();

router.get("/", async (req, res) => {
  res.json({
    school_name: "Test School",
    currency: "KES",
    timezone: "Africa/Nairobi"
  });
});

module.exports = router;