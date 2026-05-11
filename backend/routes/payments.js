const express = require("express");
const pool = require("../db");
const auth = require("../middleware/auth");

const router = express.Router();

/**
 * GET ALL PAYMENTS (for Excel dashboard)
 */
router.get("/", auth, async (req, res) => {
  try {
    const schoolId = req.schoolId;

    const result = await pool.query(
      `
      SELECT * FROM payments
      WHERE school_id = $1
      ORDER BY created_at DESC
      `,
      [schoolId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("GET PAYMENTS ERROR:", err);

    res.status(500).json({
      error: "Failed to fetch payments",
      details: err.message
    });
  }
});

module.exports = router;