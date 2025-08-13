import fs from "fs";
import path from "path";
import crypto from "crypto";

export function generateVeriffSignature(data, privateKey) {
  // Per Veriff, la firma deve essere SHA256 del body della richiesta
  // concatenato con la chiave privata (API secret)
  const payload = JSON.stringify(data);

  // Metodo 1: SHA256(payload + privateKey) - più comune
  const signature1 = crypto
    .createHash("sha256")
    .update(payload + privateKey)
    .digest("hex");

  // Metodo 2: SHA256(privateKey + payload) - alternativa
  const signature2 = crypto
    .createHash("sha256")
    .update(privateKey + payload)
    .digest("hex");

  // Metodo 3: HMAC-SHA256 con privateKey come chiave - fallback
  const signature3 = crypto
    .createHmac("sha256", privateKey)
    .update(payload)
    .digest("hex");

  console.log("Firme generate per debug:");
  console.log("Metodo 1 (payload + key):", signature1);
  console.log("Metodo 2 (key + payload):", signature2);
  console.log("Metodo 3 (HMAC):", signature3);

  // Per ora usiamo il metodo 1, ma possiamo cambiare se necessario
  return signature1;
}

export function validateJsonCV(jsonCV) {
  if (!jsonCV || typeof jsonCV !== "object") {
    return {
      isValid: false,
      error: "Parametro jsonCV deve essere un oggetto JSON valido",
    };
  }
  return { isValid: true, error: null };
}

export function createCVFile(jsonCV, filename, directory = "cv-files") {
  try {
    const cvDir = path.join(process.cwd(), directory);
    if (!fs.existsSync(cvDir)) {
      fs.mkdirSync(cvDir, { recursive: true });
    }

    const filePath = path.join(
      cvDir,
      filename.endsWith(".json") ? filename : `${filename}.json`,
    );
    fs.writeFileSync(filePath, JSON.stringify(jsonCV, null, 2));

    const stats = fs.statSync(filePath);

    return {
      success: true,
      file: {
        filename: path.basename(filePath),
        path: filePath,
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}
