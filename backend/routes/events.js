const express = require("express");
const pool = require("../db");
const auth = require("../middleware/auth");

const router = express.Router();

/**
 * CREATE PAYMENT EVENT (SECURE)
 * Multi-school safe write
 */
router.post("/", auth, async (req, res) => {
  try {
    const { event_type, payload } = req.body;

    const schoolId = req.school.schoolId; // 🔐 TRUST SERVER ONLY

    // basic validation
    if (!event_type || !payload) {
      return res.status(400).json({
        error: "Missing event_type or payload"
      });
    }

    if (event_type === "PAYMENT_ADDED") {
      const { amount, method, reference } = payload;

      const result = await pool.query(
        `
        INSERT INTO payments (
          school_id,
          amount,
          method,
          reference
        )
        VALUES ($1, $2, $3, $4)
        RETURNING *
        `,
        [schoolId, amount, method, reference]
      );

      return res.json({
        status: "ACKNOWLEDGED",
        data: result.rows[0]
      });
    }

    // fallback for unknown events
    return res.status(400).json({
      error: "Unknown event type"
    });

  } catch (err) {
    console.error("EVENT ERROR:", err);

    res.status(500).json({
      error: "Internal Server Error",
      details: err.message
    });
  }
});

module.exports = router;