import express from "express";
import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();
const { Pool } = pkg;
const router = express.Router();

// 🛠️ Connessione a PostgreSQL su Amazon RDS
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 5432,
  ssl: { rejectUnauthorized: false },
});

// 🟢 Crea un nuovo utente
router.post("/", async (req, res) => {
  const { name = "", email = "", password = "" } = req.body || {};

  console.log(name, email, password);
  if (!name.trim() || !email.trim() || !password.trim()) {
    return res.status(400).json({ error: "Tutti i campi sono obbligatori" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO users (name, email, password)
       VALUES ($1, $2, $3)
       RETURNING id, name, email`,
      [name, email, password],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Errore creazione utente:", err.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// 🔵 Leggi tutti gli utenti
router.get("/", async (_req, res) => {
  try {
    const result = await pool.query(`SELECT id, name, email FROM users`);
    res.json(result.rows);
  } catch (err) {
    console.error("Errore lettura utenti:", err.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// 🟠 Leggi singolo utente
router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: "ID non valido" });
  }

  try {
    const result = await pool.query(
      `SELECT id, name, email FROM users WHERE id = $1`,
      [id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Utente non trovato" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Errore lettura utente:", err.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// 🟡 Aggiorna utente
router.put("/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: "ID non valido" });
  }

  const { name = "", email = "", password = "" } = req.body || {};
  if (!name.trim() || !email.trim() || !password.trim()) {
    return res.status(400).json({ error: "Tutti i campi sono obbligatori" });
  }

  try {
    const result = await pool.query(
      `UPDATE users
       SET name = $1, email = $2, password = $3
       WHERE id = $4
       RETURNING id, name, email`,
      [name, email, password, id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Utente non trovato" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Errore aggiornamento utente:", err.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// 🔴 Elimina utente
router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: "ID non valido" });
  }

  try {
    const result = await pool.query(`DELETE FROM users WHERE id = $1`, [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Utente non trovato" });
    }
    res.json({ message: "Utente eliminato con successo" });
  } catch (err) {
    console.error("Errore eliminazione utente:", err.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

export default router;
