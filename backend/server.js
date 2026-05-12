const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// HEALTH CHECK (ROOT)
app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "School Fee Manager API is running"
  });
});

// ADD THIS (IMPORTANT)
app.get("/api", (req, res) => {
  res.json({
    ok: true,
    message: "API working"
  });
});

// ROUTES (CRITICAL)
app.use("/api/auth", require("./routes/auth"));
app.use("/api/payments", require("./routes/payments"));
app.use("/api/events", require("./routes/events"));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});