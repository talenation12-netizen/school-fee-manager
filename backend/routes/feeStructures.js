const express = require("express");
const pool = require("../db");
const auth = require("../middleware/auth");

const router = express.Router();

/**
 * GET all fee structures
 */
router.get("/", auth, async (req, res) => {
  try {
    const schoolId = req.user.schoolId;

    const result = await pool.query(
      `
      SELECT *
      FROM fee_structures
      WHERE school_id = $1
      ORDER BY created_at DESC
      `,
      [schoolId]
    );

    res.json({
      feeStructures: result.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch fee structures" });
  }
});

/**
 * CREATE fee structure
 */
router.post("/", auth, async (req, res) => {
  try {
    const schoolId = req.user.schoolId;

    const {
      academic_year,
      term,
      class_name,
      description,
      amount
    } = req.body;

    if (
      !academic_year ||
      !term ||
      !class_name ||
      !description ||
      amount === undefined
    ) {
      return res.status(400).json({
        error: "All fields are required"
      });
    }

    const result = await pool.query(
      `
      INSERT INTO fee_structures
      (school_id, academic_year, term, class_name, description, amount)
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *
      `,
      [
        schoolId,
        academic_year,
        term,
        class_name,
        description,
        amount
      ]
    );

    res.json({
      message: "Fee structure created",
      feeStructure: result.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create fee structure" });
  }
});

module.exports = router;