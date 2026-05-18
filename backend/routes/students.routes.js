const express = require("express");
const router = express.Router();

// GET /api/students
router.get("/", async (req, res) => {
  res.json([
    {
      id: 1,
      admission_number: "ADM001",
      full_name: "John Doe",
      class_name: "Grade 5",
      balance: 0
    }
  ]);
});

module.exports = router;