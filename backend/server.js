const express = require("express");
const pool = require("./db");
const { PORT } = require("./config");

const app = express();
app.use(express.json());

// routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/events", require("./routes/events"));
app.use("/api/payments", require("./routes/payments"));

// health check
app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "School Fee Manager API is running"
  });
});

// DB init
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      school_id TEXT,
      amount INT,
      method TEXT,
      reference TEXT UNIQUE,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
}

initDB().then(() => {
  app.listen(PORT, () => {
    console.log("🚀 SaaS backend running on port", PORT);
  });
});