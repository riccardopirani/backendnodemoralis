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

// Utility functions
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
      console.error("❌ Errore durante l'esecuzione dello script:", err);
    });

    child.on("exit", (code) => {
      console.log(`📦 Processo terminato con codice: ${code}`);
    });
  } catch (err) {
    console.error("❌ Errore:", err.message);
    throw err;
  }
}

// ======================== WALLET APIs ========================

app.post("/api/wallet/create", async (req, res) => {
  try {
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
      const scriptPath = path.join(__dirname, "script", "code-token.sh");
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

    res.json({
      address: wallet.address,
      privateKey: wallet.privateKey,
      mnemonic: wallet.mnemonic.phrase,
      scriptError,
      output,
    });
  } catch (err) {
    console.error("Errore creazione wallet:", err);
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

app.get("/api/wallet/:address/secret", async (req, res) => {
  try {
    const walletId = req.params.address;
    const scriptPath = path.join(__dirname, "script", "decode-token.sh");

    const { stdout, stderr } = await execAsync(
      `bash ${scriptPath} ${walletId}`
    );

    if (stderr) {
      console.error("Errore shell:", stderr);
      return res
        .status(500)
        .json({ error: "Errore durante la lettura del segreto" });
    }

    const match = stdout.match(
      new RegExp(`"wallet-${walletId}"\\s*:\\s*"(.*?)"`)
    );

    if (!match) {
      return res.status(404).json({ error: "Wallet non trovato in Keycloak" });
    }

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

// ======================== NFT MANAGEMENT APIs ========================

app.get("/api/nft/contract-info", async (req, res) => {
  try {
    const [name, symbol, version] = await Promise.all([
      contract.name(),
      contract.symbol(),
      contract.CONTRACT_VERSION(),
    ]);
    res.json({
      name,
      symbol,
      version,
      contractAddress: CONTRACT_ADDRESS,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/nft/user/:address/hasJetCV", async (req, res) => {
  try {
    const result = await contract.hasJetCV(req.params.address);
    res.json({ address: req.params.address, hasJetCV: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/nft/user/:address/hasCV", async (req, res) => {
  try {
    const result = await contract.hasCV(req.params.address);
    res.json({ address: req.params.address, hasCV: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/nft/user/:address/tokenId", async (req, res) => {
  try {
    const tokenId = await contract.userTokenId(req.params.address);
    res.json({ address: req.params.address, tokenId: tokenId.toString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/nft/token/:tokenId", async (req, res) => {
  try {
    const tokenId = req.params.tokenId;
    const [owner, uri, userIdHash] = await Promise.all([
      contract.ownerOf(tokenId),
      contract.tokenURI(tokenId),
      contract.userIdHash(tokenId),
    ]);
    res.json({ 
      tokenId, 
      owner, 
      uri, 
      userIdHash: userIdHash.toString() 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/nft/token/:tokenId/isMinted", async (req, res) => {
  try {
    const tokenId = req.params.tokenId;
    const isMinted = await contract.isMinted(tokenId);
    res.json({ tokenId, isMinted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/nft/token/:tokenId/owner", async (req, res) => {
  try {
    const tokenId = req.params.tokenId;
    const owner = await contract.ownerOf(tokenId);
    res.json({ tokenId, owner });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/nft/token/:tokenId/uri", async (req, res) => {
  try {
    const tokenId = req.params.tokenId;
    const uri = await contract.tokenURI(tokenId);
    res.json({ tokenId, uri });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/nft/user/:address/balance", async (req, res) => {
  try {
    const address = req.params.address;
    const balance = await contract.balanceOf(address);
    res.json({ address, balance: balance.toString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/nft/all-tokenIds", async (req, res) => {
  try {
    const tokenIds = await contract.getAllTokenIds();
    res.json({ tokenIds: tokenIds.map((id) => id.toString()) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/nft/all-tokens", async (req, res) => {
  try {
    const tokenIds = await contract.getAllTokenIds();
    const tokens = await Promise.all(
      tokenIds.map(async (tokenId) => {
        try {
          const [owner, uri, userIdHash] = await Promise.all([
            contract.ownerOf(tokenId),
            contract.tokenURI(tokenId),
            contract.userIdHash(tokenId),
          ]);
          return {
            tokenId: tokenId.toString(),
            owner,
            uri,
            userIdHash: userIdHash.toString(),
          };
        } catch (err) {
          return {
            tokenId: tokenId.toString(),
            error: err.message,
          };
        }
      })
    );
    res.json({ tokens });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================== MINTING APIs ========================

// Check gas balance for a wallet
app.get("/api/wallet/:address/gas-balance", async (req, res) => {
  try {
    const address = req.params.address;
    const balance = await provider.getBalance(address);
    const gasPrice = await provider.getFeeData();
    
    res.json({
      address,
      balance: balance.toString(),
      balanceEth: ethers.formatEther(balance),
      gasPrice: gasPrice.gasPrice?.toString() || "0",
      gasPriceGwei: gasPrice.gasPrice ? ethers.formatUnits(gasPrice.gasPrice, "gwei") : "0"
    });
  } catch (err) {
    console.error("Errore controllo gas:", err);
    res.status(500).json({ error: err.message });
  }
});

// Estimate gas for minting
app.post("/api/nft/mint/estimate-gas", async (req, res) => {
  const { walletAddress, userIdHash } = req.body;
  
  if (!walletAddress || !userIdHash) {
    return res.status(400).json({ 
      error: "Campi 'walletAddress' e 'userIdHash' obbligatori" 
    });
  }

  try {

    // Estimate gas for minting
    const estimatedGas = await contract.mintTo.estimateGas(walletAddress, userIdHash);
    const gasPrice = await provider.getFeeData();
    const estimatedCost = estimatedGas * (gasPrice.gasPrice || 0);
    
    res.json({
      estimatedGas: estimatedGas.toString(),
      gasPrice: gasPrice.gasPrice?.toString() || "0",
      estimatedCost: estimatedCost.toString(),
      estimatedCostEth: ethers.formatEther(estimatedCost)
    });
  } catch (err) {
    console.error("Errore stima gas:", err);
    res.status(500).json({ 
      error: err.message,
      details: "Errore durante la stima del gas. Verifica i parametri e i permessi."
    });
  }
});

app.post("/api/nft/mint", async (req, res) => {
  const { walletAddress, userIdHash } = req.body;
  
  if (!walletAddress || !userIdHash) {
    return res.status(400).json({ 
      error: "Campi 'walletAddress' e 'userIdHash' obbligatori" 
    });
  }

  try {
    // Check if user already has a JetCV
    const hasJetCV = await contract.hasJetCV(walletAddress);
    if (hasJetCV) {
      return res.status(400).json({ 
        error: "L'utente ha già un JetCV" 
      });
    }

    // Validate userIdHash format (bytes32 = 64 hex characters)
    if (!/^[0-9a-fA-F]{64}$/.test(userIdHash)) {
      return res.status(400).json({ 
        error: "userIdHash deve essere un bytes32 valido (64 caratteri esadecimali)" 
      });
    }

    // Estimate gas first
    const estimatedGas = await contract.mintTo.estimateGas(walletAddress, userIdHash);
    console.log(`Gas stimato per minting: ${estimatedGas.toString()}`);

    const tx = await contract.mintTo(walletAddress, userIdHash);
    const receipt = await tx.wait();
    
    const tokenId = await contract.userTokenId(walletAddress);
    
    res.json({
      message: "JetCV mintato con successo",
      tokenId: tokenId.toString(),
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      estimatedGas: estimatedGas.toString()
    });
  } catch (err) {
    console.error("Errore minting:", err);
    
    // Provide more detailed error information
    let errorMessage = err.message;
    let errorDetails = "";
    
    if (err.code === "CALL_EXCEPTION") {
      errorDetails = "Errore di esecuzione del contratto. Verifica: 1) Permessi del wallet, 2) Formato userIdHash, 3) Stato del contratto";
    } else if (err.code === "INSUFFICIENT_FUNDS") {
      errorDetails = "Gas insufficiente nel wallet";
    } else if (err.code === "UNPREDICTABLE_GAS_LIMIT") {
      errorDetails = "Impossibile stimare il gas. Verifica i parametri";
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: errorDetails,
      code: err.code
    });
  }
});

// ======================== CERTIFICATION APIs ========================

app.get("/api/certifications/token/:tokenId", async (req, res) => {
  try {
    const tokenId = req.params.tokenId;
    const certifications = await contract.getCertifications(tokenId);
    res.json({ tokenId, certifications });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/certifications/user/:address", async (req, res) => {
  try {
    const address = req.params.address;
    const tokenId = await contract.userTokenId(address);
    const certifications = await contract.getCertifications(tokenId);
    res.json({ address, tokenId: tokenId.toString(), certifications });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/certifications/approve", async (req, res) => {
  const {
    walletAddress,
    tokenId,
    certificationIdHash,
    documents,
    legalEntityAddress,
    legalEntityIdHash,
    certificatorAddress,
    certificatorIdHash,
  } = req.body;

  if (!walletAddress || !tokenId || !certificationIdHash || !documents || 
      !legalEntityAddress || !legalEntityIdHash || !certificatorAddress || !certificatorIdHash) {
    return res.status(400).json({ 
      error: "Tutti i campi sono obbligatori per l'approvazione della certificazione" 
    });
  }

  try {
    const tx = await contract.approveCertification(
      walletAddress,
      tokenId,
      certificationIdHash,
      documents,
      legalEntityAddress,
      legalEntityIdHash,
      certificatorAddress,
      certificatorIdHash
    );
    
    const receipt = await tx.wait();
    
    res.json({
      message: "Certificazione approvata con successo",
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
    });
  } catch (err) {
    console.error("Errore approvazione certificazione:", err);
    res.status(500).json({ error: err.message });
  }
});

// ======================== MIGRATION APIs ========================

app.post("/api/nft/migrate", async (req, res) => {
  const { walletAddress, reason, newContract } = req.body;
  
  if (!walletAddress || !reason || !newContract) {
    return res.status(400).json({ 
      error: "Campi 'walletAddress', 'reason' e 'newContract' obbligatori" 
    });
  }

  try {
    // Check if user has a JetCV
    const hasJetCV = await contract.hasJetCV(walletAddress);
    if (!hasJetCV) {
      return res.status(400).json({ 
        error: "L'utente non ha un JetCV da migrare" 
      });
    }

    const tokenId = await contract.userTokenId(walletAddress);
    const userIdHash = await contract.userIdHash(tokenId);

    const tx = await contract.burnForMigration(walletAddress, reason, newContract);
    const receipt = await tx.wait();
    
    res.json({
      message: "JetCV migrato con successo",
      tokenId: tokenId.toString(),
      userIdHash: userIdHash.toString(),
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
    });
  } catch (err) {
    console.error("Errore migrazione:", err);
    res.status(500).json({ error: err.message });
  }
});

// ======================== OWNERSHIP APIs ========================

app.get("/api/contract/owner", async (req, res) => {
  try {
    const owner = await contract.owner();
    res.json({ owner });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/contract/transfer-ownership", async (req, res) => {
  const { newOwner } = req.body;
  
  if (!newOwner) {
    return res.status(400).json({ 
      error: "Campo 'newOwner' obbligatorio" 
    });
  }

  try {
    const tx = await contract.transferOwnership(newOwner);
    const receipt = await tx.wait();
    
    res.json({
      message: "Proprietà trasferita con successo",
      newOwner,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
    });
  } catch (err) {
    console.error("Errore trasferimento proprietà:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/contract/renounce-ownership", async (req, res) => {
  try {
    const tx = await contract.renounceOwnership();
    const receipt = await tx.wait();
    
    res.json({
      message: "Proprietà rinunciata con successo",
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
    });
  } catch (err) {
    console.error("Errore rinuncia proprietà:", err);
    res.status(500).json({ error: err.message });
  }
});

// ======================== APPROVAL APIs ========================

app.get("/api/nft/token/:tokenId/approved", async (req, res) => {
  try {
    const tokenId = req.params.tokenId;
    const approved = await contract.getApproved(tokenId);
    res.json({ tokenId, approved });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/nft/token/:tokenId/approve", async (req, res) => {
  const { to } = req.body;
  const tokenId = req.params.tokenId;
  
  if (!to) {
    return res.status(400).json({ 
      error: "Campo 'to' obbligatorio" 
    });
  }

  try {
    const tx = await contract.approve(to, tokenId);
    const receipt = await tx.wait();
    
    res.json({
      message: "Approvazione completata",
      tokenId,
      to,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
    });
  } catch (err) {
    console.error("Errore approvazione:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/nft/set-approval-for-all", async (req, res) => {
  const { operator, approved } = req.body;
  
  if (!operator || approved === undefined) {
    return res.status(400).json({ 
      error: "Campi 'operator' e 'approved' obbligatori" 
    });
  }

  try {
    const tx = await contract.setApprovalForAll(operator, approved);
    const receipt = await tx.wait();
    
    res.json({
      message: "Approvazione per tutti impostata",
      operator,
      approved,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
    });
  } catch (err) {
    console.error("Errore approvazione per tutti:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/nft/is-approved-for-all", async (req, res) => {
  const { owner, operator } = req.query;
  
  if (!owner || !operator) {
    return res.status(400).json({ 
      error: "Parametri 'owner' e 'operator' obbligatori" 
    });
  }

  try {
    const isApproved = await contract.isApprovedForAll(owner, operator);
    res.json({ owner, operator, isApproved });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================== TRANSFER APIs ========================

app.post("/api/nft/transfer", async (req, res) => {
  const { from, to, tokenId } = req.body;
  
  if (!from || !to || !tokenId) {
    return res.status(400).json({ 
      error: "Campi 'from', 'to' e 'tokenId' obbligatori" 
    });
  }

  try {
    const tx = await contract.transferFrom(from, to, tokenId);
    const receipt = await tx.wait();
    
    res.json({
      message: "Transfer completato",
      from,
      to,
      tokenId,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
    });
  } catch (err) {
    console.error("Errore transfer:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/nft/safe-transfer", async (req, res) => {
  const { from, to, tokenId, data } = req.body;
  
  if (!from || !to || !tokenId) {
    return res.status(400).json({ 
      error: "Campi 'from', 'to' e 'tokenId' obbligatori" 
    });
  }

  try {
    let tx;
    if (data) {
      tx = await contract.safeTransferFrom(from, to, tokenId, data);
    } else {
      tx = await contract.safeTransferFrom(from, to, tokenId);
    }
    
    const receipt = await tx.wait();
    
    res.json({
      message: "Safe transfer completato",
      from,
      to,
      tokenId,
      data: data || null,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
    });
  } catch (err) {
    console.error("Errore safe transfer:", err);
    res.status(500).json({ error: err.message });
  }
});

// ======================== INTERFACE SUPPORT APIs ========================

app.get("/api/contract/supports-interface", async (req, res) => {
  const { interfaceId } = req.query;
  
  if (!interfaceId) {
    return res.status(400).json({ 
      error: "Parametro 'interfaceId' obbligatorio" 
    });
  }

  try {
    const supports = await contract.supportsInterface(interfaceId);
    res.json({ interfaceId, supports });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================== LEGACY APIs (for backward compatibility) ========================

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
    const tokenId = req.params.tokenId;
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

app.get("/api/certifications/:address", async (req, res) => {
  try {
    const tokenId = await contract.userTokenId(req.params.address);
    const certifications = await contract.getCertifications(tokenId);
    res.json({ address: req.params.address, certifications });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/cv/all-tokenIds", async (req, res) => {
  try {
    const tokenIds = await contract.getAllTokenIds();
    res.json({ tokenIds: tokenIds.map((id) => id.toString()) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================== FILE UPLOAD APIs ========================

app.post("/api/decrypt", async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: "Campo 'url' obbligatorio" });
  }
  try {
    // Placeholder for decrypt function
    res.status(501).json({ error: "Funzione decrypt non ancora implementata" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================== DOCUMENTATION APIs ========================

app.get("/api-docs.json", (req, res) => {
  const yamlDoc = fs.readFileSync("./swagger.yaml", "utf8");
  const jsonDoc = yaml.parse(yamlDoc);
  res.json(jsonDoc);
});

// ======================== STATIC FILES ========================

app.use(express.static(path.join(__dirname, "ui")));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "ui", "index.html"));
});

// ======================== ERROR HANDLING ========================

app.use((err, req, res, next) => {
  console.error("Errore non gestito:", err);
  res.status(500).json({ error: "Errore interno del server" });
});

app.use((req, res) => {
  res.status(404).json({ error: "Endpoint non trovato" });
});

// ======================== SERVER START ========================

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`🚀 Server avviato sulla porta ${PORT}`);
  console.log(`📚 Documentazione disponibile su http://localhost:${PORT}/docs`);
  console.log(`🌐 Interfaccia web disponibile su http://localhost:${PORT}`);
});

export default app;
