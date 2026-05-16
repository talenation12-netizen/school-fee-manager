const express = require("express");
const router = express.Router();
const PDFDocument = require("pdfkit");
const pool = require("../db");
const auth = require("../middleware/auth");

// ===============================
// GET RECEIPT DETAILS (JSON)
// ===============================
router.get("/:receipt_number", auth, async (req, res) => {
  try {
    const { receipt_number } = req.params;
    const schoolId = req.user.schoolId;

    const result = await pool.query(
      `SELECT p.*, s.full_name, s.admission_number, s.class_name
       FROM payments p
       JOIN students s ON s.id = p.student_id
       WHERE p.receipt_number = $1 AND p.school_id = $2`,
      [receipt_number, schoolId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Receipt not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch receipt" });
  }
});

// ===============================
// DOWNLOAD PDF RECEIPT
// ===============================
router.get("/:receipt_number/pdf", auth, async (req, res) => {
  try {
    const { receipt_number } = req.params;
    const schoolId = req.user.schoolId;

    const result = await pool.query(
      `SELECT p.*, s.full_name, s.admission_number, s.class_name
       FROM payments p
       JOIN students s ON s.id = p.student_id
       WHERE p.receipt_number = $1 AND p.school_id = $2`,
      [receipt_number, schoolId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Receipt not found" });
    }

    const data = result.rows[0];

    const doc = new PDFDocument();

    res.setHeader(
      "Content-Type",
      "application/pdf"
    );

    res.setHeader(
      "Content-Disposition",
      `inline; filename=${receipt_number}.pdf`
    );

    doc.pipe(res);

    // ===============================
    // SCHOOL HEADER
    // ===============================
    doc.fontSize(20).text("SCHOOL FEE RECEIPT", {
      align: "center",
    });

    doc.moveDown();

    // ===============================
    // RECEIPT INFO
    // ===============================
    doc.fontSize(12).text(`Receipt No: ${data.receipt_number}`);
    doc.text(`Student: ${data.full_name}`);
    doc.text(`Admission No: ${data.admission_number}`);
    doc.text(`Class: ${data.class_name}`);

    doc.moveDown();

    // ===============================
    // PAYMENT INFO
    // ===============================
    doc.text(`Amount Paid: KES ${data.amount}`);
    doc.text(`Method: ${data.payment_method}`);
    doc.text(`Category: ${data.category}`);
    doc.text(`Term: ${data.term}`);
    doc.text(`Year: ${data.academic_year}`);

    doc.moveDown();

    // ===============================
    // BALANCE INFO
    // ===============================
    doc.text(`Balance After Payment: KES ${data.balance_after}`);

    doc.moveDown();

    // ===============================
    // FOOTER
    // ===============================
    doc.text("This is a system generated receipt.", {
      align: "center",
    });

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate receipt PDF" });
  }
});

// ===============================
// VERIFY RECEIPT (ANTI FRAUD)
// ===============================
router.get("/verify/:receipt_number", async (req, res) => {
  try {
    const { receipt_number } = req.params;

    const result = await pool.query(
      `SELECT receipt_number, amount, created_at
       FROM payments
       WHERE receipt_number = $1`,
      [receipt_number]
    );

    if (result.rows.length === 0) {
      return res.json({
        valid: false,
        message: "Receipt not found",
      });
    }

    res.json({
      valid: true,
      receipt: result.rows[0],
    });
  } catch (err) {
    res.status(500).json({ error: "Verification failed" });
  }
});

module.exports = router;