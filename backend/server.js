const express = require("express");
const cors = require("cors");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Root health check
app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "School Fee Manager API is running"
  });
});

// API health check
app.get("/api", (req, res) => {
  res.json({
    ok: true,
    message: "API working"
  });
});

// API Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/students", require("./routes/students"));
app.use("/api/payments", require("./routes/payments"));
app.use("/api/receipts", require("./routes/receipts"));
app.use("/api/events", require("./routes/events"));
app.use("/api/reports", require("./routes/reports"));
app.use("/api/fee-structures", require("./routes/feeStructures"));


app.use("/api/fee-structures", (req, res) => {
  res.json({ ok: true });
});
// 404 handler for unknown API routes
app.use("/api/*", (req, res) => {
  res.status(404).json({
    error: "API route not found"
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});