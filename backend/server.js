const express = require("express");
const cors = require("cors");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "School Fee Manager API running"
  });
});

app.get("/api", (req, res) => {
  res.json({
    ok: true,
    message: "API working"
  });
});

// Routes (SAFE LOAD ONLY)
try {
  app.use("/api/auth", require("./routes/auth"));
  app.use("/api/students", require("./routes/students"));
  app.use("/api/payments", require("./routes/payments"));
  app.use("/api/reports", require("./routes/reports"));
  app.use("/api/receipts", require("./routes/receipts"));
  app.use("/api/events", require("./routes/events"));
} catch (err) {
  console.error("ROUTE LOAD ERROR:", err);
}

// 404
app.use((req, res) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({
      error: "API route not found"
    });
  }
});

// IMPORTANT FOR RENDER
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});