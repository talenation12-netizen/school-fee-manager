const express = require("express");
const cors = require("cors");

const app = express();

// =====================
// MIDDLEWARE
// =====================
app.use(cors());
app.use(express.json());

// =====================
// IMPORT ROUTES
// =====================
const authRoutes = require("./routes/auth");
const studentRoutes = require("./routes/students");
const paymentRoutes = require("./routes/payments");
const reportRoutes = require("./routes/reports");
const receiptRoutes = require("./routes/receipts");
const eventRoutes = require("./routes/events");
const pdfRoutes = require("./routes/pdf");
const ledgerRoutes = require("./routes/ledger");
const statementRoutes = require("./routes/statements");
const settingsRoutes = require("./routes/settings.routes");

// AUTH MIDDLEWARE
const auth = require("./middleware/auth");

// =====================
// PUBLIC ROUTES
// =====================
app.use("/api/auth", authRoutes);

// =====================
// PROTECTED ROUTES (CLEAN LAYER)
// =====================
app.use("/api/students", auth, studentRoutes);
app.use("/api/payments", auth, paymentRoutes);
app.use("/api/reports", auth, reportRoutes);
app.use("/api/receipts", auth, receiptRoutes);
app.use("/api/events", auth, eventRoutes);
app.use("/api/pdf", auth, pdfRoutes);
app.use("/api/ledger", auth, ledgerRoutes);
app.use("/api/statements", auth, statementRoutes);
app.use("/api/settings", auth, settingsRoutes);

// =====================
// HEALTH CHECK
// =====================
app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "API running",
  });
});

// =====================
// START SERVER
// =====================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});

module.exports = app;