import express from "express";
import axios from "axios";
import { VERIFF_CONFIG } from "../config/constants.js";
import { generateVeriffSignature } from "../utils/helpers.js";

const router = express.Router();

const VERIFF_PUBLIC_KEY = VERIFF_CONFIG.PUBLIC_KEY;
const VERIFF_PRIVATE_KEY = VERIFF_CONFIG.PRIVATE_KEY;

router.post("/session-request-veriff", async (req, res) => {
  try {
    // Ricevi parametri dal body della richiesta
    const {
      callback = "https://example.com/callback",
      firstName = "riccardo",
      lastName = "Doe",
      additionalFields = {},
    } = req.body;

    // Costruisci i dati dinamicamente
    const minimalData = {
      verification: {
        callback,
        person: {
          firstName,
          lastName,
          ...additionalFields, // Permette di aggiungere campi extra per test
        },
      },
    };

    console.log("🧪 Test richiesta minima con parametri:", {
      received: req.body,
      built: minimalData,
    });

    const response = await axios.post(
      "https://stationapi.veriff.com/v1/sessions",
      minimalData,
      {
        headers: {
          "Content-Type": "application/json",
          "X-AUTH-CLIENT": VERIFF_PUBLIC_KEY,
          "X-SIGNATURE": generateVeriffSignature(
            minimalData,
            VERIFF_PRIVATE_KEY,
          ),
        },
        timeout: 30000,
      },
    );

    console.log("✅ Risposta Veriff ricevuta:", response.data);

    // Estrai Session ID e Session URL dalla risposta
    let sessionId = null;
    let sessionUrl = null;
    let verificationUrl = null;

    if (response.data && response.data.verification) {
      sessionId = response.data.verification.id;

      // Genera URL per l'UI Veriff
      if (sessionId) {
        verificationUrl = `https://station.veriff.com/sdk/${sessionId}`;
        sessionUrl = `https://alchemy.veriff.com/session/${sessionId}`;
      }
    }

    res.json({
      success: true,
      message: "Test richiesta minima riuscito",
      receivedParams: req.body,
      builtData: minimalData,
      response: response.data,
      // Dati estratti per facilitare l'uso
      sessionId,
      sessionUrl,
      verificationUrl,
      note: "Questa struttura dati funziona con l'API Veriff v1",
    });
  } catch (error) {
    console.error(
      "❌ Test richiesta minima fallito:",
      error.response?.data || error.message,
    );

    res.status(400).json({
      success: false,
      error: "Test richiesta minima fallito",
      details: error.response?.data || error.message,
      status: error.response?.status,
      note: "Controlla i log per vedere l'errore specifico",
    });
  }
});

export default router;
