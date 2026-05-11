const express = require("express");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config");

const router = express.Router();

router.post("/login", (req, res) => {
  const { schoolId, password } = req.body;

  if (schoolId === "SCHOOL_001" && password === "1234") {
    const token = jwt.sign({ schoolId }, JWT_SECRET, { expiresIn: "7d" });

    return res.json({
      token,
      schoolId
    });
  }

  res.status(401).json({ error: "Invalid login" });
});

module.exports = router;