import dotenv from "dotenv";
dotenv.config(); // Carica variabili da .env

import express from "express";
import cookieParser from "cookie-parser";
import { ethers, Wallet } from "ethers";
import fs from "fs";
import path from "path";
import swaggerUi from "swagger-ui-express";
import yaml from "yaml";
import axios from "axios";
import os from "os";

// Blob compatibile con ESM
import { Blob } from "fetch-blob/from.js";
globalThis.Blob = Blob;

// FormData compatibile
import FormDataPkg from "form-data";
globalThis.FormData = FormDataPkg;

import lighthouse from "@lighthouse-web3/sdk";
const app = express();
app.use(express.json());
app.use(cookieParser());
/**
 * Setup documentazione API con Swagger
 */
const swaggerDocument = yaml.parse(fs.readFileSync("./swagger.yaml", "utf8"));
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
/**
 * Lettura variabili di ambiente necessarie
 */
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const ANKR_RPC = process.env.ANKR_RPC_URL;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const WEB3_STORAGE_TOKEN = process.env.WEB3_STORAGE_TOKEN;

if (!ANKR_RPC || !PRIVATE_KEY || !CONTRACT_ADDRESS || !WEB3_STORAGE_TOKEN) {
  console.error("Errore: variabili .env mancanti.");
  process.exit(1);
}

/**
 * Configurazione provider e wallet
 */
const provider = new ethers.JsonRpcProvider(ANKR_RPC);
const signer = new Wallet(PRIVATE_KEY, provider);

/**
 * Carica l'ABI del contratto
 */
import { fileURLToPath } from "url";
import { dirname } from "path";
import { spawn } from "child_process";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ABI_PATH = path.join(__dirname, "contracts", "JetCVNFT.abi.json");
if (!fs.existsSync(ABI_PATH)) {
  console.error("Errore: ABI non trovato");
  process.exit(1);
}
const ABI = JSON.parse(fs.readFileSync(ABI_PATH, "utf8"));
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

/**
 * Upload via nuovo SDK Web3.Storage
 */
async function uploadToWeb3StorageFromUrl(fileUrl, filename) {
  const apiKey = process.env.WEB3_STORAGE_TOKEN;
  if (!apiKey) {
    throw new Error("❗️WEB3_STORAGE_TOKEN non definita in .env");
  }

  // ✅ Verifica URL valido
  try {
    new URL(fileUrl);
  } catch {
    throw new Error(`❌ URL non valido: ${fileUrl}`);
  }

  try {
    // 🔽 Scarica il file remoto
    const response = await axios.get(fileUrl, { responseType: "arraybuffer" });
    const buffer = Buffer.from(response.data);

    // 📝 Salva localmente come cv.png nella root del progetto
    const localPath = path.join(process.cwd(), "cv.png");
    fs.writeFileSync(localPath, buffer);

    if (!fs.existsSync(localPath)) {
      console.log("errore file non creato");
    } else {
      const child = spawn("node", ["upload.js", "cv.png"], {
        stdio: "inherit", // stampa stdout/stderr direttamente nella console
      });

      // Gestione errori child process
      child.on("error", (err) => {
        console.error("❌ Errore durante l’esecuzione dello script:", err);
      });

      child.on("exit", (code) => {
        console.log(`📦 Processo terminato con codice: ${code}`);
      });
    }
  } catch (err) {
    console.log("errore: " + err.toString());
  }
}
/**
 * 🔐 Crea un nuovo wallet
 */
app.post("/api/wallet/create", async (req, res) => {
  try {
    const wallet = Wallet.createRandom();
    res.json({
      address: wallet.address,
      privateKey: wallet.privateKey,
      mnemonic: wallet.mnemonic.phrase,
    });
  } catch {
    res.status(500).json({ error: "Errore nella creazione del wallet" });
  }
});

/**
 * 💰 Saldo MATIC
 */
app.get("/api/wallet/:address/balance", async (req, res) => {
  try {
    const balanceWei = await provider.getBalance(req.params.address);
    const balance = ethers.formatUnits(balanceWei, 18);
    res.json({ balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 📦 Token ERC20 (es. MATIC)
 */
app.get("/api/token/:address", async (req, res) => {
  try {
    const balanceWei = await provider.getBalance(req.params.address);
    const balance = ethers.formatUnits(balanceWei, 18);
    res.json([{ token: "MATIC", balance }]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 🖼️ Leggi NFT per address
 */
app.get("/api/nft/:address", async (req, res) => {
  try {
    const tokenId = await contract.userTokenId(req.params.address);
    if (tokenId == 0) return res.json({ nfts: [] });
    const uri = await contract.tokenURI(tokenId);
    res.json({ nfts: [{ tokenId: tokenId.toString(), uri }] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 🧾 Mint NFT con caricamento IPFS
 */
app.post("/api/cv/mint", async (req, res) => {
  const { address, uri } = req.body;
  if (!address || !uri) {
    return res
      .status(400)
      .json({ error: "Campi 'address' e 'uri' obbligatori" });
  }

  try {
    const filename = `cv-${Date.now()}.json`;
    await uploadToWeb3StorageFromUrl(uri, filename);
    const tx = await contract.mintTo(address, uri);
    await tx.wait();
    const tokenId = await contract.userTokenId(address);
    res.json({
      message: "Mint completato",
      tokenId: tokenId.toString(),
      txHash: tx.hash,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * ✏️ Update NFT (aggiorna URI puntando a un nuovo file IPFS)
 */
app.post("/api/cv/:tokenId/update", async (req, res) => {
  const { tokenId } = req.params;
  const { user, newURI } = req.body;
  if (!user || !newURI) {
    return res
      .status(400)
      .json({ error: "Campi 'user' e 'newURI' obbligatori" });
  }

  try {
    const filename = `cv-updated-${Date.now()}.json`;
    const ipfsUri = await uploadToWeb3StorageFromUrl(newURI, filename);
    const tx = await contract.updateTokenURI(user, ipfsUri);
    await tx.wait();
    res.json({ message: "CV aggiornato", tokenId, ipfsUri });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 🔎 Verifica se un utente ha già un JetCV
 */
app.get("/api/user/:address/hasJetCV", async (req, res) => {
  try {
    const result = await contract.hasJetCV(req.params.address);
    res.json({ address: req.params.address, hasJetCV: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 📌 Ottieni tokenId di un utente
 */
app.get("/api/user/:address/tokenId", async (req, res) => {
  try {
    const tokenId = await contract.userTokenId(req.params.address);
    res.json({ address: req.params.address, tokenId: tokenId.toString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 📜 Dettaglio certificazione specifica (certifications[tokenId][certIndex])
 */
app.get("/api/certifications/:tokenId/:certIndex", async (req, res) => {
  const { tokenId, certIndex } = req.params;
  try {
    const cert = await contract.certifications(tokenId, certIndex);
    res.json({
      certURI: cert.certURI,
      issuer: cert.issuer,
      legalEntity: cert.legalEntity,
      approved: cert.approved,
      timestamp: cert.timestamp.toString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 🧾 Chi è approvato per un token
 */
app.get("/api/token/:tokenId/approved", async (req, res) => {
  try {
    const approvedAddress = await contract.getApproved(req.params.tokenId);
    res.json({ tokenId: req.params.tokenId, approved: approvedAddress });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 👤 Chi è il proprietario di un token
 */
app.get("/api/token/:tokenId/owner", async (req, res) => {
  try {
    const owner = await contract.ownerOf(req.params.tokenId);
    res.json({ tokenId: req.params.tokenId, owner });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 🧾 Proponi una certificazione
 */
app.post("/api/cv/:tokenId/certification/propose", async (req, res) => {
  const { tokenId } = req.params;
  const { user, certURI, legalEntity } = req.body;
  if (!user || !certURI || !legalEntity) {
    return res.status(400).json({ error: "Campi obbligatori mancanti" });
  }

  try {
    const tx = await contract.draftCertification(user, certURI, legalEntity);
    const receipt = await tx.wait();
    res.json({
      message: "Certificazione proposta",
      tokenId,
      txHash: receipt.transactionHash,
    });
  } catch (err) {
    res.status(500).json({ error: err.reason || err.message });
  }
});

/**
 * ✅ Approva una certificazione
 */
app.post("/api/cv/:tokenId/certification/approve", async (req, res) => {
  const { certIndex } = req.body;
  if (certIndex === undefined) {
    return res.status(400).json({ error: "Campo 'certIndex' obbligatorio" });
  }

  try {
    const tx = await contract.approveCertification(certIndex);
    await tx.wait();
    res.json({
      message: "Certificazione approvata",
      certIndex,
      txHash: tx.hash,
    });
  } catch (err) {
    res.status(500).json({ error: err.reason || err.message });
  }
});

/**
 * ⏱️ Configura delay approvazione
 */
app.post("/api/settings/minApprovalDelay", async (req, res) => {
  const { delay } = req.body;
  if (delay === undefined) {
    return res.status(400).json({ error: "'delay' è obbligatorio" });
  }

  try {
    const tx = await contract.setMinApprovalDelay(delay);
    await tx.wait();
    res.json({ message: "Delay aggiornato", delay });
  } catch (err) {
    res.status(500).json({ error: err.reason || err.message });
  }
});

app.get("/api/user/:address/hasCV", async (req, res) => {
  try {
    const hasCV = await contract.hasCV(req.params.address);
    res.json({ address: req.params.address, hasCV });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 🔎 Ottieni tutte le certificazioni associate a un utente
 */
app.get("/api/certifications/:address", async (req, res) => {
  try {
    const tokenId = await contract.userTokenId(req.params.address);
    const certificationsCount = await contract.getCertificationCount(tokenId);

    const certifications = [];

    for (let i = 0; i < certificationsCount; i++) {
      const cert = await contract.certifications(tokenId, i);
      certifications.push({
        certURI: cert.certURI,
        issuer: cert.issuer,
        legalEntity: cert.legalEntity,
        approved: cert.approved,
        timestamp: cert.timestamp.toString(),
      });
    }

    res.json({ address: req.params.address, certifications });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/user/:address/last-cert-approval", async (req, res) => {
  try {
    const lastApproval = await contract.lastCertApproval(req.params.address);
    res.json({
      address: req.params.address,
      lastApproval: lastApproval.toString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/settings/minApprovalDelay", async (_req, res) => {
  try {
    const delay = await contract.minApprovalDelay();
    res.json({ minApprovalDelay: delay.toString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
/**
 * 📄 Dettagli NFT (owner, URI, certificazioni)
 */
app.get("/api/cv/:tokenId", async (req, res) => {
  const { tokenId } = req.params;

  try {
    const [owner, uri, certifications] = await Promise.all([
      contract.ownerOf(tokenId),
      contract.tokenURI(tokenId),
      contract.getCertifications(tokenId),
    ]);

    res.json({ tokenId, owner, uri, certifications });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 🌐 Servizio frontend statico
 */
app.use(express.static(path.join(__dirname, "ui")));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "ui", "index.html"));
});

/**
 * 🚀 Avvia il server
 */
const startServer = () => {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server avviato su http://localhost:${PORT}`);
    console.log(`Contratto JetCVNFT: ${CONTRACT_ADDRESS}`);
  });
};

startServer();
