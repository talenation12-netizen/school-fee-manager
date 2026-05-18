const express = require("express");
const router = express.Router();

// Mock students data
const students = [
  {
    id: 1,
    admission_number: "ADM001",
    full_name: "John Doe",
    class_name: "Grade 5",
    balance: 0,
    guardian_name: "Jane Doe",
    phone: "0712345678",
    total_paid: 50000,
    fee_expected: 50000
  },
  {
    id: 2,
    admission_number: "ADM002",
    full_name: "Mary Wanjiku",
    class_name: "Grade 6",
    balance: 12000,
    guardian_name: "Peter Wanjiku",
    phone: "0723456789",
    total_paid: 38000,
    fee_expected: 50000
  }
];

// GET /api/students
router.get("/", async (req, res) => {
  res.json(students);
});

// GET /api/students/:id
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const student = students.find(s => s.id === id);

  if (!student) {
    return res.status(404).json({
      message: "Student not found"
    });
  }

  res.json(student);
});

module.exports = router;