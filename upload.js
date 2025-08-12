import lighthouse from "@lighthouse-web3/sdk";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

// Polyfill per FormData in Node.js
if (typeof globalThis.FormData === "undefined") {
  try {
    // Import sincrono per FormData
    const FormDataModule = await import("form-data");
    globalThis.FormData = FormDataModule.default;
  } catch (err) {
    console.error("❌ Errore caricamento form-data:", err.message);
    process.exit(1);
  }
}

dotenv.config();

async function main() {
  const apiKey = process.env.LIGHTHOUSE_API_KEY;
  const filePath = process.argv[2];

  if (!apiKey) {
    console.error("❌ LIGHTHOUSE_API_KEY mancante nel file .env");
    process.exit(1);
  }

  if (!filePath || !fs.existsSync(filePath)) {
    console.error("❌ Specificare un file esistente da caricare");
    process.exit(1);
  }

  try {
    console.log(`⏫ Upload di ${filePath} su Lighthouse...`);
    const result = await lighthouse.upload(filePath, apiKey);
    const cid = result?.data?.Hash;

    if (!cid) {
      throw new Error("CID mancante nella risposta");
    }

    console.log("✅ Upload completato!");
    console.log(`🔗 CID: ${cid}`);
    console.log(`🌐 https://gateway.lighthouse.storage/ipfs/${cid}`);
  } catch (err) {
    console.error("❌ Errore durante l'upload:", err.message);
  }
}

// Esegui la funzione principale
main().catch((err) => {
  console.error("❌ Errore fatale:", err.message);
  process.exit(1);
});
