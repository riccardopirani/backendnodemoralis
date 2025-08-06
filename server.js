import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cookieParser from "cookie-parser";
import { ethers, Wallet } from "ethers";
import fs from "fs";
import path from "path";
import cors from "cors";
import axios from "axios";
import swaggerUi from "swagger-ui-express";
import yaml from "yaml";
import walletPrismaRoutes from "./controllers/WalletPrisma.js";
import crypto from "crypto";
import { fileURLToPath } from "url";
import complycubeClient from "./complycubeClient.js";
import { dirname } from "path";
import { spawn } from "child_process";
import { exec } from "child_process";
import util from "util";
const execAsync = util.promisify(exec);

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use("/api/wallets", walletPrismaRoutes);

const swaggerDocument = yaml.parse(fs.readFileSync("./swagger.yaml", "utf8"));
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const ANKR_RPC = process.env.ANKR_RPC_URL;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const WEB3_STORAGE_TOKEN = process.env.WEB3_STORAGE_TOKEN;

if (!ANKR_RPC || !PRIVATE_KEY || !CONTRACT_ADDRESS || !WEB3_STORAGE_TOKEN) {
  console.error("Errore: variabili .env mancanti.");
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(ANKR_RPC);
const signer = new Wallet(PRIVATE_KEY, provider);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ABI_PATH = path.join(__dirname, "contracts", "JetCVNFT.abi.json");

if (!fs.existsSync(ABI_PATH)) {
  console.error("Errore: ABI non trovato");
  process.exit(1);
}

const ABI = JSON.parse(fs.readFileSync(ABI_PATH, "utf8"));
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

// ======================== AUTH ========================

// Crea un cliente su ComplyCube
app.post("/api/auth/create-client", async (req, res) => {
  try {
    const { firstName, lastName, email } = req.body;

    const client = await complycubeClient.create({
      type: "person",
      email,
      personDetails: {
        firstName,
        lastName,
      },
    });

    res.json({ message: "Cliente creato", client });
  } catch (err) {
    console.error("Errore creazione client:", err);
    res.status(500).json({ error: err.message });
  }
});

// Ottieni un client esistente
app.get("/api/auth/client/:id", async (req, res) => {
  try {
    const client = await complycubeClient.get(req.params.id);
    res.json(client);
  } catch (err) {
    console.error("Errore fetch client:", err);
    res.status(500).json({ error: err.message });
  }
});

// Genera un token di sessione per verifiche (usato per SDK frontend)
app.post("/api/auth/session-token", async (req, res) => {
  try {
    const { clientId } = req.body;

    const session = await complycube.session.create({
      clientId,
      checks: ["document", "facial"], // tipi di check
    });

    res.json({ token: session.token });
  } catch (err) {
    console.error("Errore session token:", err);
    res.status(500).json({ error: err.message });
  }
});
function decryptPrivateKey({ iv, encrypted, tag }, secret) {
  const key = Buffer.from(secret, "base64");
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(iv, "hex")
  );
  decipher.setAuthTag(Buffer.from(tag, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encrypted, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

export async function downloadAndDecryptFromUrl(
  fileUrl,
  outputName = "cv_decrypted.png"
) {
  let encryptionKey;
  try {
    const secret = await secretClient.getSecret("encryption-key");
    encryptionKey = secret.value;
  } catch {
    throw new Error("❗️ENCRYPTION_KEY non trovata su Azure Key Vault.");
  }
}
async function uploadToWeb3StorageFromUrl(fileUrl, filename) {
  try {
    new URL(fileUrl);
  } catch {
    throw new Error(`❌ URL non valido: ${fileUrl}`);
  }

  try {
    const response = await axios.get(fileUrl, { responseType: "arraybuffer" });
    const encPath = path.join(process.cwd(), filename);
    fs.writeFileSync(encPath, response.data);

    if (!fs.existsSync(encPath)) {
      console.error("❌ Errore: file criptato non creato");
      return;
    }

    const child = spawn("node", ["upload.js", filename], {
      stdio: "inherit",
    });

    child.on("error", (err) => {
      console.error("❌ Errore durante l’esecuzione dello script:", err);
    });

    child.on("exit", (code) => {
      console.log(`📦 Processo terminato con codice: ${code}`);
    });
  } catch (err) {
    console.error("❌ Errore:", err.message);
    throw err;
  }
}

app.post("/api/decrypt", async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: "Campo 'url' obbligatorio" });
  }
  try {
    const filePath = await downloadAndDecryptFromUrl(url, "cv_decrypted.png");

    res.download(filePath, "cv_decrypted.png", (err) => {
      if (err) {
        console.error("Errore durante il download:", err.message);
        res.status(500).json({ error: "Errore nel download del file" });
      } else {
        fs.unlink(filePath, () => {});
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}); // <-- CHIUSURA MANCANTE

// ======================== WALLET ========================

app.post("/api/wallet/create", async (req, res) => {
  const wallet = Wallet.createRandom();
  const walletId = wallet.address;
  const encryptedPrivateKey = wallet.privateKey;
  const mnemonic = wallet.mnemonic.phrase;

  console.log("Nuovo wallet creato:", walletId);
  console.log("Chiave privata:", encryptedPrivateKey);
  console.log("Mnemonic:", mnemonic);

  let scriptError = false;
  let output = "";

  try {
    const scriptPath = path.join(__dirname, "code-token.sh");
    const cmd = `bash ${scriptPath} ${walletId} '${encryptedPrivateKey}' '${mnemonic}'`;

    const { stdout, stderr } = await execAsync(cmd);
    output = stdout;

    if (stderr && stderr.trim() !== "") {
      console.error("Errore shell:", stderr);
      scriptError = true;
    }
  } catch (err) {
    console.error("Errore esecuzione script:", err.message);
    scriptError = true;
  }

  // 🔑 Risposta sempre restituita, anche se script fallisce
  res.json({
    address: wallet.address,
    privateKey: wallet.privateKey,
    mnemonic: wallet.mnemonic.phrase,
  });
});

app.get("/api/wallet/:address/balance", async (req, res) => {
  try {
    const walletId = req.params.address;
    const scriptPath = path.join(__dirname, "decode-token.sh");

    // Esegui lo script
    const { stdout, stderr } = await execAsync(
      `bash ${scriptPath} ${walletId}`
    );

    if (stderr) {
      console.error("Errore shell:", stderr);
      return res
        .status(500)
        .json({ error: "Errore durante la lettura del segreto" });
    }

    // L'output di read_secret.sh contiene gli attributi JSON
    // Cerchiamo il nodo specifico "wallet-<ID>"
    const match = stdout.match(
      new RegExp(`"wallet-${walletId}"\\s*:\\s*"(.*?)"`)
    );

    if (!match) {
      return res.status(404).json({ error: "Wallet non trovato in Keycloak" });
    }

    // Decodifica la stringa JSON interna
    const secretJson = JSON.parse(match[1].replace(/\\"/g, '"'));

    res.json({
      address: walletId,
      encryptedPrivateKey: secretJson.encryptedPrivateKey,
      mnemonic: secretJson.mnemonic,
    });
  } catch (err) {
    console.error("Errore API wallet:", err);
    res.status(500).json({ error: "Errore interno" });
  }
});
app.get("/api/token/:address", async (req, res) => {
  try {
    const balanceWei = await provider.getBalance(req.params.address);
    const balance = ethers.formatUnits(balanceWei, 18);
    res.json([{ token: "MATIC", balance }]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================== NFT ========================

app.get("/api/user/:address/hasJetCV", async (req, res) => {
  try {
    const result = await contract.hasJetCV(req.params.address);
    res.json({ address: req.params.address, hasJetCV: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/user/:address/hasCV", async (req, res) => {
  try {
    const result = await contract.hasCV(req.params.address);
    res.json({ address: req.params.address, hasCV: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/user/:address/tokenId", async (req, res) => {
  try {
    const tokenId = await contract.userTokenId(req.params.address);
    res.json({ address: req.params.address, tokenId: tokenId.toString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/cv/:tokenId", async (req, res) => {
  try {
    const [owner, uri, certifications] = await Promise.all([
      contract.ownerOf(req.params.tokenId),
      contract.tokenURI(req.params.tokenId),
      contract.getCertifications(req.params.tokenId),
    ]);
    res.json({ tokenId: req.params.tokenId, owner, uri, certifications });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/cv/mint", async (req, res) => {
  const { address, uri, userIdHash } = req.body;
  if (!address || !uri || !userIdHash)
    return res.status(400).json({ error: "Dati mancanti" });

  try {
    const tx = await contract.mintTo(address, uri, userIdHash);
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

app.post("/api/cv/:tokenId/update", async (req, res) => {
  const { user, newURI } = req.body;
  if (!user || !newURI)
    return res
      .status(400)
      .json({ error: "Campi 'user' e 'newURI' obbligatori" });

  try {
    const ipfsUri = await uploadToWeb3StorageFromUrl(
      newURI,
      `cv-${Date.now()}.json`
    );
    const tx = await contract.updateTokenURI(user, ipfsUri);
    await tx.wait();
    res.json({ message: "CV aggiornato", ipfsUri });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/cv/all-tokenIds", async (_req, res) => {
  try {
    const tokenIds = await contract.getAllTokenIds();
    res.json({ tokenIds: tokenIds.map((id) => id.toString()) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================== CERTIFICAZIONI ========================

app.get("/api/certifications/:address", async (req, res) => {
  try {
    const tokenId = await contract.userTokenId(req.params.address);
    const certifications = await contract.getCertifications(tokenId);
    res.json({ address: req.params.address, certifications });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/cv/:tokenId/certification/propose", async (req, res) => {
  const { user, certURI, legalEntity } = req.body;
  try {
    const tx = await contract.draftCertification(user, certURI, legalEntity);
    await tx.wait();
    res.json({ message: "Certificazione proposta", txHash: tx.hash });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/cv/:tokenId/certification/approve", async (req, res) => {
  const { certIndex } = req.body;
  try {
    const tx = await contract.approveCertification(certIndex);
    await tx.wait();
    res.json({ message: "Certificazione approvata", txHash: tx.hash });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/cv/:tokenId/certification/reject", async (req, res) => {
  const { certIndex, reason } = req.body;
  try {
    const tx = await contract.rejectCertification(certIndex, reason);
    await tx.wait();
    res.json({ message: "Certificazione rifiutata", txHash: tx.hash });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================== SETTINGS ========================

app.get("/api/settings/minApprovalDelay", async (_req, res) => {
  try {
    const delay = await contract.minApprovalDelay();
    res.json({ minApprovalDelay: delay.toString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/settings/minApprovalDelay", async (req, res) => {
  const { delay } = req.body;
  try {
    const tx = await contract.setMinApprovalDelay(delay);
    await tx.wait();
    res.json({ message: "Delay aggiornato", delay });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get("/api/wallet/:address/balance", async (req, res) => {
  try {
    const { address } = req.params;

    const balanceWei = await provider.getBalance(address);

    const balance = ethers.formatUnits(balanceWei, 18);

    res.json({ address, balance });
  } catch (err) {
    console.error("Errore API balance:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api-docs.json", (req, res) => {
  const yamlDoc = fs.readFileSync("./swagger.yaml", "utf8");
  const jsonDoc = yaml.parse(yamlDoc);
  res.json(jsonDoc);
});
app.use(express.static(path.join(__dirname, "ui")));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "ui", "index.html"));
});
const PORT = process.env.PORT || 4000;

app.listen(PORT);
