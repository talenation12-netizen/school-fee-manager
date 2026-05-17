const express = require("express");
const PDFDocument = require("pdfkit");
const router = express.Router();

const auth = require("../middleware/auth");
const pool = require("../db");


// =====================================================
// 📄 PDF STUDENT STATEMENT
// GET /api/pdf/student-statement/:id
// =====================================================
router.get("/student-statement/:id", auth, async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const studentId = req.params.id;

    const studentRes = await pool.query(
      `
      SELECT * FROM students
      WHERE id = $1 AND school_id = $2
      `,
      [studentId, schoolId]
    );

    if (!studentRes.rows.length) {
      return res.status(404).json({ error: "Student not found" });
    }

    const student = studentRes.rows[0];

    const paymentsRes = await pool.query(
      `
      SELECT * FROM payments
      WHERE student_id = $1 AND school_id = $2
      ORDER BY created_at ASC
      `,
      [studentId, schoolId]
    );

    const doc = new PDFDocument({ margin: 40 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=statement-${studentId}.pdf`
    );

    doc.pipe(res);

    // HEADER
    doc.fontSize(20).text("SCHOOL FEE STATEMENT", { align: "center" });
    doc.moveDown();

    doc.fontSize(12).text(`Name: ${student.full_name}`);
    doc.text(`Admission: ${student.admission_number}`);
    doc.text(`Class: ${student.class_name}`);
    doc.moveDown();

    let balance =
      Number(student.expected_fees || 0) +
      Number(student.opening_balance || 0);

    doc.fontSize(14).text(`Opening Balance: ${balance}`);
    doc.moveDown();

    // TABLE HEADER
    doc.fontSize(12).text("Date | Receipt | Amount | Balance");
    doc.moveDown(0.5);

    // TRANSACTIONS
    paymentsRes.rows.forEach((p) => {
      balance -= Number(p.amount);

      doc.text(
        `${new Date(p.created_at).toDateString()} | ${p.receipt_number} | ${p.amount} | ${balance}`
      );
    });

    doc.moveDown();

    const status =
      balance > 0 ? "OWING" : balance < 0 ? "OVERPAID" : "PAID";

    doc.fontSize(14).text(`FINAL BALANCE: ${balance}`);
    doc.text(`STATUS: ${status}`);

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate PDF" });
  }
});


// =====================================================
// 🧾 PDF RECEIPT
// GET /api/pdf/receipt/:paymentId
// =====================================================
router.get("/receipt/:paymentId", auth, async (req, res) => {
  try {
    const paymentId = req.params.paymentId;
    const schoolId = req.user.schoolId;

    const paymentRes = await pool.query(
      `
      SELECT p.*, s.full_name, s.admission_number
      FROM payments p
      JOIN students s ON s.id = p.student_id
      WHERE p.id = $1 AND p.school_id = $2
      `,
      [paymentId, schoolId]
    );

    if (!paymentRes.rows.length) {
      return res.status(404).json({ error: "Payment not found" });
    }

    const p = paymentRes.rows[0];

    const doc = new PDFDocument();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=receipt-${paymentId}.pdf`
    );

    doc.pipe(res);

    doc.fontSize(20).text("PAYMENT RECEIPT", { align: "center" });
    doc.moveDown();

    doc.fontSize(12).text(`Receipt: ${p.receipt_number}`);
    doc.text(`Name: ${p.full_name}`);
    doc.text(`Admission: ${p.admission_number}`);
    doc.text(`Amount Paid: KES ${p.amount}`);
    doc.text(`Method: ${p.payment_method}`);
    doc.text(`Date: ${p.created_at}`);

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate receipt PDF" });
  }
});

module.exports = router;

