import fs from "fs";
import { createClient } from "./config/database.js";

const client = createClient();

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
