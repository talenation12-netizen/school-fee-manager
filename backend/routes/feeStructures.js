const express = require("express");
const pool = require("../db");
const auth = require("../middleware/auth");

const router = express.Router();

/**
 * GET /api/fee-structures
 * List all fee structures for the logged-in school
 */
router.get("/", auth, async (req, res) => {
  try {
    const schoolId = req.user.schoolId;

    const result = await pool.query(
      `
      SELECT *
      FROM fee_structures
      WHERE school_id = $1
      ORDER BY academic_year DESC, term, class_name, description
      `,
      [schoolId]
    );

    res.json({
      feeStructures: result.rows
    });
  } catch (err) {
    console.error("FEE STRUCTURES GET ERROR:", err);
    res.status(500).json({
      error: "Failed to load fee structures"
    });
  }
});

/**
 * POST /api/fee-structures
 * Create a new fee structure item
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
      (
        school_id,
        academic_year,
        term,
        class_name,
        description,
        amount
      )
      VALUES ($1, $2, $3, $4, $5, $6)
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
    console.error("FEE STRUCTURES POST ERROR:", err);
    res.status(500).json({
      error: "Failed to create fee structure"
    });
  }
});

module.exports = router;