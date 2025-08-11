import express from "express";
import cors from "cors";
import { ethers } from "ethers";
import { fileURLToPath } from "url";
import { dirname } from "path";
import path from "path";
import fs from "fs";
import yaml from "yaml";
import swaggerUi from "swagger-ui-express";
import { exec } from "child_process";
import { promisify } from "util";
import dotenv from "dotenv";
import walletPrismaRoutes from "./controllers/WalletPrisma.js";

dotenv.config();

const execAsync = promisify(exec);
const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cors({ origin: "*", credentials: true }));
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization",
  );
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Max-Age", "86400"); // 24h
  if (req.method === "OPTIONS") return res.status(200).end();
  next();
});

// ======================== ROUTES (WALLETS - Prisma) ========================
app.use("/api/wallets", walletPrismaRoutes);

// ======================== SWAGGER ========================
const swaggerDocument = yaml.parse(fs.readFileSync("./swagger.yaml", "utf8"));
app.use(
  "/docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument, {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
      tryItOutEnabled: true,
      requestInterceptor: (req) => {
        req.headers["Access-Control-Allow-Origin"] = "*";
        req.headers["Access-Control-Allow-Methods"] =
          "GET, POST, PUT, DELETE, OPTIONS";
        req.headers["Access-Control-Allow-Headers"] =
          "Origin, X-Requested-With, Content-Type, Accept, Authorization";
        return req;
      },
    },
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { color: #3b4151; }
      .swagger-ui .scheme-container { background: #f8f9fa; }
    `,
    customSiteTitle: "JetCV NFT API Documentation",
  }),
);

// ======================== ENV & PROVIDER ========================
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const RPC_URL = process.env.RPC_URL || "https://polygon-rpc.com";

if (!PRIVATE_KEY || !CONTRACT_ADDRESS) {
  console.error(
    "Errore: variabili .env mancanti (PRIVATE_KEY, CONTRACT_ADDRESS).",
  );
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(RPC_URL);
const signer = new ethers.Wallet(PRIVATE_KEY, provider);

// ======================== CONTRACT INIT ========================
let contract = null;
(async () => {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    // Carico l'ABI dall'artifact di Hardhat
    const ARTIFACT_PATH = path.join(__dirname, "contracts", "JETCV.json");

    if (!fs.existsSync(ARTIFACT_PATH)) {
      console.error("Errore: artifact ABI non trovato:", ARTIFACT_PATH);
      process.exit(1);
    }

    const artifact = JSON.parse(fs.readFileSync(ARTIFACT_PATH, "utf8"));
    // Se il file è un array ABI diretto, usalo così com'è
    // Altrimenti, se è un artifact di Hardhat, estrai l'ABI
    const ABI = Array.isArray(artifact) ? artifact : artifact.abi;

    contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
    console.log("✅ Contratto JETCV inizializzato:", CONTRACT_ADDRESS);

    const net = await provider.getNetwork();
    console.log(`🌐 Network connesso: chainId=${net.chainId}`);
  } catch (err) {
    console.log("⚠️ Contratto non disponibile:", err.message);
    console.log("📋 Avvio in modalità senza contratto per alcune API");
  }
})();

// ======================== CORS TEST ========================
app.get("/api/cors-test", (req, res) => {
  res.json({
    message: "CORS test successful",
    timestamp: new Date().toISOString(),
    headers: req.headers,
    origin: req.get("Origin"),
    method: req.method,
  });
});

// ======================== WALLET APIS ========================
app.post("/api/wallet/create", async (req, res) => {
  try {
    const wallet = ethers.Wallet.createRandom();
    const walletId = wallet.address;
    const encryptedPrivateKey = wallet.privateKey;
    const mnemonic = wallet.mnemonic?.phrase;

    console.log("Nuovo wallet creato:", walletId);
    if (mnemonic) console.log("Mnemonic:", mnemonic);

    let scriptError = false;
    let output = "";

    try {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      const scriptPath = path.join(__dirname, "script", "code-token.sh");
      const cmd = `bash ${scriptPath} ${walletId} '${encryptedPrivateKey}' '${mnemonic || ""}'`;

      const { stdout, stderr } = await execAsync(cmd);
      output = stdout;
      if (stderr) {
        console.error("Errore script:", stderr);
        scriptError = true;
      }
    } catch (scriptErr) {
      console.error("Errore esecuzione script:", scriptErr);
      scriptError = true;
    }

    res.json({
      message: "Wallet creato con successo",
      walletId,
      mnemonic: mnemonic || null,
      scriptError,
      output,
    });
  } catch (err) {
    console.error("Errore creazione wallet:", err);
    res.status(500).json({
      error: err.message,
      details: "Errore durante la creazione del wallet",
    });
  }
});

app.get("/api/wallet/:address/balance", async (req, res) => {
  try {
    const address = req.params.address;
    const balance = await provider.getBalance(address);
    res.json({
      address,
      balance: balance.toString(),
      balanceEth: ethers.formatEther(balance),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/wallet/:address/secret", async (req, res) => {
  try {
    const address = req.params.address;
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const scriptPath = path.join(__dirname, "script", "decode-token.sh");
    const cmd = `bash ${scriptPath} ${address}`;

    const { stdout, stderr } = await execAsync(cmd);
    res.json({
      address,
      secret: stdout.trim(),
      error: stderr || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/wallet/:address/info", async (req, res) => {
  try {
    const address = req.params.address;
    const [balance, nonce] = await Promise.all([
      provider.getBalance(address),
      provider.getTransactionCount(address),
    ]);

    res.json({
      address,
      balance: balance.toString(),
      balanceEth: ethers.formatEther(balance),
      nonce: nonce.toString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/wallet/:address/gas-balance", async (req, res) => {
  try {
    const address = req.params.address;
    const balance = await provider.getBalance(address);
    const fee = await provider.getFeeData();
    const gasPrice = fee.gasPrice || 0n;
    const estimatedGasCost = 21000n * gasPrice;
    const availableGas = balance - estimatedGasCost;

    res.json({
      address,
      balance: balance.toString(),
      balanceEth: ethers.formatEther(balance),
      gasPrice: gasPrice.toString(),
      estimatedGasCost: estimatedGasCost.toString(),
      estimatedGasCostEth: ethers.formatEther(estimatedGasCost),
      availableGas: availableGas.toString(),
      availableGasEth: ethers.formatEther(availableGas),
      maxFeePerGas: (fee.maxFeePerGas || 0n).toString(),
      maxPriorityFeePerGas: (fee.maxPriorityFeePerGas || 0n).toString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================== CONTRACT INFO APIS ========================
app.get("/api/contract/info", async (req, res) => {
  try {
    if (!contract) {
      return res.status(503).json({
        error: "Contratto non disponibile",
        message: "Il contratto NFT non è ancora deployato o non è accessibile",
        contractAddress: CONTRACT_ADDRESS,
      });
    }

    const [name, symbol, maxSupply] = await Promise.all([
      contract.name(),
      contract.symbol(),
      contract.maxSupply(),
    ]);
    const net = await provider.getNetwork();

    res.json({
      name,
      symbol,
      maxSupply: maxSupply.toString(),
      contractAddress: CONTRACT_ADDRESS,
      chainId: Number(net.chainId),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================== NFT MINTING APIS ========================
app.post("/api/nft/mint/estimate-gas", async (req, res) => {
  const { to, uri } = req.body;

  if (!to || !uri) {
    return res.status(400).json({
      error: "Campi 'to' e 'uri' obbligatori",
    });
  }

  if (!contract) {
    return res.status(503).json({
      error: "Contratto non disponibile",
      contractAddress: CONTRACT_ADDRESS,
    });
  }

  try {
    if (!ethers.isAddress(to)) {
      return res.status(400).json({ error: "Indirizzo 'to' non valido" });
    }

    const estimatedGas = await contract.ownerMintTo.estimateGas(to, uri);
    const fee = await provider.getFeeData();
    const gasPrice = fee.gasPrice ?? 0n;
    const estimatedCost = estimatedGas * gasPrice;

    res.json({
      estimatedGas: estimatedGas.toString(),
      gasPrice: gasPrice.toString(),
      estimatedCost: estimatedCost.toString(),
      estimatedCostEth: ethers.formatEther(estimatedCost),
      maxFeePerGas: (fee.maxFeePerGas ?? 0n).toString(),
      maxPriorityFeePerGas: (fee.maxPriorityFeePerGas ?? 0n).toString(),
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

app.post("/api/nft/mint", async (req, res) => {
  const { to, uri } = req.body;


  try {
  

    const tx = await contract.ownerMintTo(to, uri);
    const receipt = await tx.wait();

    // prova a leggere tokenId dall'evento Transfer
    let mintedTokenId = "unknown";
    try {
      const transferTopic = contract.interface.getEvent("Transfer").topicHash;
      const log = receipt.logs.find((l) => l.topics?.[0] === transferTopic);
      if (log) {
        const parsed = contract.interface.parseLog(log);
        mintedTokenId = parsed.args?.tokenId?.toString?.() ?? mintedTokenId;
      }
    } catch {}

    res.json({
      message: "NFT mintato con successo",
      to,
      uri,
      tokenId: mintedTokenId,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
    });
  } catch (err) {
    console.error("Errore minting:", err);
    res.status(500).json({
      error: err.message,
      details: "Errore durante il minting. Verifica i parametri e i permessi.",
    });
  }
});

// ======================== NFT CROSSMINT API ========================
app.post("/api/nft/crossmint", async (req, res) => {
  const { to, uri } = req.body;

  if (!to || !uri) {
    return res.status(400).json({
      error: "Campi 'to' e 'uri' obbligatori",
    });
  }

  if (!contract) {
    return res.status(503).json({
      error: "Contratto non disponibile",
      contractAddress: CONTRACT_ADDRESS,
    });
  }

  try {
    if (!ethers.isAddress(to)) {
      return res.status(400).json({ error: "Indirizzo 'to' non valido" });
    }

    const tx = await contract.crossmintMintTo(to, uri);
    const receipt = await tx.wait();

    // prova a leggere tokenId dall'evento Transfer
    let mintedTokenId = "unknown";
    try {
      const transferTopic = contract.interface.getEvent("Transfer").topicHash;
      const log = receipt.logs.find((l) => l.topics?.[0] === transferTopic);
      if (log) {
        const parsed = contract.interface.parseLog(log);
        mintedTokenId = parsed.args?.tokenId?.toString?.() ?? mintedTokenId;
      }
    } catch {}

    res.json({
      message: "NFT crossmintato con successo",
      to,
      uri,
      tokenId: mintedTokenId,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
    });
  } catch (err) {
    console.error("Errore crossmint:", err);
    res.status(500).json({
      error: err.message,
      details: "Errore durante il crossmint. Verifica i parametri e i permessi.",
    });
  }
});

// ======================== NFT QUERY APIS ========================
app.get("/api/nft/token/:tokenId", async (req, res) => {
  try {
    if (!contract) {
      return res.status(503).json({
        error: "Contratto non disponibile",
        contractAddress: CONTRACT_ADDRESS,
      });
    }

    const tokenId = req.params.tokenId;
    const [owner, uri] = await Promise.all([
      contract.ownerOf(tokenId),
      contract.tokenURI(tokenId),
    ]);
    res.json({
      tokenId,
      owner,
      uri,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/nft/token/:tokenId/owner", async (req, res) => {
  try {
    if (!contract) {
      return res.status(503).json({
        error: "Contratto non disponibile",
        contractAddress: CONTRACT_ADDRESS,
      });
    }
    const tokenId = req.params.tokenId;
    const owner = await contract.ownerOf(tokenId);
    res.json({ tokenId, owner });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/nft/token/:tokenId/uri", async (req, res) => {
  try {
    if (!contract) {
      return res.status(503).json({
        error: "Contratto non disponibile",
        contractAddress: CONTRACT_ADDRESS,
      });
    }
    const tokenId = req.params.tokenId;
    const uri = await contract.tokenURI(tokenId);
    res.json({ tokenId, uri });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/nft/token/:tokenId/user-hash", async (req, res) => {
  try {
    if (!contract) {
      return res.status(503).json({
        error: "Contratto non disponibile",
        contractAddress: CONTRACT_ADDRESS,
        message:
          "La funzione userIdHash non è più disponibile in questo contratto",
      });
    }
    res.status(501).json({
      error: "Funzione non supportata",
      message:
        "La funzione userIdHash non è più disponibile in questo contratto",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/nft/user/:address/balance", async (req, res) => {
  try {
    if (!contract) {
      return res.status(503).json({
        error: "Contratto non disponibile",
        contractAddress: CONTRACT_ADDRESS,
      });
    }
    const address = req.params.address;
    const balance = await contract.balanceOf(address);
    res.json({ address, balance: balance.toString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================== NFT TRANSFER APIS ========================
app.post("/api/nft/transfer", async (req, res) => {
  const { from, to, tokenId } = req.body;

  if (!from || !to || !tokenId) {
    return res
      .status(400)
      .json({ error: "Campi 'from', 'to' e 'tokenId' obbligatori" });
  }
  if (!contract) {
    return res.status(503).json({
      error: "Contratto non disponibile",
      contractAddress: CONTRACT_ADDRESS,
    });
  }

  try {
    const tx = await contract.transferFrom(from, to, tokenId);
    const receipt = await tx.wait();

    res.json({
      message: "NFT trasferito con successo",
      from,
      to,
      tokenId,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
    });
  } catch (err) {
    console.error("Errore trasferimento:", err);
    res.status(500).json({
      error: err.message,
      details: "Errore durante il trasferimento. Verifica i permessi.",
    });
  }
});

app.post("/api/nft/safe-transfer", async (req, res) => {
  const { from, to, tokenId, data } = req.body;

  if (!from || !to || !tokenId) {
    return res
      .status(400)
      .json({ error: "Campi 'from', 'to' e 'tokenId' obbligatori" });
  }
  if (!contract) {
    return res.status(503).json({
      error: "Contratto non disponibile",
      contractAddress: CONTRACT_ADDRESS,
    });
  }

  try {
    const tx = data
      ? await contract.safeTransferFrom(from, to, tokenId, data)
      : await contract.safeTransferFrom(from, to, tokenId);
    const receipt = await tx.wait();

    res.json({
      message: "NFT trasferito in sicurezza con successo",
      from,
      to,
      tokenId,
      data: data || null,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
    });
  } catch (err) {
    console.error("Errore trasferimento sicuro:", err);
    res.status(500).json({
      error: err.message,
      details: "Errore durante il trasferimento sicuro. Verifica i permessi.",
    });
  }
});

// ======================== NFT APPROVAL APIS ========================
app.get("/api/nft/token/:tokenId/approved", async (req, res) => {
  try {
    if (!contract) {
      return res.status(503).json({
        error: "Contratto non disponibile",
        contractAddress: CONTRACT_ADDRESS,
      });
    }
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
    return res.status(400).json({ error: "Campo 'to' obbligatorio" });
  }
  if (!contract) {
    return res.status(503).json({
      error: "Contratto non disponibile",
      contractAddress: CONTRACT_ADDRESS,
    });
  }

  try {
    const tx = await contract.approve(to, tokenId);
    const receipt = await tx.wait();

    res.json({
      message: "Approvazione eseguita con successo",
      tokenId,
      to,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
    });
  } catch (err) {
    console.error("Errore approvazione:", err);
    res.status(500).json({
      error: err.message,
      details: "Errore durante l'approvazione. Verifica i permessi.",
    });
  }
});

app.post("/api/nft/set-approval-for-all", async (req, res) => {
  const { operator, approved } = req.body;

  if (!operator || approved === undefined) {
    return res
      .status(400)
      .json({ error: "Campi 'operator' e 'approved' obbligatori" });
  }
  if (!contract) {
    return res.status(503).json({
      error: "Contratto non disponibile",
      contractAddress: CONTRACT_ADDRESS,
    });
  }

  try {
    const tx = await contract.setApprovalForAll(operator, approved);
    const receipt = await tx.wait();

    res.json({
      message: "Approvazione per tutti i token eseguita con successo",
      operator,
      approved,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
    });
  } catch (err) {
    console.error("Errore approvazione per tutti:", err);
    res.status(500).json({
      error: err.message,
      details:
        "Errore durante l'approvazione per tutti i token. Verifica i permessi.",
    });
  }
});

app.get("/api/nft/is-approved-for-all", async (req, res) => {
  try {
    if (!contract) {
      return res.status(503).json({
        error: "Contratto non disponibile",
        contractAddress: CONTRACT_ADDRESS,
      });
    }

    const { owner, operator } = req.query;
    if (!owner || !operator) {
      return res
        .status(400)
        .json({ error: "Parametri 'owner' e 'operator' obbligatori" });
    }

    const isApproved = await contract.isApprovedForAll(owner, operator);
    res.json({ owner, operator, isApproved });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================== NFT URI MANAGEMENT API ========================
app.post("/api/nft/token/:tokenId/update-uri", async (req, res) => {
  const { newUri } = req.body;
  const tokenId = req.params.tokenId;

  if (!newUri) {
    return res.status(400).json({ error: "Campo 'newUri' obbligatorio" });
  }
  if (!contract) {
    return res.status(503).json({
      error: "Contratto non disponibile",
      contractAddress: CONTRACT_ADDRESS,
    });
  }

  try {
    // Calcola il nuovo URI completo basato sul tokenId
    const baseURI = await contract.tokenURI(tokenId);
    const baseURIParts = baseURI.split("/");
    baseURIParts.pop(); // Rimuovi l'ultima parte (tokenId)
    const newBaseURI = baseURIParts.join("/") + "/";

    const tx = await contract.setBaseURI(newBaseURI);
    const receipt = await tx.wait();

    res.json({
      message: "Base URI del contratto aggiornato con successo",
      tokenId,
      oldBaseURI: baseURI,
      newBaseURI: newBaseURI,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
    });
  } catch (err) {
    console.error("Errore aggiornamento base URI:", err);
    res.status(500).json({
      error: err.message,
      details:
        "Errore durante l'aggiornamento del base URI. Verifica i permessi.",
      note: "Questa funzione aggiorna il base URI per tutti i token, non solo per uno specifico",
    });
  }
});

// ======================== CONTRACT CROSSMINT API ========================
app.get("/api/contract/crossmint-operator", async (req, res) => {
  try {
    if (!contract) {
      return res.status(503).json({
        error: "Contratto non disponibile",
        contractAddress: CONTRACT_ADDRESS,
      });
    }
    const crossmintOperator = await contract.crossmintOperator();
    res.json({ 
      crossmintOperator,
      note: "Indirizzo dell'operatore autorizzato per il crossmint"
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================== CONTRACT SUPPLY API ========================
app.get("/api/contract/max-supply", async (req, res) => {
  try {
    if (!contract) {
      return res.status(503).json({
        error: "Contratto non disponibile",
        contractAddress: CONTRACT_ADDRESS,
      });
    }
    const maxSupply = await contract.maxSupply();
    res.json({
      maxSupply: maxSupply.toString(),
      maxSupplyNumber: Number(maxSupply),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================== CONTRACT BASE URI API ========================
app.get("/api/contract/base-uri", async (req, res) => {
  try {
    if (!contract) {
      return res.status(503).json({
        error: "Contratto non disponibile",
        contractAddress: CONTRACT_ADDRESS,
      });
    }

    // Ottieni l'URI di un token per dedurre il base URI
    const tokenId = "0"; // Prova con token 0
    try {
      const uri = await contract.tokenURI(tokenId);
      const baseURIParts = uri.split("/");
      baseURIParts.pop(); // Rimuovi l'ultima parte (tokenId)
      const baseURI = baseURIParts.join("/") + "/";

      res.json({
        baseURI,
        sampleTokenURI: uri,
        note: "Base URI dedotto dall'URI del token 0",
      });
    } catch (uriErr) {
      res.json({
        baseURI: "Non disponibile",
        error: "Impossibile determinare il base URI",
        details: uriErr.message,
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/contract/set-base-uri", async (req, res) => {
  const { newBaseURI } = req.body;

  if (!newBaseURI) {
    return res.status(400).json({ error: "Campo 'newBaseURI' obbligatorio" });
  }
  if (!contract) {
    return res.status(503).json({
      error: "Contratto non disponibile",
      contractAddress: CONTRACT_ADDRESS,
    });
  }

  try {
    const tx = await contract.setBaseURI(newBaseURI);
    const receipt = await tx.wait();

    res.json({
      message: "Base URI del contratto aggiornato con successo",
      newBaseURI,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
    });
  } catch (err) {
    console.error("Errore aggiornamento base URI:", err);
    res.status(500).json({
      error: err.message,
      details:
        "Errore durante l'aggiornamento del base URI. Verifica i permessi.",
    });
  }
});

// ======================== CONTRACT CROSSMINT SETUP API ========================
app.post("/api/contract/set-crossmint-operator", async (req, res) => {
  const { newOperator } = req.body;

  if (!newOperator) {
    return res.status(400).json({ error: "Campo 'newOperator' obbligatorio" });
  }
  if (!contract) {
    return res.status(503).json({
      error: "Contratto non disponibile",
      contractAddress: CONTRACT_ADDRESS,
    });
  }

  try {
    if (!ethers.isAddress(newOperator)) {
      return res.status(400).json({ error: "Indirizzo 'newOperator' non valido" });
    }

    const tx = await contract.setCrossmintOperator(newOperator);
    const receipt = await tx.wait();

    res.json({
      message: "Operatore crossmint aggiornato con successo",
      newOperator,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
    });
  } catch (err) {
    console.error("Errore aggiornamento operatore crossmint:", err);
    res.status(500).json({
      error: err.message,
      details: "Errore durante l'aggiornamento dell'operatore crossmint. Verifica i permessi.",
    });
  }
});

// ======================== CONTRACT OWNERSHIP APIS ========================
app.get("/api/contract/owner", async (req, res) => {
  try {
    if (!contract) {
      return res.status(503).json({
        error: "Contratto non disponibile",
        contractAddress: CONTRACT_ADDRESS,
      });
    }
    const owner = await contract.owner();
    res.json({ owner });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/contract/transfer-ownership", async (req, res) => {
  const { newOwner } = req.body;

  if (!newOwner) {
    return res.status(400).json({ error: "Campo 'newOwner' obbligatorio" });
  }
  if (!contract) {
    return res.status(503).json({
      error: "Contratto non disponibile",
      contractAddress: CONTRACT_ADDRESS,
    });
  }

  try {
    const tx = await contract.transferOwnership(newOwner);
    const receipt = await tx.wait();

    res.json({
      message: "Proprietà del contratto trasferita con successo",
      newOwner,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
    });
  } catch (err) {
    console.error("Errore trasferimento proprietà:", err);
    res.status(500).json({
      error: err.message,
      details:
        "Errore durante il trasferimento della proprietà. Verifica i permessi.",
    });
  }
});

app.post("/api/contract/renounce-ownership", async (req, res) => {
  if (!contract) {
    return res.status(503).json({
      error: "Contratto non disponibile",
      contractAddress: CONTRACT_ADDRESS,
    });
  }

  try {
    const tx = await contract.renounceOwnership();
    const receipt = await tx.wait();

    res.json({
      message: "Proprietà del contratto rinunciata con successo",
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
    });
  } catch (err) {
    console.error("Errore rinuncia proprietà:", err);
    res.status(500).json({
      error: err.message,
      details:
        "Errore durante la rinuncia alla proprietà. Verifica i permessi.",
    });
  }
});

// ======================== INTERFACE SUPPORT API (bytes4) ========================
app.get("/api/contract/supports-interface", async (req, res) => {
  try {
    if (!contract) {
      return res.status(503).json({
        error: "Contratto non disponibile",
        contractAddress: CONTRACT_ADDRESS,
      });
    }

    const { interfaceId } = req.query;
    if (!interfaceId || !/^0x[0-9a-fA-F]{8}$/.test(interfaceId)) {
      return res.status(400).json({
        error:
          "Parametro 'interfaceId' obbligatorio come bytes4 (es: 0x80ac58cd)",
      });
    }

    const supports = await contract.supportsInterface(interfaceId);
    res.json({ interfaceId, supports });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================== START SERVER ========================
app.listen(PORT, () => {
  console.log(`🚀 Server avviato sulla porta ${PORT}`);
  console.log(`📚 Documentazione API: http://localhost:${PORT}/docs`);
});

export default app;
