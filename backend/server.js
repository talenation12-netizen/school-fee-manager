const express = require("express");
const cors = require("cors");

const app = express();

const authRoutes = require("./routes/auth");
const studentRoutes = require("./routes/students");
const paymentRoutes = require("./routes/payments");
const reportRoutes = require("./routes/reports");
const receiptRoutes = require("./routes/receipts");
const eventRoutes = require("./routes/events");
const pdfRoutes = require("./routes/pdf");
const ledgerRoutes = require("./routes/ledger");
const statementRoutes = require("./routes/statements");

// =====================
// MIDDLEWARE
// =====================
app.use(cors());
app.use(express.json());
app.use("/api/payments", require("./routes/payments"));
app.use("/api/receipts", receiptRoutes);
app.use("/api/pdf", pdfRoutes);
app.use("/api/students", statementRoutes);
app.use("/api/ledger", ledgerRoutes);
app.use("/api/statements", statementRoutes);
// =====================
// PUBLIC ROUTES (NO AUTH HERE)
// =====================
app.use("/api/auth", authRoutes);

// =====================
// PROTECTED ROUTES (AUTH INSIDE ROUTES ONLY)
// =====================
app.use("/api/students", studentRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/receipts", receiptRoutes);
app.use("/api/events", eventRoutes);

// =====================
// HEALTH CHECK
// =====================
app.get("/", (req, res) => {
  res.json({ ok: true, message: "API running" });
});

// =====================
// START SERVER
// =====================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});