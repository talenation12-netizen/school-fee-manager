const express = require("express");
const pool = require("../db");
const auth = require("../middleware/auth");

const router = express.Router();

router.post("/", auth, async (req, res) => {
  const event = req.body;
  const schoolId = req.schoolId;

  if (event.event_type === "PAYMENT_ADDED") {
    await pool.query(
      `INSERT INTO payments (school_id, amount, method, reference)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (reference) DO NOTHING`,
      [
        schoolId,
        event.payload.amount,
        event.payload.method,
        event.payload.reference
      ]
    );
  }

  res.json({
    status: "ACKNOWLEDGED",
    schoolId
  });
});

module.exports = router;