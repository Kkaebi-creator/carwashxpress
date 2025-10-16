const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const path = require("path");
const app = express();
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
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT ? parseInt(process.env.MYSQLPORT) : 3306,
});

db.connect((err) => {
  if (err) throw err;
  console.log("Connected to MySQL database");
});

// Create reservation
app.post("/api/reserve", (req, res) => {
  const { name, email, phone, service, date, time } = req.body;
  db.query(
    "INSERT INTO reservations (name, email, phone, service, date, time) VALUES (?, ?, ?, ?, ?, ?)",
    [name, email, phone, service, date, time],
    function (err, result) {
      if (err) return res.status(500).json({ error: err.message });
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
