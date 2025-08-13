import express from "express";
import axios from "axios";
import { CROSSMINT_CONFIG } from "../config/constants.js";
import { uploadToWeb3StorageFromUrl } from "../utils/helpers.js";

const router = express.Router();

const CROSSMINT_BASE_URL = CROSSMINT_CONFIG.BASE_URL;
const CROSSMINT_COLLECTION_ID = CROSSMINT_CONFIG.COLLECTION_ID;
const CROSSMINT_API_KEY = CROSSMINT_CONFIG.API_KEY;

router.post("/mint", async (req, res) => {
  try {
    const {
      name,
      description,
      image,
      animation_url,
      attributes,
      recipient,
      jsonCV,
    } = req.body;

    if (!name || !image || !recipient) {
      return res.status(400).json({
        success: false,
        error: "Parametri mancanti: name, image e recipient sono obbligatori",
      });
    }

    let ipfsData = null;
    let hasCV = false;

    if (jsonCV && typeof jsonCV === "object") {
      try {
        const filename = `cv_${Date.now()}.json`;
        ipfsData = await uploadToWeb3StorageFromUrl(jsonCV, filename);
        hasCV = true;
      } catch (error) {
        console.error("Errore upload CV:", error);
        ipfsData = {
          success: false,
          cid: null,
          ipfsUrl: null,
          gatewayUrl: null,
          error: error.message,
        };
      }
    }

    const mintData = {
      metadata: {
        name,
        image,
        description: description || "",
        animation_url:
          animation_url &&
          (animation_url.startsWith("http") ||
            animation_url.startsWith("ipfs://"))
            ? animation_url
            : undefined,
        attributes: attributes || [],
      },
      recipient: recipient.startsWith("0x")
        ? `polygon:${recipient}`
        : recipient,
      sendNotification: true,
      locale: "en-US",
    };

    const localAxios = axios.create({
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": CROSSMINT_API_KEY,
      },
    });

    const response = await localAxios.post(
      `${CROSSMINT_BASE_URL}/collections/${CROSSMINT_COLLECTION_ID}/nfts`,
      mintData,
    );

    res.json({
      success: true,
      message: "NFT creato con successo",
      nft: response.data,
      ipfs: ipfsData,
      hasCV,
    });
  } catch (error) {
    console.error("Errore minting tramite Crossmint:", error);
    res.status(500).json({
      success: false,
      error:
        "Errore durante il minting tramite Crossmint. Verifica i parametri e la configurazione.",
      details: error.message,
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
        animation_url:
          nft.animation_url &&
          (nft.animation_url.startsWith("http") ||
            nft.animation_url.startsWith("ipfs://"))
            ? nft.animation_url
            : undefined,
        attributes: nft.attributes || [],
      },
      recipient: nft.recipient.startsWith("0x")
        ? `polygon:${nft.recipient}`
        : nft.recipient,
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
