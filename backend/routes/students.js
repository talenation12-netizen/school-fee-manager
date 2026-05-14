const express = require("express");
const pool = require("../db");
const auth = require("../middleware/auth");

const router = express.Router();

/**
 * GET ALL STUDENTS (PER SCHOOL)
 */
router.get("/", auth, async (req, res) => {
  try {
    const schoolId = req.school.schoolId;

    const result = await pool.query(
      `
      SELECT * FROM students
      WHERE school_id = $1
      ORDER BY id DESC
      `,
      [schoolId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("GET STUDENTS ERROR:", err);
    res.status(500).json({ error: "Failed to fetch students" });
  }
});

/**
 * CREATE STUDENT
 */
router.post("/create", auth, async (req, res) => {
  try {
    const schoolId = req.school.schoolId;
    const { name, class: className, fee_expected, paid } = req.body;

    const result = await pool.query(
      `
      INSERT INTO students (school_id, name, class, fee_expected, paid)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [schoolId, name, className, fee_expected || 0, paid || 0]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("CREATE STUDENT ERROR:", err);
    res.status(500).json({ error: "Failed to create student" });
  }
});

/**
 * UPDATE STUDENT (EXCEL STYLE EDIT)
 */
router.post("/update", auth, async (req, res) => {
  try {
    const schoolId = req.school.schoolId;
    const { id, name, class: className, fee_expected, paid } = req.body;

    const result = await pool.query(
      `
      UPDATE students
      SET name = $1,
          class = $2,
          fee_expected = $3,
          paid = $4
      WHERE id = $5 AND school_id = $6
      RETURNING *
      `,
      [name, className, fee_expected, paid, id, schoolId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("UPDATE STUDENT ERROR:", err);
    res.status(500).json({ error: "Failed to update student" });
  }
});

/**
 * DELETE STUDENT (OPTIONAL BUT READY)
 */
router.delete("/:id", auth, async (req, res) => {
  try {
    const schoolId = req.school.schoolId;
    const { id } = req.params;

    await pool.query(
      `
      DELETE FROM students
      WHERE id = $1 AND school_id = $2
      `,
      [id, schoolId]
    );

    res.json({ message: "Deleted" });
  } catch (err) {
    console.error("DELETE STUDENT ERROR:", err);
    res.status(500).json({ error: "Failed to delete student" });
  }
});

module.exports = router;