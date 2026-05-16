const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db");

const auth = require("../middleware/Auth");

// =====================
// REGISTER
// =====================
router.post("/register", async (req, res) => {
  try {
    const { school_name, email, password } = req.body;

    if (!school_name || !email || !password) {
      return res.status(400).json({
        error: "All fields are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existing = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [normalizedEmail]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        error: "Account already exists",
      });
    }

    const school_id = school_name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");

    const password_hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `
      INSERT INTO users (school_id, school_name, email, password_hash, role)
      VALUES ($1, $2, $3, $4, 'admin')
      RETURNING school_id, school_name, email
      `,
      [school_id, school_name.trim(), normalizedEmail, password_hash]
    );

    res.json({
      message: "Account created",
      school: result.rows[0],
    });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// =====================
// LOGIN (PUBLIC - NO AUTH)
// =====================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [normalizedEmail]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({
        error: "Account not found",
      });
    }

    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return res.status(401).json({
        error: "Invalid password",
      });
    }

    const token = jwt.sign(
      { schoolId: user.school_id },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    return res.json({
      token,
      school: {
        school_id: user.school_id,
        school_name: user.school_name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// =====================
// GET CURRENT USER (PROTECTED)
// =====================
router.get("/me", auth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT school_id, school_name, email FROM users WHERE school_id = $1",
      [req.user.schoolId]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    res.json({
      user: result.rows[0],
    });
  } catch (err) {
    console.error("ME ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;





// router.post("/login", (req, res) => {
//   console.log("🔥 LOGIN ROUTE HIT");
//   res.json({ ok: true });
// });