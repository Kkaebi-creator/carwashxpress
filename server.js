const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const path = require("path");
const app = express();

// Log all environment variables at startup
console.log("--- ENVIRONMENT VARIABLES ---");
console.log("MYSQLHOST:", process.env.MYSQLHOST);
console.log("MYSQLUSER:", process.env.MYSQLUSER);
console.log("MYSQLPASSWORD:", process.env.MYSQLPASSWORD);
console.log("MYSQLDATABASE:", process.env.MYSQLDATABASE);
console.log("MYSQLPORT:", process.env.MYSQLPORT);
console.log("-----------------------------");

// Health check endpoint
app.get("/api/ping", (req, res) => {
  res.json({ status: "ok" });
});

// Log uncaught exceptions and unhandled promise rejections
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection:", reason);
});

// Handle all OPTIONS requests for CORS preflight at the very top
app.options("*", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.sendStatus(200);
});

// Use CORS middleware with open config
app.use(cors());

const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(express.static(path.join(__dirname, "../")));

// Simple admin credentials (hardcoded for now)
const ADMIN_USER = "kkaebi";
const ADMIN_PASS = "admin123";

// Admin login endpoint
app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
});

// MySQL connection

const db = mysql.createConnection({
  host: process.env.MYSQLHOST || "mysql.railway.internal",
  user: process.env.MYSQLUSER || "root",
  password: process.env.MYSQLPASSWORD || "RGZJbgtpNYsCXNWzlPaPCZieHSyYffN", // Use your actual Railway password
  database: process.env.MYSQLDATABASE || "railway",
  port: process.env.MYSQLPORT ? parseInt(process.env.MYSQLPORT) : 3306,
});

db.connect((err) => {
  if (err) {
    console.error("MySQL connection error:", err);
    process.exit(1);
  }
  console.log("Connected to MySQL database");
});

// Create reservation
app.post("/api/reserve", (req, res) => {
  const { name, email, phone, service, date, time } = req.body;
  console.log("Incoming reservation request:", req.body);
  db.query(
    "INSERT INTO reservations (name, email, phone, service, date, time) VALUES (?, ?, ?, ?, ?, ?)",
    [name, email, phone, service, date, time],
    function (err, result) {
      if (err) {
        console.error("Reservation insert error:", err);
        return res.status(500).json({ error: err.message });
      }
      console.log("Reservation insert result:", result);
      res.json({ success: true, id: result.insertId });
    }
  );
});

// Get all reservations (admin)
app.get("/api/admin/reservations", (req, res) => {
  if (req.query.password !== "admin123") {
    return res.status(401).json({ error: "Unauthorized" });
  }
  db.query("SELECT * FROM reservations WHERE deleted = 0", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Mark reservation as completed
app.post("/api/admin/reservations/:id/complete", (req, res) => {
  if (req.body.password !== "admin123") {
    return res.status(401).json({ error: "Unauthorized" });
  }
  db.query("UPDATE reservations SET completed = 1 WHERE id = ?", [req.params.id], function (err, result) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Delete reservation
app.delete("/api/admin/reservations/:id", (req, res) => {
  if (req.body.password !== "admin123") {
    return res.status(401).json({ error: "Unauthorized" });
  }
  db.query("UPDATE reservations SET deleted = 1 WHERE id = ?", [req.params.id], function (err, result) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Get deleted reservations (admin)
app.get("/api/admin/deleted-reservations", (req, res) => {
  if (req.query.password !== "admin123") {
    return res.status(401).json({ error: "Unauthorized" });
  }
  db.query("SELECT * FROM reservations WHERE deleted = 1", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Restore deleted reservation
app.post("/api/admin/reservations/:id/restore", (req, res) => {
  if (req.body.password !== "admin123") {
    return res.status(401).json({ error: "Unauthorized" });
  }
  db.query("UPDATE reservations SET deleted = 0 WHERE id = ?", [req.params.id], function (err, result) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
