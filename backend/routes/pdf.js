const express = require("express");
const router = express.Router();

const PDFDocument = require("pdfkit");
const pool = require("../db");
const auth = require("../middleware/auth");

// =========================
// STUDENT STATEMENT PDF
// =========================
router.get("/student-statement/:studentId", auth, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { schoolId } = req.user;

    const student = await pool.query(
      `SELECT * FROM students WHERE id=$1 AND school_id=$2`,
      [studentId, schoolId]
    );

    if (!student.rows.length) {
      return res.status(404).json({ error: "Student not found" });
    }

    const payments = await pool.query(
      `SELECT * FROM payments WHERE student_id=$1 AND school_id=$2 ORDER BY created_at ASC`,
      [studentId, schoolId]
    );

    const doc = new PDFDocument();

    res.setHeader(
      "Content-Type",
      "application/pdf"
    );

    doc.pipe(res);

    // =========================
    // HEADER
    // =========================
    doc.fontSize(18).text("SCHOOL STATEMENT", { align: "center" });
    doc.moveDown();

    doc.fontSize(12).text(`Name: ${student.rows[0].full_name}`);
    doc.text(`Admission: ${student.rows[0].admission_number}`);
    doc.text(`Class: ${student.rows[0].class_name}`);
    doc.moveDown();

    // =========================
    // PAYMENTS TABLE
    // =========================
    doc.fontSize(14).text("PAYMENT HISTORY");
    doc.moveDown();

    payments.rows.forEach((p, i) => {
      doc
        .fontSize(10)
        .text(
          `${i + 1}. ${p.created_at} | ${p.amount} | ${p.category} | ${p.receipt_number}`
        );
    });

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "PDF generation failed" });
  }
});

// =========================
// RECEIPT PDF
// =========================
router.get("/receipt/:paymentId", auth, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { schoolId } = req.user;

    const payment = await pool.query(
      `SELECT * FROM payments WHERE id=$1 AND school_id=$2`,
      [paymentId, schoolId]
    );

    if (!payment.rows.length) {
      return res.status(404).json({ error: "Payment not found" });
    }

    const doc = new PDFDocument();

    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);

    const p = payment.rows[0];

    // =========================
    // RECEIPT HEADER
    // =========================
    doc.fontSize(20).text("PAYMENT RECEIPT", { align: "center" });
    doc.moveDown();

    doc.fontSize(12).text(`Receipt No: ${p.receipt_number}`);
    doc.text(`Student ID: ${p.student_id}`);
    doc.text(`Amount: ${p.amount}`);
    doc.text(`Method: ${p.payment_method}`);
    doc.text(`Category: ${p.category}`);
    doc.text(`Date: ${p.created_at}`);

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Receipt PDF failed" });
  }
});

module.exports = router;