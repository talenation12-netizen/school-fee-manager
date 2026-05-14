const express = require("express");
const pool = require("../db");
const auth = require("../middleware/auth");

const router = express.Router();

router.get("/", auth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM fee_structures WHERE school_id = $1",
      [req.user.schoolId]
    );

    res.json({ feeStructures: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "failed" });
  }
});

router.post("/", auth, async (req, res) => {
  try {
    const { academic_year, term, class_name, description, amount } = req.body;

    const result = await pool.query(
      `INSERT INTO fee_structures
      (school_id, academic_year, term, class_name, description, amount)
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *`,
      [
        req.user.schoolId,
        academic_year,
        term,
        class_name,
        description,
        amount
      ]
    );

    res.json({ feeStructure: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "failed" });
  }
});

module.exports = router;