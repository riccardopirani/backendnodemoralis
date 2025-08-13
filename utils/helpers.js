import fs from "fs";
import path from "path";
import lighthouse from "@lighthouse-web3/sdk";
import { IPFS_CONFIG } from "../config/constants.js";

export async function uploadToWeb3StorageFromUrl(jsonData, filename) {
  try {
    const tempDir = path.join(process.cwd(), "temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const filePath = path.join(tempDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2));

    const uploadResponse = await lighthouse.upload(
      filePath,
      IPFS_CONFIG.LIGHTHOUSE_API_KEY,
    );

    fs.unlinkSync(filePath);

    if (uploadResponse && uploadResponse.data && uploadResponse.data.Hash) {
      const cid = uploadResponse.data.Hash;
      return {
        success: true,
        cid,
        ipfsUrl: `ipfs://${cid}`,
        gatewayUrl: `https://gateway.lighthouse.storage/ipfs/${cid}`,
        error: null,
      };
    } else {
      return {
        success: false,
        cid: null,
        ipfsUrl: null,
        gatewayUrl: null,
        error: "Upload fallito - risposta non valida",
      };
    }
  } catch (error) {
    console.error("Errore upload IPFS:", error);
    return {
      success: false,
      cid: null,
      ipfsUrl: null,
      gatewayUrl: null,
      error: error.message,
    };
  }
}

import crypto from "crypto";

export function generateVeriffSignature(data, privateKey) {
  const payload = JSON.stringify(data);
  return crypto.createHmac("sha256", privateKey).update(payload).digest("hex");
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
