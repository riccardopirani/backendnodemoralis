import express from "express";
import cors from "cors";
import { ethers } from "ethers";
import { Wallet } from "ethers";
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

// ======================== MIDDLEWARE ========================

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// CORS configuration
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization",
  );
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Max-Age", "86400"); // 24 hours

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  next();
});

app.use("/api/wallets", walletPrismaRoutes);

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
        // Add CORS headers for Swagger requests
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

// Initialize contract with error handling
let contract = null;
try {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const ABI_PATH = path.join(__dirname, "contracts", "JetCVNFT.abi.json");

  if (!fs.existsSync(ABI_PATH)) {
    console.error("Errore: ABI non trovato");
    process.exit(1);
  }

  const ABI = JSON.parse(fs.readFileSync(ABI_PATH, "utf8"));
  contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
  console.log("✅ Contratto NFT inizializzato:", CONTRACT_ADDRESS);
} catch (err) {
  console.log("⚠️ Contratto non disponibile:", err.message);
  console.log("📋 Usando modalità senza contratto per alcune API");
}

// ======================== CORS TEST API ========================

app.get("/api/cors-test", (req, res) => {
  res.json({
    message: "CORS test successful",
    timestamp: new Date().toISOString(),
    headers: req.headers,
    origin: req.get("Origin"),
    method: req.method,
  });

  // ======================== NFT MINTING WITH ID APIs ========================

  app.post("/api/nft/mint-with-id/estimate-gas", async (req, res) => {
    const { to, tokenId, idUserActionHash, uri } = req.body;

    if (!to || !tokenId || !idUserActionHash || !uri) {
      return res.status(400).json({
        error: "Campi 'to', 'tokenId', 'idUserActionHash' e 'uri' obbligatori",
      });
    }

    if (!contract) {
      return res.status(503).json({
        error: "Contratto non disponibile",
        message: "Il contratto non è stato inizializzato correttamente",
        contractAddress: CONTRACT_ADDRESS,
      });
    }

    try {
      // Validate wallet address format
      if (!ethers.isAddress(to)) {
        return res.status(400).json({
          error: "Indirizzo destinatario non valido",
        });
      }

      // Validate tokenId
      if (isNaN(tokenId) || tokenId < 0) {
        return res.status(400).json({
          error: "TokenId deve essere un numero positivo",
        });
      }

      // Validate idUserActionHash format (bytes32 = 64 hex characters)
      if (!/^[0-9a-fA-F]{64}$/.test(idUserActionHash)) {
        return res.status(400).json({
          error:
            "idUserActionHash deve essere un bytes32 valido (64 caratteri esadecimali)",
        });
      }

      // Convert to proper bytes32 format
      const bytes32Hash = "0x" + idUserActionHash;

      // Estimate gas
      const estimatedGas = await contract.mintWithId.estimateGas(
        to,
        tokenId,
        bytes32Hash,
        uri,
      );

      const gasPrice = await provider.getFeeData();
      const estimatedCost = estimatedGas * (gasPrice.gasPrice || 0);

      res.json({
        estimatedGas: estimatedGas.toString(),
        gasPrice: (gasPrice.gasPrice || 0).toString(),
        estimatedCost: estimatedCost.toString(),
        estimatedCostEth: ethers.formatEther(estimatedCost),
        maxFeePerGas: (gasPrice.maxFeePerGas || 0).toString(),
        maxPriorityFeePerGas: (gasPrice.maxPriorityFeePerGas || 0).toString(),
      });
    } catch (err) {
      console.error("Errore stima gas mintWithId:", err);
      res.status(500).json({
        error: err.message,
        details:
          "Errore durante la stima del gas per mintWithId. Verifica i parametri e i permessi.",
      });
    }
  });

  app.post("/api/nft/mint-with-id", async (req, res) => {
    const { to, tokenId, idUserActionHash, uri } = req.body;

    if (!to || !tokenId || !idUserActionHash || !uri) {
      return res.status(400).json({
        error: "Campi 'to', 'tokenId', 'idUserActionHash' e 'uri' obbligatori",
      });
    }

    if (!contract) {
      return res.status(503).json({
        error: "Contratto non disponibile",
        message: "Il contratto non è stato inizializzato correttamente",
        contractAddress: CONTRACT_ADDRESS,
      });
    }

    try {
      // Validate wallet address format
      if (!ethers.isAddress(to)) {
        return res.status(400).json({
          error: "Indirizzo destinatario non valido",
        });
      }

      // Validate tokenId
      if (isNaN(tokenId) || tokenId < 0) {
        return res.status(400).json({
          error: "TokenId deve essere un numero positivo",
        });
      }

      // Validate idUserActionHash format (bytes32 = 64 hex characters)
      if (!/^[0-9a-fA-F]{64}$/.test(idUserActionHash)) {
        return res.status(400).json({
          error:
            "idUserActionHash deve essere un bytes32 valido (64 caratteri esadecimali)",
        });
      }

      // Convert to proper bytes32 format
      const bytes32Hash = "0x" + idUserActionHash;

      // Estimate gas first
      const estimatedGas = await contract.mintWithId.estimateGas(
        to,
        tokenId,
        bytes32Hash,
        uri,
      );
      console.log(`Gas stimato per mintWithId: ${estimatedGas.toString()}`);

      const tx = await contract.mintWithId(to, tokenId, bytes32Hash, uri);
      const receipt = await tx.wait();

      res.json({
        message: "NFT mintato con ID specifico con successo",
        to,
        tokenId,
        idUserActionHash,
        uri,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        estimatedGas: estimatedGas.toString(),
      });
    } catch (err) {
      console.error("Errore mintWithId:", err);
      res.status(500).json({
        error: err.message,
        details:
          "Errore durante il minting con ID specifico. Verifica i parametri e i permessi.",
      });
    }
  });
});

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
      mnemonic,
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

// ======================== WALLET INFO APIs ========================

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
    const gasPrice = await provider.getFeeData();
    const estimatedGasCost = 21000n * (gasPrice.gasPrice || 0n);
    const availableGas = balance - estimatedGasCost;

    res.json({
      address,
      balance: balance.toString(),
      balanceEth: ethers.formatEther(balance),
      gasPrice: gasPrice.gasPrice?.toString() || "0",
      estimatedGasCost: estimatedGasCost.toString(),
      estimatedGasCostEth: ethers.formatEther(estimatedGasCost),
      availableGas: availableGas.toString(),
      availableGasEth: ethers.formatEther(availableGas),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================== CONTRACT INFO APIs ========================

app.get("/api/contract/info", async (req, res) => {
  try {
    if (!contract) {
      return res.status(503).json({
        error: "Contratto non disponibile",
        message: "Il contratto NFT non è ancora deployato o non è accessibile",
        contractAddress: CONTRACT_ADDRESS,
      });
    }

    const [name, symbol] = await Promise.all([
      contract.name(),
      contract.symbol(),
    ]);
    res.json({
      name,
      symbol,
      contractAddress: CONTRACT_ADDRESS,
      network: provider.network?.name || "unknown",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================== NFT MINTING APIs ========================

app.post("/api/nft/mint/estimate-gas", async (req, res) => {
  const { walletAddress, idUserActionHash, uri } = req.body;

  if (!walletAddress || !idUserActionHash || !uri) {
    return res.status(400).json({
      error: "Campi 'walletAddress', 'idUserActionHash' e 'uri' obbligatori",
    });
  }

  if (!contract) {
    return res.status(503).json({
      error: "Contratto non disponibile",
      message:
        "Il contratto NFT non è ancora deployato. Deploya prima il contratto.",
      contractAddress: CONTRACT_ADDRESS,
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

    // Convert to proper bytes32 format
    const bytes32Hash = "0x" + idUserActionHash;

    // Estimate gas for minting
    const estimatedGas = await contract.mint.estimateGas(
      walletAddress,
      bytes32Hash,
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

app.post("/api/nft/mint", async (req, res) => {
  const { walletAddress, idUserActionHash, uri } = req.body;

  if (!walletAddress || !idUserActionHash || !uri) {
    return res.status(400).json({
      error: "Campi 'walletAddress', 'idUserActionHash' e 'uri' obbligatori",
    });
  }

  if (!contract) {
    return res.status(503).json({
      error: "Contratto non disponibile",
      message:
        "Il contratto NFT non è ancora deployato. Deploya prima il contratto.",
      contractAddress: CONTRACT_ADDRESS,
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

    // Convert to proper bytes32 format
    const bytes32Hash = "0x" + idUserActionHash;

    // Estimate gas first
    const estimatedGas = await contract.mint.estimateGas(
      walletAddress,
      bytes32Hash,
      uri,
    );
    console.log(`Gas stimato per minting: ${estimatedGas.toString()}`);

    const tx = await contract.mint(walletAddress, bytes32Hash, uri);
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
    if (!contract) {
      return res.status(503).json({
        error: "Contratto non disponibile",
        message: "Il contratto NFT non è ancora deployato.",
        contractAddress: CONTRACT_ADDRESS,
      });
    }

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
    if (!contract) {
      return res.status(503).json({
        error: "Contratto non disponibile",
        message: "Il contratto NFT non è ancora deployato.",
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
        message: "Il contratto NFT non è ancora deployato.",
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
        message: "Il contratto NFT non è ancora deployato.",
        contractAddress: CONTRACT_ADDRESS,
      });
    }

    const tokenId = req.params.tokenId;
    const userIdHash = await contract.userIdHash(tokenId);
    res.json({ tokenId, userIdHash: userIdHash.toString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/nft/user/:address/balance", async (req, res) => {
  try {
    if (!contract) {
      return res.status(503).json({
        error: "Contratto non disponibile",
        message: "Il contratto NFT non è ancora deployato.",
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

// ======================== NFT TRANSFER APIs ========================

app.post("/api/nft/transfer", async (req, res) => {
  const { from, to, tokenId } = req.body;

  if (!from || !to || !tokenId) {
    return res.status(400).json({
      error: "Campi 'from', 'to' e 'tokenId' obbligatori",
    });
  }

  if (!contract) {
    return res.status(503).json({
      error: "Contratto non disponibile",
      message: "Il contratto NFT non è ancora deployato.",
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
    return res.status(400).json({
      error: "Campi 'from', 'to' e 'tokenId' obbligatori",
    });
  }

  if (!contract) {
    return res.status(503).json({
      error: "Contratto non disponibile",
      message: "Il contratto NFT non è ancora deployato.",
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

// ======================== NFT APPROVAL APIs ========================

app.get("/api/nft/token/:tokenId/approved", async (req, res) => {
  try {
    if (!contract) {
      return res.status(503).json({
        error: "Contratto non disponibile",
        message: "Il contratto NFT non è ancora deployato.",
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
    return res.status(400).json({
      error: "Campo 'to' obbligatorio",
    });
  }

  if (!contract) {
    return res.status(503).json({
      error: "Contratto non disponibile",
      message: "Il contratto NFT non è ancora deployato.",
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
    return res.status(400).json({
      error: "Campi 'operator' e 'approved' obbligatori",
    });
  }

  if (!contract) {
    return res.status(503).json({
      error: "Contratto non disponibile",
      message: "Il contratto NFT non è ancora deployato.",
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
        message: "Il contratto NFT non è ancora deployato.",
        contractAddress: CONTRACT_ADDRESS,
      });
    }

    const { owner, operator } = req.query;
    if (!owner || !operator) {
      return res.status(400).json({
        error: "Parametri 'owner' e 'operator' obbligatori",
      });
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
    return res.status(400).json({
      error: "Campo 'newUri' obbligatorio",
    });
  }

  if (!contract) {
    return res.status(503).json({
      error: "Contratto non disponibile",
      message: "Il contratto NFT non è ancora deployato.",
      contractAddress: CONTRACT_ADDRESS,
    });
  }

  try {
    const tx = await contract.updateTokenURI(tokenId, newUri);
    const receipt = await tx.wait();

    res.json({
      message: "URI del token aggiornato con successo",
      tokenId,
      newUri,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
    });
  } catch (err) {
    console.error("Errore aggiornamento URI:", err);
    res.status(500).json({
      error: err.message,
      details: "Errore durante l'aggiornamento dell'URI. Verifica i permessi.",
    });
  }
});

// ======================== CONTRACT OWNERSHIP APIs ========================

app.get("/api/contract/owner", async (req, res) => {
  try {
    if (!contract) {
      return res.status(503).json({
        error: "Contratto non disponibile",
        message: "Il contratto NFT non è ancora deployato.",
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
    return res.status(400).json({
      error: "Campo 'newOwner' obbligatorio",
    });
  }

  if (!contract) {
    return res.status(503).json({
      error: "Contratto non disponibile",
      message: "Il contratto NFT non è ancora deployato.",
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
      message: "Il contratto NFT non è ancora deployato.",
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

// ======================== INTERFACE SUPPORT API ========================

app.get("/api/contract/supports-interface", async (req, res) => {
  try {
    if (!contract) {
      return res.status(503).json({
        error: "Contratto non disponibile",
        message: "Il contratto NFT non è ancora deployato.",
        contractAddress: CONTRACT_ADDRESS,
      });
    }

    const { interfaceId } = req.query;
    if (!interfaceId) {
      return res.status(400).json({
        error: "Parametro 'interfaceId' obbligatorio",
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
  console.log(`🌐 Network: ${provider.network?.name || "unknown"}`);
});

export default app;
