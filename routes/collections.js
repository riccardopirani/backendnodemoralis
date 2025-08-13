import express from "express";
import axios from "axios";

const router = express.Router();

import { CROSSMINT_CONFIG } from "../config/constants.js";

const CROSSMINT_BASE_URL = CROSSMINT_CONFIG.BASE_URL;
const CROSSMINT_COLLECTION_ID = CROSSMINT_CONFIG.COLLECTION_ID;
const CROSSMINT_API_KEY = CROSSMINT_CONFIG.API_KEY;

router.get("/info", async (req, res) => {
  try {
    const localAxios = axios.create({
      headers: {
        "X-API-KEY": CROSSMINT_API_KEY,
      },
    });

    const response = await localAxios.get(
      `${CROSSMINT_BASE_URL}/collections/${CROSSMINT_COLLECTION_ID}`,
    );

    res.json({
      success: true,
      collection: response.data,
    });
  } catch (error) {
    console.error("Errore recupero info collezione:", error);
    res.status(500).json({
      success: false,
      error: "Errore durante il recupero delle informazioni della collezione",
      details: error.message,
    });
  }
});

export default router;
