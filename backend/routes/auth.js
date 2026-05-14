router.get("/me", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "No token" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    const result = await pool.query(
      "SELECT school_id, school_name, email FROM users WHERE school_id = $1",
      [decoded.schoolId]
    );

    return res.json({
      user: result.rows[0]
    });
  } catch (err) {
    return res.status(401).json({ error: "Invalid session" });
  }
});