const express = require("express");
const pool = require("../db");
const auth = require("../middleware/auth");

const router = express.Router();

router.post("/", auth, async (req, res) => {
  try {
    const event = req.body;
    const schoolId = req.schoolId;

    console.log("EVENT RECEIVED:", event);
    console.log("AUTH SCHOOL:", schoolId);

    if (event.event_type === "PAYMENT_ADDED") {
      const { amount, method, reference } = event.payload;

      await pool.query(
        `
        INSERT INTO payments (
          school_id,
          amount,
          method,
          reference
        )
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (reference) DO NOTHING
        `,
        [schoolId, amount, method, reference]
      );
    }

    return res.json({
      status: "ACKNOWLEDGED",
      schoolId
    });
  } catch (error) {
    console.error("EVENT ERROR:", error);

    return res.status(500).json({
      error: "Internal Server Error",
      details: error.message
    });
  }
});

module.exports = router;