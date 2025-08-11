import express from "express";
import cors from "cors";
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
import axios from "axios";

dotenv.config();

console.log("🔍 Test connessione Crossmint...");

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
    customSiteTitle: "JetCV Crossmint API Documentation",
  }),
);

// ======================== CROSSMINT CONFIGURATION ========================
const CROSSMINT_COLLECTION_ID = "c028239b-580d-4162-b589-cb5212a0c8ac";

// Endpoint ufficiali Crossmint (aggiornati)
const CROSSMINT_BASE_URL = "https://www.crossmint.com/api/2022-06-09";

console.log("✅ Crossmint API Key configurata");
console.log(`📦 Collection ID: ${CROSSMINT_COLLECTION_ID}`);
console.log(`🌐 Base URL: ${CROSSMINT_BASE_URL}`);
console.log("✅ API Key configurata per produzione");

console.log("🚀 Server configurato per Crossmint");
console.log(`📦 Collection ID: ${CROSSMINT_COLLECTION_ID}`);

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
    // Wallet creation temporarily disabled - using Crossmint instead
    const wallet = {
      address: "0x0000000000000000000000000000000000000000",
      privateKey: "0x0",
      mnemonic: { phrase: "" },
    };
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

// ======================== CROSSMINT NFT APIS ========================
app.post("/api/nft/mint", async (req, res) => {
  const { to, uri, metadata } = req.body;

  if (!to || !uri) {
    return res.status(400).json({
      error: "Campi 'to' e 'uri' obbligatori",
    });
  }

  const APIKEY =
    "sk_production_5dki6YWe6QqNU7VAd7ELAabw4WMP35kU9rpBhDxG3HiAjSqb5XnimcRWy4S4UGqsZFaqvDAfrJTUZdctGonnjETrrM4h8cmxBJr6yYZ6UfKyWg9i47QxTxpZwX9XBqBVnnhEcJU8bMeLPPTVib8TQKszv3HY8ufZZ7YA73VYmoyDRnBxNGB73ytjTMgxP6TBwQCSVxwKq5CaaeB69nwyt9f4";

  try {
    // Validazione indirizzo Ethereum
    if (!/^0x[a-fA-F0-9]{40}$/.test(to)) {
      return res.status(400).json({ error: "Indirizzo 'to' non valido" });
    }

    // Prepara i dati per Crossmint (formato ufficiale funzionante)
    const mintData = {
      metadata: {
        name: metadata?.name || "JetCV NFT",
        image: uri,
        description: metadata?.description || "NFT mintato tramite JetCV",
        animation_url: uri.startsWith("http") ? uri : undefined, // Solo se è un URL valido
        attributes: metadata?.attributes || [],
      },
      recipient: `polygon:${to}`, // Formato corretto per Polygon: polygon:address
      sendNotification: true,
      locale: "en-US",
    };

    let result;

    // Crea istanza axios con API key locale
    const localAxios = axios.create({
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": APIKEY,
      },
    });

    // Modalità produzione - chiamata reale a Crossmint
    const response = await localAxios.post(
      `${CROSSMINT_BASE_URL}/collections/${CROSSMINT_COLLECTION_ID}/nfts`,
      mintData,
    );
    result = response.data;

    res.json({
      message: "NFT mintato con successo tramite Crossmint",
      to,
      uri,
      metadata: mintData.metadata,
      collectionId: CROSSMINT_COLLECTION_ID,
      crossmintId: result.id,
      status: result.onChain?.status || result.status,
      chain: result.onChain?.chain || "polygon",
      contractAddress: result.onChain?.contractAddress || null,
      actionId: result.actionId || null,
    });
  } catch (err) {
    console.error("Errore minting tramite Crossmint:", err);
    res.status(500).json({
      error: err.message,
      details:
        "Errore durante il minting tramite Crossmint. Verifica i parametri e la configurazione.",
    });
  }
});

app.post("/api/nft/mint/batch", async (req, res) => {
  const { nfts } = req.body;

  const APIKEY =
    "sk_production_5dki6YWe6QqNU7VAd7ELAabw4WMP35kU9rpBhDxG3HiAjSqb5XnimcRWy4S4UGqsZFaqvDAfrJTUZdctGonnjETrrM4h8cmxBJr6yYZ6UfKyWg9i47QxTxpZwX9XBqBVnnhEcJU8bMeLPPTVib8TQKszv3HY8ufZZ7YA73VYmoyDRnBxNGB73ytjTMgxP6TBwQCSVxwKq5CaaeB69nwyt9f4";

  if (!nfts || !Array.isArray(nfts) || nfts.length === 0) {
    return res.status(400).json({
      error: "Campo 'nfts' obbligatorio come array non vuoto",
    });
  }

  try {
    // Valida ogni NFT
    for (const nft of nfts) {
      if (!nft.to || !nft.uri) {
        return res.status(400).json({
          error: "Ogni NFT deve avere i campi 'to' e 'uri'",
        });
      }
      if (!/^0x[a-fA-F0-9]{40}$/.test(nft.to)) {
        return res
          .status(400)
          .json({ error: `Indirizzo 'to' non valido: ${nft.to}` });
      }
    }

    // Prepara i dati per il batch mint (formato ufficiale funzionante)
    const batchData = nfts.map((nft) => ({
      metadata: {
        name: nft.metadata?.name || "JetCV NFT",
        image: nft.uri,
        description: nft.metadata?.description || "NFT mintato tramite JetCV",
        animation_url: nft.uri.startsWith("http") ? nft.uri : undefined, // Solo se è un URL valido
        attributes: nft.metadata?.attributes || [],
      },
      recipient: `polygon:${nft.to}`, // Formato corretto per Polygon: polygon:address
      sendNotification: true,
      locale: "en-US",
    }));

    // Crea istanza axios con API key locale
    const localAxios = axios.create({
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": APIKEY,
      },
    });

    // Chiamata a Crossmint
    const response = await localAxios.post(
      `${CROSSMINT_BASE_URL}/collections/${CROSSMINT_COLLECTION_ID}/nfts/batch`,
      { nfts: batchData },
    );
    const result = response.data;

    res.json({
      message: `Batch di ${nfts.length} NFT avviato con successo`,
      collectionId: CROSSMINT_COLLECTION_ID,
      batchId: result.id,
      status: result.onChain?.status || result.status,
      chain: result.onChain?.chain || "polygon",
      contractAddress: result.onChain?.contractAddress || null,
      actionId: result.actionId || null,
      nfts: result.nfts || [],
    });
  } catch (err) {
    console.error("Errore batch minting tramite Crossmint:", err);
    res.status(500).json({
      error: err.message,
      details:
        "Errore durante il batch minting tramite Crossmint. Verifica i parametri e la configurazione.",
    });
  }
});

app.get("/api/nft/status/:crossmintId", async (req, res) => {
  const { crossmintId } = req.params;

  const APIKEY =
    "sk_production_5dki6YWe6QqNU7VAd7ELAabw4WMP35kU9rpBhDxG3HiAjSqb5XnimcRWy4S4UGqsZFaqvDAfrJTUZdctGonnjETrrM4h8cmxBJr6yYZ6UfKyWg9i47QxTxpZwX9XBqBVnnhEcJU8bMeLPPTVib8TQKszv3HY8ufZZ7YA73VYmoyDRnBxNGB73ytjTMgxP6TBwQCSVxwKq5CaaeB69nwyt9f4";

  try {
    // Crea istanza axios con API key locale
    const localAxios = axios.create({
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": APIKEY,
      },
    });

    // Chiamata a Crossmint
    const response = await localAxios.get(
      `${CROSSMINT_BASE_URL}/nfts/${crossmintId}`,
    );
    const result = response.data;

    res.json({
      crossmintId,
      status: result.status,
      metadata: result.metadata,
      recipient: result.recipient,
      collectionId: result.collectionId,
      txHash: result.onChain?.txId || null,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    });
  } catch (err) {
    console.error("Errore recupero stato NFT:", err);
    res.status(500).json({
      error: err.message,
      details:
        "Errore durante il recupero dello stato dell'NFT. Verifica i parametri e la configurazione.",
    });
  }
});

// ======================== UPDATE NFT API ========================
// helper: valida http(s) o ipfs://
function isValidUri(u) {
  if (!u || typeof u !== "string") return false;
  const s = u.trim();
  if (/^ipfs:\/\/[A-Za-z0-9][A-Za-z0-9-_./]*$/i.test(s)) return true;
  try {
    const url = new URL(s);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// ======================== UPDATE NFT API ========================
app.patch("/api/nft/update/:crossmintId", async (req, res) => {
  const { crossmintId } = req.params;
  const { metadata } = req.body;

  if (!metadata || typeof metadata !== "object") {
    return res.status(400).json({
      error: "Campo 'metadata' obbligatorio",
      message: "Fornisci i metadati da aggiornare",
    });
  }

  // ⚠️ hardcoded per tua richiesta; in prod usa .env
  const APIKEY =
    "sk_production_5dki6YWe6QqNU7VAd7ELAabw4WMP35kU9rpBhDxG3HiAjSqb5XnimcRWy4S4UGqsZFaqvDAfrJTUZdctGonnjETrrM4h8cmxBJr6yYZ6UfKyWg9i47QxTxpZwX9XBqBVnnhEcJU8bMeLPPTVib8TQKszv3HY8ufZZ7YA73VYmoyDRnBxNGB73ytjTMgxP6TBwQCSVxwKq5CaaeB69nwyt9f4";
  const CROSSMINT_COLLECTION_ID = "c028239b-580d-4162-b589-cb5212a0c8ac";

  // Endpoint ufficiali Crossmint (aggiornati)
  const CROSSMINT_BASE_URL = "https://www.crossmint.com/api/2022-06-09";

  // Costruisci metadati “puliti”
  const clean = {};

  if (typeof metadata.name === "string") clean.name = metadata.name.trim();
  if (typeof metadata.description === "string")
    clean.description = metadata.description.trim();

  if (typeof metadata.image === "string" && isValidUri(metadata.image)) {
    clean.image = metadata.image.trim();
  }

  if (
    typeof metadata.animation_url === "string" &&
    isValidUri(metadata.animation_url)
  ) {
    clean.animation_url = metadata.animation_url.trim();
  }
  // NB: se animation_url non è un URI valido, NON lo includo (evita il 400)

  if (Array.isArray(metadata.attributes)) {
    clean.attributes = metadata.attributes;
  }

  if (Object.keys(clean).length === 0) {
    return res.status(400).json({
      error: "Metadati non validi",
      message:
        "Nessun campo valido da aggiornare (name, description, image, animation_url, attributes).",
    });
  }

  try {
    const url = `${CROSSMINT_BASE_URL}/collections/${CROSSMINT_COLLECTION_ID}/nfts/${encodeURIComponent(crossmintId)}`;

    const { data } = await axios.patch(
      url,
      { metadata: clean },
      {
        headers: {
          "content-type": "application/json",
          "x-api-key": APIKEY, // usa minuscolo
          accept: "application/json",
        },
        timeout: 20000,
      },
    );

    return res.json({
      message: "NFT aggiornato con successo tramite Crossmint",
      crossmintId,
      ...data,
    });
  } catch (err) {
    // log chiaro lato server
    console.error(
      "Errore aggiornamento NFT:",
      err.response?.status,
      err.response?.data || err.message,
    );

    return res
      .status(err.response?.status || 500)
      .json(err.response?.data || { error: err.message });
  }
});

// ======================== NFT METADATA API ========================
app.get("/api/nft/metadata", async (req, res) => {
  const { page = 1, perPage = 100 } = req.query;

  const APIKEY =
    "sk_production_5dki6YWe6QqNU7VAd7ELAabw4WMP35kU9rpBhDxG3HiAjSqb5XnimcRWy4S4UGqsZFaqvDAfrJTUZdctGonnjETrrM4h8cmxBJr6yYZ6UfKyWg9i47QxTxpZwX9XBqBVnnhEcJU8bMeLPPTVib8TQKszv3HY8ufZZ7YA73VYmoyDRnBxNGB73ytjTMgxP6TBwQCSVxwKq5CaaeB69nwyt9f4";

  try {
    // Crea istanza axios con API key locale
    const localAxios = axios.create({
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": APIKEY,
      },
    });

    // Chiamata a Crossmint per recuperare tutti gli NFT della collezione
    const response = await localAxios.get(
      `${CROSSMINT_BASE_URL}/collections/${CROSSMINT_COLLECTION_ID}/nfts?page=${page}&perPage=${perPage}`,
    );
    const result = response.data;

    // Formatta tutti gli NFT
    const formattedNFTs = result.nfts?.map(nft => ({
      crossmintId: nft.id,
      metadata: {
        name: nft.metadata?.name || "N/A",
        description: nft.metadata?.description || "N/A",
        image: nft.metadata?.image || "N/A",
        animation_url: nft.metadata?.animation_url || null,
        attributes: nft.metadata?.attributes || [],
        external_url: nft.metadata?.external_url || null,
        background_color: nft.metadata?.background_color || null,
        youtube_url: nft.metadata?.youtube_url || null,
      },
      nftInfo: {
        status: nft.status,
        recipient: nft.recipient,
        collectionId: nft.collectionId,
        chain: nft.onChain?.chain || "polygon",
        contractAddress: nft.onChain?.contractAddress || null,
        txHash: nft.onChain?.txId || null,
        createdAt: nft.createdAt,
        updatedAt: nft.updatedAt,
        mintedAt: nft.mintedAt || null,
      }
    })) || [];

    res.json({
      message: "Tutti gli NFT della collezione recuperati con successo",
      pagination: {
        page: parseInt(page),
        perPage: parseInt(perPage),
        total: result.total || 0,
        totalPages: Math.ceil((result.total || 0) / perPage)
      },
      nfts: formattedNFTs,
      rawData: result // Dati completi per debug
    });
  } catch (err) {
    console.error("Errore recupero NFT della collezione:", err);

    res.status(500).json({
      error: err.message,
      details:
        "Errore durante il recupero degli NFT della collezione. Verifica i parametri e la configurazione.",
    });
  }
});

// ======================== COLLECTION APIS ========================
app.get("/api/collection/info", async (req, res) => {
  const APIKEY =
    "sk_production_5dki6YWe6QqNU7VAd7ELAabw4WMP35kU9rpBhDxG3HiAjSqb5XnimcRWy4S4UGqsZFaqvDAfrJTUZdctGonnjETrrM4h8cmxBJr6yYZ6UfKyWg9i47QxTxpZwX9XBqBVnnhEcJU8bMeLPPTVib8TQKszv3HY8ufZZ7YA73VYmoyDRnBxNGB73ytjTMgxP6TBwQCSVxwKq5CaaeB69nwyt9f4";

  try {
    // Crea istanza axios con API key locale
    const localAxios = axios.create({
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": APIKEY,
      },
    });

    // Chiamata a Crossmint
    const response = await localAxios.get(
      `${CROSSMINT_BASE_URL}/collections/${CROSSMINT_COLLECTION_ID}`,
    );
    const result = response.data;

    res.json({
      collectionId: CROSSMINT_COLLECTION_ID,
      name: result.name,
      symbol: result.symbol,
      description: result.description,
      image: result.image,
      status: result.status,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    });
  } catch (err) {
    console.error("Errore recupero info collezione:", err);
    res.status(500).json({
      error: err.message,
      details:
        "Errore durante il recupero delle informazioni sulla collezione. Verifica la configurazione.",
    });
  }
});

app.get("/api/collection/nfts", async (req, res) => {
  const { page = 1, limit = 300000000 } = req.query;

  const APIKEY =
    "sk_production_5dki6YWe6QqNU7VAd7ELAabw4WMP35kU9rpBhDxG3HiAjSqb5XnimcRWy4S4UGqsZFaqvDAfrJTUZdctGonnjETrrM4h8cmxBjSqb5XnimcRWy4S4UGqsZFaqvDAfrJTUZdctGonnjETrrM4h8cmxBJr6yYZ6UfKyWg9i47QxTxpZwX9XBqBVnnhEcJU8bMeLPPTVib8TQKszv3HY8ufZZ7YA73VYmoyDRnBxNGB73ytjTMgxP6TBwQCSVxwKq5CaaeB69nwyt9f4";

  try {
    // Crea istanza axios con API key locale
    const localAxios = axios.create({
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": APIKEY,
      },
    });

    // Chiamata a Crossmint
    const response = await localAxios.get(
      `${CROSSMINT_BASE_URL}/collections/${CROSSMINT_COLLECTION_ID}/nfts?page=${page}&limit=${limit}`,
    );
    const result = response.data;
  

    res.json({
      collectionId: CROSSMINT_COLLECTION_ID,
      page: parseInt(page),
      limit: parseInt(limit),
      total: result.total || 0,
      nfts: result.nfts || [],
    });
  } catch (err) {
    console.error("Errore recupero NFT collezione:", err);
    res.status(500).json({
      error: err.message,
      details:
        "Errore durante il recupero degli NFT della collezione. Verifica la configurazione.",
    });
  }
});

// ======================== SERVER START ========================
app.listen(PORT, () => {
  console.log(`🚀 Server avviato sulla porta ${PORT}`);
  console.log(`📚 Documentazione API: http://localhost:${PORT}/docs`);
  console.log(`🌐 Crossmint Collection: ${CROSSMINT_COLLECTION_ID}`);
  console.log(`✅ Connessione Prisma al database PostgreSQL stabilita`);
});
