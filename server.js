import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cookieParser from "cookie-parser";
import { ethers, Wallet } from "ethers";
import fs from "fs";
import path from "path";
import swaggerUi from "swagger-ui-express";
import yaml from "yaml";
import { DefaultAzureCredential } from "@azure/identity";
import { SecretClient } from "@azure/keyvault-secrets";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { exec } from "child_process";
import util from "util";
const execAsync = util.promisify(exec);
const app = express();
app.use(express.json());
app.use(cookieParser());

const swaggerDocument = yaml.parse(fs.readFileSync("./swagger.yaml", "utf8"));
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const ANKR_RPC = process.env.ANKR_RPC_URL;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const WEB3_STORAGE_TOKEN = process.env.WEB3_STORAGE_TOKEN;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

const keyVaultName = process.env.AZURE_KEY_VAULT_NAME;
const credential = new DefaultAzureCredential();
const vaultUrl = `https://${keyVaultName}.vault.azure.net`;
const secretClient = new SecretClient(vaultUrl, credential);

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

function encryptPrivateKey(privateKey, secret) {
  const iv = crypto.randomBytes(12);
  const key = Buffer.from(secret, "base64");
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(privateKey, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return {
    iv: iv.toString("hex"),
    encrypted: encrypted.toString("hex"),
    tag: tag.toString("hex"),
  };
}

function decryptPrivateKey({ iv, encrypted, tag }, secret) {
  const key = Buffer.from(secret, "base64");
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(iv, "hex"),
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
  outputName = "cv_decrypted.png",
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
  const apiKey = process.env.WEB3_STORAGE_TOKEN;

  try {
    new URL(fileUrl); // Verifica URL valido
  } catch {
    throw new Error(`❌ URL non valido: ${fileUrl}`);
  }

  try {
    const response = await axios.get(fileUrl, { responseType: "arraybuffer" });
    const buffer = Buffer.from(response.data);

    // Salva come cv.enc.png
    const encPath = path.join(process.cwd(), "cv.enc.png");
    fs.writeFileSync(encPath, encrypted);

    // Verifica file
    if (!fs.existsSync(encPath)) {
      console.error("❌ Errore: file criptato non creato");
      return;
    }

    // ▶️ Esegui upload.js con il file criptato
    const child = spawn("node", ["upload.js", "cv.enc.png"], {
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
/**
 * 🔓 Decripta un file IPFS criptato e lo restituisce
 */
app.post("/api/decrypt", async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: "Campo 'url' obbligatorio" });
  }
  try {
    const filePath = await downloadAndDecryptFromUrl(url, "cv_decrypted.png");

    // Invia file decifrato come allegato
    res.download(filePath, "cv_decrypted.png", (err) => {
      if (err) {
        console.error("Errore durante il download:", err.message);
        res.status(500).json({ error: "Errore nel download del file" });
      } else {
        // Pulizia opzionale
        fs.unlink(filePath, () => {});
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
    address: walletId,
    encryptionKey: encryptedPrivateKey,
    mnemonic,
    scriptError,
    output: scriptError ? null : output,
  });
});
app.get("/api/wallet/:address", async (req, res) => {
  try {
    const walletId = req.params.address;
    const scriptPath = path.join(__dirname, "decode-token.sh");

    // Esegui lo script
    const { stdout, stderr } = await execAsync(
      `bash ${scriptPath} ${walletId}`,
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
      new RegExp(`"wallet-${walletId}"\\s*:\\s*"(.*?)"`),
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

app.get("/api/wallet/:address", async (req, res) => {
  try {
    const secret = await secretClient.getSecret(`wallet-${req.params.address}`);
    const parsed = JSON.parse(secret.value);

    let decryptedPrivateKey = null;
    if (parsed.encryptedPrivateKey) {
      decryptedPrivateKey = decryptPrivateKey(
        parsed.encryptedPrivateKey,
        ENCRYPTION_KEY,
      );
    }

    res.json({
      address: req.params.address,
      privateKey: decryptedPrivateKey,
      mnemonic: parsed.mnemonic,
    });
  } catch (err) {
    res.status(404).json({ error: "Wallet non trovato in Key Vault" });
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

app.get("/api/user/:address/hasJetCV", async (req, res) => {
  try {
    const result = await contract.hasJetCV(req.params.address);
    res.json({ address: req.params.address, hasJetCV: result });
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
app.get("/api/wallet/:address/balance", async (req, res) => {
  try {
    const { address } = req.params;

    // Recupera saldo in Wei
    const balanceWei = await provider.getBalance(address);

    // Converte in MATIC (18 decimali)
    const balance = ethers.formatUnits(balanceWei, 18);

    res.json({ address, balance });
  } catch (err) {
    console.error("Errore API balance:", err);
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server avviato su http://localhost:${PORT}`);
});
