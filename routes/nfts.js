import express from "express";
import axios from "axios";
import { CROSSMINT_CONFIG } from "../config/constants.js";
import { uploadToWeb3StorageFromUrl } from "../utils/helpers.js";

const router = express.Router();

const CROSSMINT_BASE_URL = CROSSMINT_CONFIG.BASE_URL;
const CROSSMINT_COLLECTION_ID = CROSSMINT_CONFIG.COLLECTION_ID;
const CROSSMINT_API_KEY = CROSSMINT_CONFIG.API_KEY;

router.post("/mint", async (req, res) => {
  const { to, uri, metadata, jsonCV } = req.body;

  let ipfsData = null;
  let finalUri = uri;

  // Se è fornito un jsonCV, caricalo su IPFS
  if (jsonCV) {
    try {
      const uploadResult = await uploadToWeb3StorageFromUrl(
        jsonCV,
        `cv_${Date.now()}.json`,
      );
      ipfsData = {
        cid: uploadResult.cid || uploadResult.ipfsHash,
        ipfsUrl: uploadResult.ipfsUrl || `ipfs://${uploadResult.ipfsHash}`,
        gatewayUrl:
          uploadResult.gatewayUrl ||
          `https://gateway.lighthouse.storage/ipfs/${uploadResult.ipfsHash}`,
        success: uploadResult.success,
        error: uploadResult.error || null,
      };
      finalUri = `ipfs://${uploadResult.ipfsHash}`;
      console.log(`✅ CV JSON caricato su IPFS: ${uploadResult.ipfsHash}`);
    } catch (cvError) {
      console.error("❌ Errore caricamento CV JSON su IPFS:", cvError);
      ipfsData = {
        error: cvError.message,
        success: false,
      };
      // Non bloccare il mint NFT se fallisce la creazione del CV
    }
  }
  console.log(ipfsData);

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
      uri: finalUri,
      metadata: mintData.metadata,
      collectionId: CROSSMINT_COLLECTION_ID,
      crossmintId: result.id,
      status: result.onChain?.status || result.status,
      chain: result.onChain?.chain || "polygon",
      contractAddress: result.onChain?.contractAddress || null,
      actionId: result.actionId || null,
      ipfs: ipfsData, // Dettagli IPFS se fornito jsonCV
      hasCV: !!jsonCV,
    });
  } catch (err) {
    console.error("Errore minting tramite Crossmint:", err);
    res.status(500).json({
      error: err.message,
      details:
        "Errore durante il minting tramite Crossmint. Verifica i parametri e la configurazione.",
      ipfs: ipfsData, // Restituisci comunque i dettagli IPFS anche in caso di errore
    });
  }
});

router.post("/mint/batch", async (req, res) => {
  try {
    const { nfts } = req.body;

    if (!Array.isArray(nfts) || nfts.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Parametro nfts deve essere un array non vuoto",
      });
    }

    const batchData = nfts.map((nft) => ({
      metadata: {
        name: nft.name,
        image: nft.image,
        description: nft.description || "",
        animation_url: nft.animation_url,
        attributes: nft.attributes || [],
      },
      recipient: nft.recipient,
      sendNotification: true,
      locale: "en-US",
    }));

    const localAxios = axios.create({
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": CROSSMINT_API_KEY,
      },
    });

    const response = await localAxios.post(
      `${CROSSMINT_BASE_URL}/collections/${CROSSMINT_COLLECTION_ID}/nfts/batch`,
      { nfts: batchData },
    );

    res.json({
      success: true,
      message: "NFT batch creati con successo",
      batch: response.data,
    });
  } catch (error) {
    console.error("Errore batch minting tramite Crossmint:", error);
    res.status(500).json({
      success: false,
      error:
        "Errore durante il batch minting tramite Crossmint. Verifica i parametri e la configurazione.",
      details: error.message,
    });
  }
});

router.get("/status/:crossmintId", async (req, res) => {
  try {
    const { crossmintId } = req.params;

    const localAxios = axios.create({
      headers: {
        "X-API-KEY": CROSSMINT_API_KEY,
      },
    });

    const response = await localAxios.get(
      `${CROSSMINT_BASE_URL}/nfts/${crossmintId}`,
    );

    res.json({
      success: true,
      nft: response.data,
    });
  } catch (error) {
    console.error("Errore recupero status NFT:", error);
    res.status(500).json({
      success: false,
      error: "Errore durante il recupero dello status dell'NFT",
      details: error.message,
    });
  }
});

router.patch("/update/:crossmintId", async (req, res) => {
  try {
    const { crossmintId } = req.params;
    const { metadata } = req.body;

    if (!metadata) {
      return res.status(400).json({
        success: false,
        error: "Parametro metadata è obbligatorio",
      });
    }

    const localAxios = axios.create({
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": CROSSMINT_API_KEY,
      },
    });

    const response = await localAxios.patch(
      `${CROSSMINT_BASE_URL}/nfts/${crossmintId}`,
      { metadata },
    );

    res.json({
      success: true,
      message: "NFT aggiornato con successo",
      nft: response.data,
    });
  } catch (error) {
    console.error("Errore aggiornamento NFT:", error);
    res.status(500).json({
      success: false,
      error: "Errore durante l'aggiornamento dell'NFT",
      details: error.message,
    });
  }
});

router.get("/metadata", async (req, res) => {
  try {
    const { page = 1, perPage = 10 } = req.query;

    const localAxios = axios.create({
      headers: {
        "X-API-KEY": CROSSMINT_API_KEY,
      },
    });

    const response = await localAxios.get(
      `${CROSSMINT_BASE_URL}/collections/${CROSSMINT_COLLECTION_ID}/nfts`,
      {
        params: {
          page: parseInt(page),
          perPage: parseInt(perPage),
        },
      },
    );

    const formattedNfts = response.data.nfts.map((nft) => ({
      id: nft.id,
      crossmintId: nft.crossmintId,
      name: nft.metadata?.name,
      description: nft.metadata?.description,
      image: nft.metadata?.image,
      animation_url: nft.metadata?.animation_url,
      attributes: nft.metadata?.attributes,
      recipient: nft.recipient,
      status: nft.status,
      createdAt: nft.createdAt,
      updatedAt: nft.updatedAt,
    }));

    res.json({
      success: true,
      nfts: formattedNfts,
      pagination: {
        page: parseInt(page),
        perPage: parseInt(perPage),
        total: response.data.total || formattedNfts.length,
      },
    });
  } catch (error) {
    console.error("Errore recupero metadati NFT:", error);
    res.status(500).json({
      success: false,
      error: "Errore durante il recupero dei metadati degli NFT",
      details: error.message,
    });
  }
});

export default router;
