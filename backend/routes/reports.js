router.get("/summary", auth, async (req, res) => {
  try {
    const schoolId = req.school.schoolId;

    const payments = await pool.query(
      `
      SELECT SUM(amount) as total_collected
      FROM payments
      WHERE school_id = $1
      `,
      [schoolId]
    );

    const students = await pool.query(
      `
      SELECT COUNT(*) as total_students
      FROM students
      WHERE school_id = $1
      `,
      [schoolId]
    );

    res.json({
      total_collected: payments.rows[0].total_collected || 0,
      total_students: students.rows[0].total_students || 0
    });

  } catch (err) {
    res.status(500).json({ error: "Failed to load report" });
  }
});