const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db");

const router = express.Router();

const JWT_SECRET = "super_secret_key_change_this";

/**
 * REGISTER SCHOOL
 */
router.post("/register", async (req, res) => {
  try {
    const { school_name, email, password } = req.body;

    if (!school_name || !email || !password) {
      return res.status(400).json({
        error: "All fields are required"
      });
    }

    const existing = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        error: "Account already exists"
      });
    }

    const school_id = school_name
      .toLowerCase()
      .replace(/ /g, "_")
      .replace(/[^a-z0-9_]/g, "");

    const hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `
      INSERT INTO users (school_id, school_name, email, password_hash)
      VALUES ($1, $2, $3, $4)
      RETURNING school_id, school_name, email
      `,
      [school_id, school_name, email, hash]
    );

    res.json({
      message: "Account created",
      school: result.rows[0]
    });

  } catch (err) {
    console.error("REGISTER ERROR:", err);
    res.status(500).json({
      error: "Server error",
      details: err.message
    });
  }
});

/**
 * LOGIN SCHOOL
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({
        error: "Account not found"
      });
    }

    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return res.status(401).json({
        error: "Invalid password"
      });
    }

    const token = jwt.sign(
      { schoolId: user.school_id },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      school: {
        school_id: user.school_id,
        school_name: user.school_name,
        email: user.email
      }
    });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({
      error: "Server error",
      details: err.message
    });
  }
});

module.exports = router;