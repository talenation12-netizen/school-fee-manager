const express = require("express");
const pool = require("../db");
const auth = require("../middleware/auth");

const router = express.Router();

/**
 * GET ALL PAYMENTS
 */
router.get("/", auth, async (req, res) => {
  try {
    const schoolId = req.school.schoolId;

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
    res.status(500).json({ error: "Failed to fetch payments" });
  }
});

/**
 * CREATE PAYMENT
 */
router.post("/", auth, async (req, res) => {
  try {
    const schoolId = req.school.schoolId;
    const { student_name, amount, method, reference } = req.body;

    const result = await pool.query(
      `
      INSERT INTO payments
      (school_id, student_name, amount, method, reference)
      VALUES ($1,$2,$3,$4,$5)
      RETURNING *
      `,
      [schoolId, student_name, amount, method, reference]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to create payment" });
  }
});

module.exports = router;