import express from "express";
import axios from "axios";
import { VERIFF_CONFIG } from "../config/constants.js";
import { generateVeriffSignature } from "../utils/helpers.js";

const router = express.Router();

const VERIFF_BASE_URL = VERIFF_CONFIG.BASE_URL;
const VERIFF_PUBLIC_KEY = VERIFF_CONFIG.PUBLIC_KEY;
const VERIFF_PRIVATE_KEY = VERIFF_CONFIG.PRIVATE_KEY;

router.post("/session/create", async (req, res) => {
  try {
    const { person, document, verification } = req.body;

    const sessionData = {
      person: {
        givenName: person?.givenName || "John",
        lastName: person?.lastName || "Doe",
        idNumber: person?.idNumber || null,
      },
      document: {
        type: document?.type || "passport",
        country: document?.country || "US",
      },
      verification: {
        callback:
          verification?.callback ||
          `${process.env.BASE_URL}/api/veriff/webhook`,
        document: {
          type: document?.type || "passport",
        },
      },
    };

    const response = await axios.post(
      `${VERIFF_BASE_URL}/sessions`,
      sessionData,
      {
        headers: {
          "Content-Type": "application/json",
          "X-AUTH-CLIENT": VERIFF_PUBLIC_KEY,
          "X-SIGNATURE": generateVeriffSignature(
            sessionData,
            VERIFF_PRIVATE_KEY,
          ),
        },
      },
    );

    res.json({
      success: true,
      message: "Sessione Veriff creata con successo",
      session: response.data,
    });
  } catch (error) {
    console.error("Errore creazione sessione Veriff:", error);
    res.status(500).json({
      success: false,
      error: "Errore durante la creazione della sessione Veriff",
      details: error.message,
    });
  }
});

router.get("/session/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;

    const response = await axios.get(
      `${VERIFF_BASE_URL}/sessions/${sessionId}`,
      {
        headers: {
          "X-AUTH-CLIENT": VERIFF_PUBLIC_KEY,
          "X-SIGNATURE": generateVeriffSignature(
            { sessionId },
            VERIFF_PRIVATE_KEY,
          ),
        },
      },
    );

    res.json({
      success: true,
      session: response.data,
    });
  } catch (error) {
    console.error("Errore recupero sessione Veriff:", error);
    res.status(500).json({
      success: false,
      error: "Errore durante il recupero della sessione Veriff",
      details: error.message,
    });
  }
});

router.get("/verification/:verificationId", async (req, res) => {
  try {
    const { verificationId } = req.params;

    const response = await axios.get(
      `${VERIFF_BASE_URL}/verifications/${verificationId}`,
      {
        headers: {
          "X-AUTH-CLIENT": VERIFF_PUBLIC_KEY,
          "X-SIGNATURE": generateVeriffSignature(
            { verificationId },
            VERIFF_PRIVATE_KEY,
          ),
        },
      },
    );

    res.json({
      success: true,
      verification: response.data,
    });
  } catch (error) {
    console.error("Errore recupero verifica Veriff:", error);
    res.status(500).json({
      success: false,
      error: "Errore durante il recupero della verifica Veriff",
      details: error.message,
    });
  }
});

router.post("/webhook", async (req, res) => {
  try {
    const { status, verification } = req.body;

    console.log("Webhook Veriff ricevuto:", { status, verification });

    if (status === "approved") {
      console.log("Verifica approvata per:", verification.id);
    } else if (status === "declined") {
      console.log("Verifica rifiutata per:", verification.id);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Errore webhook Veriff:", error);
    res.status(500).json({ success: false });
  }
});

export default router;
