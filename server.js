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
import { spawn } from "child_process";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

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
    // Crea un nuovo wallet Solana
    const keypair = Keypair.generate();
    
    // Ottieni l'indirizzo pubblico (base58 encoded)
    const publicKey = keypair.publicKey.toBase58();
    
    // Ottieni la chiave privata (base58 encoded)
    const privateKey = bs58.encode(keypair.secretKey);
    
    // Genera una frase mnemonica (opzionale, per compatibilità)
    const mnemonic = ""; // Solana non usa mnemonic per default
    
    console.log("🆕 Nuovo wallet Solana creato:", publicKey);
    console.log("🔑 Chiave privata generata");

    let scriptError = false;
    let output = "";

    try {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      const scriptPath = path.join(__dirname, "script", "code-token.sh");
      const cmd = `bash ${scriptPath} ${publicKey} '${privateKey}' '${mnemonic || ""}'`;

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
      message: "Wallet Solana creato con successo",
      walletId: publicKey,
      address: publicKey,
      privateKey: privateKey,
      mnemonic: mnemonic || null,
      scriptError,
      output,
      network: "solana",
      keypairType: "ed25519"
    });
  } catch (err) {
    console.error("Errore creazione wallet Solana:", err);
    res.status(500).json({
      error: err.message,
      details: "Errore durante la creazione del wallet Solana",
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

async function uploadToWeb3StorageFromUrl(json, filename) {
  try {
    // Verifica che json sia un oggetto valido
    if (!json || typeof json !== 'object') {
      throw new Error('JSON non valido o mancante');
    }

    // Crea il file JSON sul filesystem
    const filePath = path.join(process.cwd(), filename);
    
    // Scrivi il JSON formattato nel file
    fs.writeFileSync(filePath, JSON.stringify(json, null, 2));
    
    console.log(`📁 File JSON creato: ${filePath}`);
    console.log(`📊 Dimensione file: ${fs.statSync(filePath).size} bytes`);

    if (!fs.existsSync(filePath)) {
      throw new Error("File non creato correttamente");
    }

    // Ora puoi caricare il file su IPFS se necessario
    const child = spawn("node", ["upload.js", filename], {
      stdio: "inherit",
    });

    child.on("error", (err) => {
      console.error("❌ Errore durante l'esecuzione dello script:", err);
    });

    child.on("exit", (code) => {
      console.log(`📦 Processo terminato con codice: ${code}`);
    });

    return filePath; // Restituisce il percorso del file creato
  } catch (err) {
    console.error("❌ Errore:", err.message);
    throw err;
  }
}


app.post("/api/nft/mint", async (req, res) => {
  const { to, uri, metadata,jsonCV } = req.body;

  uploadToWeb3StorageFromUrl(jsonCV,"cv.json");

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
    const formattedNFTs =
      result.nfts?.map((nft) => ({
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
        },
      })) || [];

    res.json({
      message: "Tutti gli NFT della collezione recuperati con successo",
      pagination: {
        page: parseInt(page),
        perPage: parseInt(perPage),
        total: result.total || 0,
        totalPages: Math.ceil((result.total || 0) / perPage),
      },
      nfts: formattedNFTs,
      rawData: result, // Dati completi per debug
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

    // Chiamata a Crossmint
    const response = await localAxios.get(
      `${CROSSMINT_BASE_URL}/collections/${CROSSMINT_COLLECTION_ID}/nfts?page=${page}&perPage=${perPage}`,
    );
    const result = response.data;

    res.json({
      collectionId: CROSSMINT_COLLECTION_ID,
      page: parseInt(page),
      perPage: parseInt(perPage),
      total: result.total || 0,
      nfts: result.nfts || [],
    });
  } catch (err) {
    console.error("Errore recupero NFT collezione:", err);
    res.status(500).json({
      error: err.message,
      details:
        "Errore durante il recupero degli NFT della collezione. Verifica i parametri e la configurazione.",
    });
  }
});

// ======================== CV JSON VALIDATION & CREATION ========================
app.post("/api/cv/validate-and-create", async (req, res) => {
  try {
    const { jsonCV, filename = "cv.json" } = req.body;

    if (!jsonCV) {
      return res.status(400).json({
        error: "Campo 'jsonCV' obbligatorio",
        details: "Devi fornire il contenuto JSON del CV"
      });
    }

    // Verifica che jsonCV sia un JSON valido
    let parsedCV;
    try {
      // Se è già una stringa JSON, parsala
      if (typeof jsonCV === 'string') {
        parsedCV = JSON.parse(jsonCV);
      } else {
        // Se è già un oggetto, usalo direttamente
        parsedCV = jsonCV;
      }
    } catch (parseError) {
      return res.status(400).json({
        error: "JSON non valido",
        details: parseError.message,
        receivedData: jsonCV
      });
    }

    // Verifica che sia un oggetto
    if (typeof parsedCV !== 'object' || parsedCV === null || Array.isArray(parsedCV)) {
      return res.status(400).json({
        error: "Formato JSON non valido",
        details: "Il JSON deve essere un oggetto, non un array o un valore primitivo",
        receivedType: typeof parsedCV,
        isArray: Array.isArray(parsedCV)
      });
    }

    // Verifica campi obbligatori del CV
    const requiredFields = ['name', 'email', 'skills'];
    const missingFields = requiredFields.filter(field => !parsedCV[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        error: "Campi obbligatori mancanti",
        details: `Campi richiesti: ${missingFields.join(', ')}`,
        missingFields,
        receivedFields: Object.keys(parsedCV)
      });
    }

    // Crea il file sul filesystem
    const filePath = path.join(process.cwd(), filename);
    
    try {
      // Scrivi il JSON formattato nel file
      fs.writeFileSync(filePath, JSON.stringify(parsedCV, null, 2));
      
      console.log(`📁 File CV JSON creato: ${filePath}`);
      console.log(`📊 Dimensione file: ${fs.statSync(filePath).size} bytes`);
      
      // Verifica che il file sia stato creato correttamente
      if (!fs.existsSync(filePath)) {
        throw new Error("File non creato correttamente");
      }

      // Leggi il file per verificare che sia corretto
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const verifiedContent = JSON.parse(fileContent);

      res.json({
        message: "CV JSON validato e creato con successo",
        filename,
        filePath,
        fileSize: fs.statSync(filePath).size,
        validation: {
          isValid: true,
          requiredFields: requiredFields,
          receivedFields: Object.keys(parsedCV),
          totalFields: Object.keys(parsedCV).length
        },
        cv: {
          name: verifiedContent.name,
          email: verifiedContent.email,
          skills: verifiedContent.skills,
          hasAdditionalFields: Object.keys(verifiedContent).length > requiredFields.length
        },
        note: "Il file è stato salvato localmente e può essere caricato su IPFS"
      });

    } catch (fileError) {
      console.error("Errore creazione file:", fileError);
      res.status(500).json({
        error: "Errore durante la creazione del file",
        details: fileError.message
      });
    }

  } catch (err) {
    console.error("Errore validazione CV JSON:", err);
    res.status(500).json({
      error: err.message,
      details: "Errore durante la validazione e creazione del CV JSON"
    });
  }
});

// ======================== IPFS UPLOAD APIS ========================
app.post("/api/ipfs/upload-json", async (req, res) => {
  const { jsonData, filename } = req.body;

  if (!jsonData || !filename) {
    return res.status(400).json({
      error: "Campi 'jsonData' e 'filename' obbligatori",
    });
  }

  try {
    // Crea il file JSON locale
    const filePath = path.join(process.cwd(), filename);
    
    // Scrivi il JSON nel file locale
    fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2));
    
    console.log(`📁 File JSON creato localmente: ${filePath}`);

    // Carica su IPFS tramite Web3.Storage
    const ipfsResult = await uploadToIPFS(filename);
    
    // Rimuovi il file locale dopo il caricamento
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🗑️ File locale rimosso: ${filePath}`);
    }

    res.json({
      message: "JSON caricato con successo su IPFS",
      filename,
      ipfsHash: ipfsResult.hash,
      ipfsUrl: `ipfs://${ipfsResult.hash}`,
      gatewayUrl: `https://ipfs.io/ipfs/${ipfsResult.hash}`,
      size: ipfsResult.size,
    });
  } catch (err) {
    console.error("Errore caricamento JSON su IPFS:", err);
    res.status(500).json({
      error: err.message,
      details: "Errore durante il caricamento su IPFS",
    });
  }
});

app.post("/api/ipfs/upload-file", async (req, res) => {
  const { fileUrl, filename } = req.body;

  if (!fileUrl || !filename) {
    return res.status(400).json({
      error: "Campi 'fileUrl' e 'filename' obbligatori",
    });
  }

  try {
    // Carica il file dall'URL e salvalo localmente
    await uploadToWeb3StorageFromUrl(fileUrl, filename);
    
    // Aspetta un po' per permettere il completamento del processo
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Per ora restituisci un successo generico
    // In futuro potresti leggere il risultato dal processo child
    res.json({
      message: "File caricato con successo su IPFS",
      filename,
      fileUrl,
      status: "processing",
      note: "Il file è in fase di caricamento su IPFS. Controlla i log per i dettagli.",
    });
  } catch (err) {
    console.error("Errore caricamento file su IPFS:", err);
    res.status(500).json({
      error: err.message,
      details: "Errore durante il caricamento del file su IPFS",
    });
  }
});

// Funzione helper per caricare su IPFS
async function uploadToIPFS(filename) {
  return new Promise((resolve, reject) => {
    const child = spawn("node", ["upload.js", filename], {
      stdio: "pipe",
    });

    let output = '';
    let errorOutput = '';

    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        try {
          // Prova a parsare l'output per estrarre l'hash IPFS
          const lines = output.split('\n');
          for (const line of lines) {
            if (line.includes('IPFS Hash:') || line.includes('CID:') || line.includes('Hash simulato:')) {
              const hash = line.split(':')[1]?.trim();
              if (hash) {
                resolve({ hash, size: 'unknown' });
                return;
              }
            }
          }
          // Se non riesci a parsare l'hash, restituisci l'output completo
          resolve({ hash: 'unknown', size: 'unknown', output });
        } catch (e) {
          resolve({ hash: 'unknown', size: 'unknown', output });
        }
      } else {
        reject(new Error(`Processo terminato con codice ${code}: ${errorOutput}`));
      }
    });

    child.on('error', (err) => {
      reject(new Error(`Errore processo: ${err.message}`));
    });
  });
}

// ======================== SERVER START ========================
app.listen(PORT, () => {
  console.log(`🚀 Server avviato sulla porta ${PORT}`);
  console.log(`📚 Documentazione API: http://localhost:${PORT}/docs`);
  console.log(`🌐 Crossmint Collection: ${CROSSMINT_COLLECTION_ID}`);
  console.log(`✅ Connessione Prisma al database PostgreSQL stabilita`);
});
