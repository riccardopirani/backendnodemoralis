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
      firstName,
      lastName,
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

// Verifica lo stato di una sessione esistente
router.get("/session/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;

    console.log("🔍 Verifica sessione:", sessionId);

    const response = await axios.get(
      `https://stationapi.veriff.com/v1/sessions/${sessionId}`,
      {
        headers: {
          "X-AUTH-CLIENT": VERIFF_PUBLIC_KEY,
          "X-SIGNATURE": generateVeriffSignature("", VERIFF_PRIVATE_KEY), // Per GET requests
        },
        timeout: 30000,
      },
    );

    console.log("✅ Stato sessione recuperato:", response.data);

    res.json({
      success: true,
      message: "Stato sessione recuperato con successo",
      sessionId,
      sessionData: response.data,
      status: response.data.verification?.status || "unknown",
      createdAt: response.data.verification?.createdAt,
      updatedAt: response.data.verification?.updatedAt,
    });
  } catch (error) {
    console.error(
      "❌ Errore recupero sessione:",
      error.response?.data || error.message,
    );

    res.status(400).json({
      success: false,
      error: "Errore recupero sessione",
      details: error.response?.data || error.message,
      status: error.response?.status,
      sessionId: req.params.sessionId,
    });
  }
});

// Recupera i dettagli di una verifica completata
router.get("/verification/:verificationId", async (req, res) => {
  try {
    const { verificationId } = req.params;

    console.log("🔍 Recupero verifica:", verificationId);

    const response = await axios.get(
      `https://stationapi.veriff.com/v1/verifications/${verificationId}`,
      {
        headers: {
          "X-AUTH-CLIENT": VERIFF_PUBLIC_KEY,
          "X-SIGNATURE": generateVeriffSignature("", VERIFF_PRIVATE_KEY), // Per GET requests
        },
        timeout: 30000,
      },
    );

    console.log("✅ Dettagli verifica recuperati:", response.data);

    res.json({
      success: true,
      message: "Dettagli verifica recuperati con successo",
      verificationId,
      verificationData: response.data,
      status: response.data.verification?.status || "unknown",
      person: response.data.verification?.person,
      document: response.data.verification?.document,
      address: response.data.verification?.address,
      createdAt: response.data.verification?.createdAt,
      updatedAt: response.data.verification?.updatedAt,
    });
  } catch (error) {
    console.error(
      "❌ Errore recupero verifica:",
      error.response?.data || error.message,
    );

    res.status(400).json({
      success: false,
      error: "Errore recupero verifica",
      details: error.response?.data || error.message,
      status: error.response?.status,
      verificationId: req.params.verificationId,
    });
  }
});

// Webhook per ricevere notifiche da Veriff
router.post("/webhook", async (req, res) => {
  try {
    const webhookData = req.body;

    console.log("📨 Webhook Veriff ricevuto:", webhookData);

    // Verifica la firma del webhook per sicurezza
    const signature = req.headers["x-signature"];
    if (signature) {
      const expectedSignature = generateVeriffSignature(
        JSON.stringify(webhookData),
        VERIFF_PRIVATE_KEY,
      );
      if (signature !== expectedSignature) {
        console.warn("⚠️ Firma webhook non valida");
        return res.status(401).json({ error: "Firma non valida" });
      }
    }

    // Processa il webhook in base al tipo di evento
    const eventType = webhookData.type;
    const sessionId = webhookData.verification?.id;
    const status = webhookData.verification?.status;

    console.log(
      `🔄 Evento webhook: ${eventType} per sessione ${sessionId} - Status: ${status}`,
    );

    // Qui puoi aggiungere la logica per gestire diversi tipi di eventi
    switch (eventType) {
      case "session_created":
        console.log("✅ Nuova sessione creata");
        break;
      case "verification_approved":
        console.log("✅ Verifica approvata");
        break;
      case "verification_declined":
        console.log("❌ Verifica rifiutata");
        break;
      case "verification_expired":
        console.log("⏰ Verifica scaduta");
        break;
      default:
        console.log(`ℹ️ Evento non gestito: ${eventType}`);
    }

    // Salva i dati del webhook se necessario
    // await saveWebhookData(webhookData);

    res.json({
      success: true,
      message: "Webhook processato con successo",
      eventType,
      sessionId,
      status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Errore processamento webhook:", error);

    res.status(500).json({
      success: false,
      error: "Errore processamento webhook",
      details: error.message,
    });
  }
});

// Test endpoint per verificare la configurazione
router.get("/test", async (req, res) => {
  try {
    res.json({
      success: true,
      message: "API Veriff funzionante",
      config: {
        publicKey: VERIFF_PUBLIC_KEY ? "Configurato" : "Non configurato",
        privateKey: VERIFF_PRIVATE_KEY ? "Configurato" : "Non configurato",
        baseUrl: "https://stationapi.veriff.com/v1",
      },
      endpoints: {
        createSession: "POST /api/veriff/session-request-veriff",
        getSession: "GET /api/veriff/session/:sessionId",
        getVerification: "GET /api/veriff/verification/:verificationId",
        webhook: "POST /api/veriff/webhook",
        test: "GET /api/veriff/test",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Errore test API",
      details: error.message,
    });
  }
});

export default router;
