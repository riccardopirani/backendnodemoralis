import fs from "fs";
import path from "path";
import axios from "axios";
import crypto from "crypto";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

// Compatibilità __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function downloadAndDecryptFromUrl(
  fileUrl,
  outputName = "cv_decrypted.png",
) {
  const encryptionKey = process.env.ENCRYPTION_KEY;

  if (!encryptionKey || encryptionKey.length !== 32) {
    throw new Error(
      "❗️ENCRYPTION_KEY non valida. Deve essere lunga 32 caratteri.",
    );
  }

  try {
    new URL(fileUrl);
  } catch {
    throw new Error(`❌ URL non valido: ${fileUrl}`);
  }

  try {
    const response = await axios.get(fileUrl, { responseType: "arraybuffer" });
    const encryptedBuffer = Buffer.from(response.data);

    // Estrai l'IV (primi 16 byte)
    const iv = encryptedBuffer.subarray(0, 16);
    const encryptedData = encryptedBuffer.subarray(16);

    // Decifra con AES-256-CBC
    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      Buffer.from(encryptionKey),
      iv,
    );

    const decrypted = Buffer.concat([
      decipher.update(encryptedData),
      decipher.final(),
    ]);

    const outputPath = path.join(process.cwd(), outputName);
    fs.writeFileSync(outputPath, decrypted);

    console.log(`✅ File decriptato salvato come ${outputName}`);
    return outputPath;
  } catch (err) {
    console.error("❌ Errore durante la decriptazione:", err.message);
    throw err;
  }
}

downloadAndDecryptFromUrl(
  "https://gateway.lighthouse.storage/ipfs/bafkreigaxghrqo2k72hmdl4x75mm2jhv4ldpbwgjcxyugtsv2dg7d4krmq",
);
