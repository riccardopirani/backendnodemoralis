import fs from "fs";
import pkg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Client } = pkg;

const client = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function syncDatabase() {
  try {
    await client.connect();

    const sql = fs.readFileSync("./db.sql", "utf-8");
    console.log("🔄 Sincronizzazione database...");

    await client.query(sql);

    console.log("✅ Database aggiornato correttamente.");
  } catch (err) {
    console.error("❌ Errore durante la sincronizzazione del DB:", err.message);
  } finally {
    await client.end();
  }
}

syncDatabase();
