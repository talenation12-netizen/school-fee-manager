const express = require("express");
const cors = require("cors");

const app = express();

const reportsRoutes = require('./routes/reports');
const studentRoutes = require("./routes/students");

// Middleware
app.use(cors());
app.use(express.json());
app.use('/api/reports', reportsRoutes);
app.use("/api/students", studentRoutes);

// =====================
// HEALTH CHECK ROUTES
// =====================
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

// =====================
// SAFE ROUTE LOADER
// =====================
const loadRoute = (path, routePath) => {
  try {
    const route = require(routePath);
    app.use(path, route);
    console.log(`✅ Loaded route: ${path}`);
  } catch (err) {
    console.error(`❌ Failed to load route ${path}`);
    console.error(err.message);
  }
};

// =====================
// REGISTER ROUTES
// =====================
loadRoute("/api/auth", "./routes/auth");
loadRoute("/api/students", "./routes/students");
loadRoute("/api/payments", "./routes/payments");
loadRoute("/api/reports", "./routes/reports");
loadRoute("/api/receipts", "./routes/receipts");
loadRoute("/api/events", "./routes/events");

// =====================
// 404 HANDLER
// =====================
app.use((req, res) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({
      error: "API route not found"
    });
  }

  res.status(200).send("Server running");
});

// =====================
// START SERVER
// =====================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});