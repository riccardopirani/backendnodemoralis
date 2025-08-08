import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cookieParser from "cookie-parser";
import { ethers, Wallet } from "ethers";
import fs from "fs";
import path from "path";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import yaml from "yaml";
import walletPrismaRoutes from "./controllers/WalletPrisma.js";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { dirname } from "path";
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
  }),
);

app.use("/api/wallets", walletPrismaRoutes);

const swaggerDocument = yaml.parse(fs.readFileSync("./swagger.yaml", "utf8"));
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const RPC_URL = process.env.RPC_URL || "https://polygon-rpc.com";

if (!PRIVATE_KEY || !CONTRACT_ADDRESS) {
  console.error(
    "Errore: variabili .env mancanti (PRIVATE_KEY, CONTRACT_ADDRESS).",
  );
  process.exit(1);
}

// Setup provider and signer
const provider = new ethers.JsonRpcProvider(RPC_URL);
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

// ======================== WALLET CREATION APIs ========================

app.post("/api/wallet/create", async (req, res) => {
  try {
    const wallet = Wallet.createRandom();
    const walletId = wallet.address;
    const encryptedPrivateKey = wallet.privateKey;
    const mnemonic = wallet.mnemonic.phrase;

    console.log("Nuovo wallet creato:", walletId);
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
      mnemonic: wallet.mnemonic.phrase,
      scriptError,
      output,
    });
  } catch (err) {
    console.error("Errore creazione wallet:", err);
    res.status(500).json({ error: err.message });
  }
});

// ======================== WALLET INFO APIs ========================

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
      `bash ${scriptPath} ${walletId}`,
    );

    if (stderr) {
      console.error("Errore shell:", stderr);
      return res
        .status(500)
        .json({ error: "Errore durante la lettura del segreto" });
    }

    const match = stdout.match(
      new RegExp(`"wallet-${walletId}"\\s*:\\s*"(.*?)"`),
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

app.get("/api/wallet/:address/info", async (req, res) => {
  try {
    const { address } = req.params;

    // Get wallet balance
    const balanceWei = await provider.getBalance(address);
    const balance = ethers.formatUnits(balanceWei, 18);

    // Get NFT balance if contract is available
    let nftBalance = "0";
    try {
      nftBalance = await contract.balanceOf(address);
      nftBalance = nftBalance.toString();
    } catch (err) {
      console.log("NFT balance non disponibile:", err.message);
    }

    // Get token info if user has NFTs
    let tokens = [];
    if (nftBalance !== "0") {
      try {
        // For simplicity, we'll just get the first token
        // In a real implementation, you might want to get all tokens
        const tokenId = await contract.tokenOfOwnerByIndex(address, 0);
        const tokenURI = await contract.tokenURI(tokenId);
        const userIdHash = await contract.userIdHash(tokenId);

        tokens.push({
          tokenId: tokenId.toString(),
          tokenURI,
          userIdHash: userIdHash.toString(),
        });
      } catch (err) {
        console.log("Errore nel recupero dei token:", err.message);
      }
    }

    res.json({
      address,
      balance,
      balanceWei: balanceWei.toString(),
      nftBalance,
      tokens,
      network: provider.network?.name || "unknown",
    });
  } catch (err) {
    console.error("Errore API wallet info:", err);
    res.status(500).json({ error: err.message });
  }
});

// ======================== GAS MANAGEMENT APIs ========================

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
      gasPriceGwei: gasPrice.gasPrice
        ? ethers.formatUnits(gasPrice.gasPrice, "gwei")
        : "0",
      maxFeePerGas: gasPrice.maxFeePerGas?.toString() || "0",
      maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas?.toString() || "0",
    });
  } catch (err) {
    console.error("Errore controllo gas:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/nft/mint/estimate-gas", async (req, res) => {
  const { walletAddress, idUserActionHash, uri } = req.body;

  if (!walletAddress || !idUserActionHash || !uri) {
    return res.status(400).json({
      error: "Campi 'walletAddress', 'idUserActionHash' e 'uri' obbligatori",
    });
  }

  try {
    // Validate idUserActionHash format (bytes32 = 64 hex characters)
    if (!/^[0-9a-fA-F]{64}$/.test(idUserActionHash)) {
      return res.status(400).json({
        error:
          "idUserActionHash deve essere un bytes32 valido (64 caratteri esadecimali)",
      });
    }

    // Estimate gas for minting
    const estimatedGas = await contract.mint.estimateGas(
      walletAddress,
      idUserActionHash,
      uri,
    );
    const gasPrice = await provider.getFeeData();
    const estimatedCost = estimatedGas * (gasPrice.gasPrice || 0);

    res.json({
      estimatedGas: estimatedGas.toString(),
      gasPrice: gasPrice.gasPrice?.toString() || "0",
      estimatedCost: estimatedCost.toString(),
      estimatedCostEth: ethers.formatEther(estimatedCost),
      maxFeePerGas: gasPrice.maxFeePerGas?.toString() || "0",
      maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas?.toString() || "0",
    });
  } catch (err) {
    console.error("Errore stima gas:", err);
    res.status(500).json({
      error: err.message,
      details:
        "Errore durante la stima del gas. Verifica i parametri e i permessi.",
    });
  }
});

// ======================== CONTRACT INFO APIs ========================

app.get("/api/contract/info", async (req, res) => {
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
      network: provider.network?.name || "unknown",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================== NFT MINTING APIs ========================

app.post("/api/nft/mint", async (req, res) => {
  const { walletAddress, idUserActionHash, uri } = req.body;

  if (!walletAddress || !idUserActionHash || !uri) {
    return res.status(400).json({
      error: "Campi 'walletAddress', 'idUserActionHash' e 'uri' obbligatori",
    });
  }

  try {
    // Validate idUserActionHash format (bytes32 = 64 hex characters)
    if (!/^[0-9a-fA-F]{64}$/.test(idUserActionHash)) {
      return res.status(400).json({
        error:
          "idUserActionHash deve essere un bytes32 valido (64 caratteri esadecimali)",
      });
    }

    // Estimate gas first
    const estimatedGas = await contract.mint.estimateGas(
      walletAddress,
      idUserActionHash,
      uri,
    );
    console.log(`Gas stimato per minting: ${estimatedGas.toString()}`);

    const tx = await contract.mint(walletAddress, idUserActionHash, uri);
    const receipt = await tx.wait();

    res.json({
      message: "NFT mintato con successo",
      walletAddress,
      idUserActionHash,
      uri,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      estimatedGas: estimatedGas.toString(),
    });
  } catch (err) {
    console.error("Errore minting:", err);
    res.status(500).json({
      error: err.message,
      details: "Errore durante il minting. Verifica i parametri e i permessi.",
    });
  }
});

// ======================== NFT QUERY APIs ========================

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
      userIdHash: userIdHash.toString(),
    });
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

app.get("/api/nft/token/:tokenId/user-hash", async (req, res) => {
  try {
    const tokenId = req.params.tokenId;
    const userIdHash = await contract.userIdHash(tokenId);
    res.json({ tokenId, userIdHash: userIdHash.toString() });
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

// ======================== NFT TRANSFER APIs ========================

app.post("/api/nft/transfer", async (req, res) => {
  const { from, to, tokenId } = req.body;

  if (!from || !to || !tokenId) {
    return res.status(400).json({
      error: "Campi 'from', 'to' e 'tokenId' obbligatori",
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
      error: "Campi 'from', 'to' e 'tokenId' obbligatori",
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

// ======================== NFT APPROVAL APIs ========================

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
      error: "Campo 'to' obbligatorio",
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
      error: "Campi 'operator' e 'approved' obbligatori",
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
      error: "Parametri 'owner' e 'operator' obbligatori",
    });
  }

  try {
    const isApproved = await contract.isApprovedForAll(owner, operator);
    res.json({ owner, operator, isApproved });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================== NFT URI MANAGEMENT APIs ========================

app.post("/api/nft/token/:tokenId/update-uri", async (req, res) => {
  const { newUri } = req.body;
  const tokenId = req.params.tokenId;

  if (!newUri) {
    return res.status(400).json({
      error: "Campo 'newUri' obbligatorio",
    });
  }

  try {
    const tx = await contract.updateTokenURI(tokenId, newUri);
    const receipt = await tx.wait();

    res.json({
      message: "URI aggiornato con successo",
      tokenId,
      newUri,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
    });
  } catch (err) {
    console.error("Errore aggiornamento URI:", err);
    res.status(500).json({ error: err.message });
  }
});

// ======================== CONTRACT OWNERSHIP APIs ========================

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
      error: "Campo 'newOwner' obbligatorio",
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

// ======================== INTERFACE SUPPORT APIs ========================

app.get("/api/contract/supports-interface", async (req, res) => {
  const { interfaceId } = req.query;

  if (!interfaceId) {
    return res.status(400).json({
      error: "Parametro 'interfaceId' obbligatorio",
    });
  }

  try {
    const supports = await contract.supportsInterface(interfaceId);
    res.json({ interfaceId, supports });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================== BULK OPERATIONS APIs ========================

app.get("/api/nft/user/:address/tokens", async (req, res) => {
  try {
    const address = req.params.address;
    const balance = await contract.balanceOf(address);

    const tokens = [];
    for (let i = 0; i < balance; i++) {
      try {
        // Note: This assumes the contract has tokenOfOwnerByIndex function
        // If not available, you might need to track tokens differently
        const tokenId = await contract.tokenOfOwnerByIndex(address, i);
        const [uri, userIdHash] = await Promise.all([
          contract.tokenURI(tokenId),
          contract.userIdHash(tokenId),
        ]);

        tokens.push({
          tokenId: tokenId.toString(),
          uri,
          userIdHash: userIdHash.toString(),
        });
      } catch (err) {
        console.log(`Errore nel recupero del token ${i}:`, err.message);
      }
    }

    res.json({
      address,
      balance: balance.toString(),
      tokens,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================== ESTIMATE GAS APIs ========================

app.post("/api/nft/transfer/estimate-gas", async (req, res) => {
  const { from, to, tokenId } = req.body;

  if (!from || !to || !tokenId) {
    return res.status(400).json({
      error: "Campi 'from', 'to' e 'tokenId' obbligatori",
    });
  }

  try {
    const estimatedGas = await contract.transferFrom.estimateGas(
      from,
      to,
      tokenId,
    );
    const gasPrice = await provider.getFeeData();
    const estimatedCost = estimatedGas * (gasPrice.gasPrice || 0);

    res.json({
      estimatedGas: estimatedGas.toString(),
      gasPrice: gasPrice.gasPrice?.toString() || "0",
      estimatedCost: estimatedCost.toString(),
      estimatedCostEth: ethers.formatEther(estimatedCost),
    });
  } catch (err) {
    console.error("Errore stima gas transfer:", err);
    res.status(500).json({
      error: err.message,
      details: "Errore durante la stima del gas per il transfer.",
    });
  }
});

app.post("/api/nft/approve/estimate-gas", async (req, res) => {
  const { to, tokenId } = req.body;

  if (!to || !tokenId) {
    return res.status(400).json({
      error: "Campi 'to' e 'tokenId' obbligatori",
    });
  }

  try {
    const estimatedGas = await contract.approve.estimateGas(to, tokenId);
    const gasPrice = await provider.getFeeData();
    const estimatedCost = estimatedGas * (gasPrice.gasPrice || 0);

    res.json({
      estimatedGas: estimatedGas.toString(),
      gasPrice: gasPrice.gasPrice?.toString() || "0",
      estimatedCost: estimatedCost.toString(),
      estimatedCostEth: ethers.formatEther(estimatedCost),
    });
  } catch (err) {
    console.error("Errore stima gas approve:", err);
    res.status(500).json({
      error: err.message,
      details: "Errore durante la stima del gas per l'approvazione.",
    });
  }
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
  console.log(`📋 Contratto NFT: ${CONTRACT_ADDRESS}`);
  console.log(`🌐 Network: ${provider.network?.name || "unknown"}`);
});

export default app;
