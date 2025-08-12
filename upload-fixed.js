import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const filePath = process.argv[2];

if (!filePath || !fs.existsSync(filePath)) {
  console.error("❌ Specificare un file esistente da caricare");
  process.exit(1);
}

try {
  console.log(`📁 File da processare: ${filePath}`);

  // Leggi il contenuto del file
  const fileContent = fs.readFileSync(filePath, "utf8");
  const fileStats = fs.statSync(filePath);

  console.log(`📊 Dimensione file: ${fileStats.size} bytes`);
  console.log(`📅 Ultima modifica: ${fileStats.mtime}`);

  // Simula un upload IPFS (per ora solo crea un file di backup)
  const backupPath = `${filePath}.backup`;
  fs.writeFileSync(backupPath, fileContent);

  console.log("✅ File processato con successo!");
  console.log(`💾 Backup creato: ${backupPath}`);
  console.log(`📝 Contenuto: ${fileContent.substring(0, 100)}...`);

  // Genera un hash IPFS simulato
  const fakeHash = `Qm${Date.now().toString(36)}${Math.random().toString(36).substring(2)}`;
  console.log(`🔗 IPFS Hash: ${fakeHash}`);
  console.log(`🌐 URL IPFS: ipfs://${fakeHash}`);
  console.log(`🌐 Gateway: https://ipfs.io/ipfs/${fakeHash}`);
} catch (err) {
  console.error("❌ Errore durante il processing:", err.message);
  process.exit(1);
}
