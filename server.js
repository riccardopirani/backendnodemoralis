require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const { ethers, Wallet } = require("ethers");
const fs = require("fs");
const path = require("path");
const swaggerUi = require("swagger-ui-express");
const yaml = require("yaml");

const swaggerDocument = yaml.parse(fs.readFileSync("./swagger.yaml", "utf8"));
const app = express();
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use(express.json());
app.use(cookieParser());

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const ANKR_RPC = process.env.ANKR_RPC_URL;

if (!ANKR_RPC || !PRIVATE_KEY) {
  console.error("Errore: ANKR_RPC_URL o PRIVATE_KEY non impostati in .env");
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(ANKR_RPC);
const signer = new Wallet(PRIVATE_KEY, provider);

const ABI_PATH = path.join(__dirname, "contracts", "JetCVNFT.abi.json");
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

if (!CONTRACT_ADDRESS || !fs.existsSync(ABI_PATH)) {
  console.error("Errore: CONTRACT_ADDRESS non impostato o ABI non trovato");
  process.exit(1);
}

const ABI = JSON.parse(fs.readFileSync(ABI_PATH, "utf8"));
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

const axios = require("axios");
const { Web3Storage, File } = require("web3.storage");

function makeStorageClient() {
  return new Web3Storage({ token: process.env.WEB3_STORAGE_TOKEN });
}

async function uploadToWeb3StorageFromUrl(fileUrl, filename) {
  try {
    const response = await axios.get(fileUrl, { responseType: "arraybuffer" });
    const buffer = Buffer.from(response.data);

    const file = new File([buffer], filename, {
      type: response.headers["content-type"] || "application/octet-stream",
    });
    const client = makeStorageClient();
    const cid = await client.put([file]);

    return `ipfs://${cid}/${filename}`;
  } catch (err) {
    throw new Error(`Errore durante l'upload su Web3.Storage: ${err.message}`);
  }
}
// Crea un nuovo wallet
app.post("/api/wallet/create", async (req, res) => {
  try {
    const wallet = Wallet.createRandom();
    res.json({
      address: wallet.address,
      privateKey: wallet.privateKey,
      mnemonic: wallet.mnemonic.phrase,
    });
  } catch (err) {
    res.status(500).json({ error: "Errore nella creazione del wallet" });
  }
});

// Saldo MATIC di un wallet
app.get("/api/wallet/:address/balance", async (req, res) => {
  const { address } = req.params;
  try {
    const balanceWei = await provider.getBalance(address);
    const balance = ethers.formatUnits(balanceWei, 18);
    res.json({ balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Leggi token ERC20 (bilanci) per un address (solo MATIC di default, ma puoi estendere facilmente)
app.get("/api/token/:address", async (req, res) => {
  const { address } = req.params;
  // Per ora restituiamo solo il saldo MATIC (nativo)
  try {
    const balanceWei = await provider.getBalance(address);
    const balance = ethers.formatUnits(balanceWei, 18);
    res.json([{ token: "MATIC", balance }]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Leggi NFT (ERC721) di un address su questo contratto
app.get("/api/nft/:address", async (req, res) => {
  const { address } = req.params;
  try {
    // Leggi tutti i token posseduti dall'address
    // ERC721 non prevede un metodo standard, ma di solito c'è una funzione "balanceOf" e "tokenOfOwnerByIndex"
    // Qui si assume che JetCVNFT sia 1:1 (ogni utente ha max 1 tokenId, mappato da userCVTokenId)
    const tokenId = await contract.userTokenId(address);
    if (tokenId == 0) {
      return res.json({ nfts: [] });
    }
    const uri = await contract.tokenURI(tokenId);
    res.json({ nfts: [{ tokenId: tokenId.toString(), uri }] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/cv/mint", async (req, res) => {
  const { address, uri } = req.body;

  if (!address || !uri) {
    return res
      .status(400)
      .json({ error: "Campi 'address' e 'uri' obbligatori" });
  }

  try {
    const filename = `cv-${Date.now()}.json`;
    const ipfsUri = await uploadToWeb3StorageFromUrl(uri, filename);

    const tx = await contract.mintTo(address, ipfsUri);
    const receipt = await tx.wait();
    const tokenId = await contract.userTokenId(address);

    res.json({
      message: "JetCV NFT mintato con successo",
      tokenId: tokenId.toString(),
      txHash: receipt.transactionHash,
      ipfsUri,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Proporre certificazione (certificatore delegato)
app.post("/api/cv/:tokenId/certification/propose", async (req, res) => {
  const { tokenId } = req.params;
  const { user, certURI, legalEntity } = req.body;

  if (!user || !certURI || !legalEntity) {
    return res.status(400).json({
      error: "Campi 'user', 'certURI' e 'legalEntity' sono obbligatori",
    });
  }

  try {
    const tx = await contract.draftCertification(user, certURI, legalEntity);
    const receipt = await tx.wait();

    res.json({
      message: "Certificazione proposta",
      tokenId,
      certURI,
      legalEntity,
      txHash: receipt.transactionHash,
    });
  } catch (err) {
    res.status(500).json({ error: err.reason || err.message });
  }
});

app.post("/api/cv/:tokenId/certification/approve", async (req, res) => {
  const { certIndex } = req.body;

  if (certIndex === undefined) {
    return res.status(400).json({ error: "Campo 'certIndex' obbligatorio" });
  }

  try {
    const tx = await contract.approveCertification(certIndex);
    const receipt = await tx.wait();

    res.json({
      message: "Certificazione approvata",
      certIndex,
      txHash: receipt.transactionHash,
    });
  } catch (err) {
    res.status(500).json({ error: err.reason || err.message });
  }
});

app.post("/api/cv/:tokenId/update", async (req, res) => {
  const { tokenId } = req.params;
  const { user, newURI } = req.body;

  if (!user || !newURI) {
    return res
      .status(400)
      .json({ error: "Campi 'user' e 'newURI' obbligatori" });
  }

  try {
    const tx = await contract.updateTokenURI(user, newURI);
    await tx.wait();
    res.json({ message: "CV aggiornato", tokenId, newURI });
  } catch (err) {
    res.status(500).json({ error: err.reason || err.message });
  }
});

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

app.get("/api/cv/:tokenId", async (req, res) => {
  const { tokenId } = req.params;

  try {
    const owner = await contract.ownerOf(tokenId);
    const uri = await contract.tokenURI(tokenId);
    const certifications = await contract.getCertifications(tokenId);

    res.json({
      tokenId,
      owner,
      uri,
      certifications,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use(express.static(path.join(__dirname, "ui")));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "ui", "index.html"));
});

const startServer = async () => {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server in ascolto su http://localhost:${PORT}`);
    console.log(`JetCVNFT contract: ${CONTRACT_ADDRESS}`);
  });
};

startServer();
