import lighthouse from "@lighthouse-web3/sdk";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

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
