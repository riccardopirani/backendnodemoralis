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
      verification: {
        callback:
          verification?.callback ||
          `${process.env.BASE_URL || 'http://localhost:4000'}/api/veriff/webhook`,
        person: {
          firstName: person?.givenName || "John",
          lastName: person?.lastName || "Doe",
          idNumber: person?.idNumber || "123456789",
          phoneNumber: person?.phoneNumber || "8888888888",
          gender: person?.gender || "M",
          dateOfBirth: person?.dateOfBirth || "1990-01-01",
          email: person?.email || "john.doe@example.com",
          maritalStatus: person?.maritalStatus || "single",
          isDeceased: person?.isDeceased || false
        },
        document: {
          number: document?.number || "B01234567",
          country: document?.country || "US",
          type: document?.type || "PASSPORT",
          idCardType: document?.idCardType || "CC",
          firstIssue: document?.firstIssue || "2022-01-01"
        },
        address: {
          fullAddress: person?.fullAddress || "123, Main Street, Your County, Anytown 12345"
        },
        proofOfAddress: {
          acceptableTypes: [
            {
              name: "UTILITY_BILL"
            }
          ]
        },
        vendorData: person?.vendorData || "1234567890",
        endUserId: person?.endUserId || "c1de400b-1877-4284-8494-071d37916197",
        consents: [
          {
            type: "ine",
            approved: true
          }
        ]
      }
    };

    const response = await axios.post(
      `https://stationapi.veriff.com/api/v1/sessions`,
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
      `https://stationapi.veriff.com/api/v1/sessions/${sessionId}`,
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
      `https://stationapi.veriff.com/api/v1/verifications/${verificationId}`,
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

router.post("/auth-url", async (req, res) => {
  try {
    const { 
      person, 
      document, 
      redirectUrl,
      theme = "light",
      language = "it"
    } = req.body;

    // Crea i dati per la sessione
    const sessionData = {
      verification: {
        callback: `${process.env.BASE_URL || 'http://localhost:4000'}/api/veriff/webhook`,
        person: {
          firstName: person?.firstName || "John",
          lastName: person?.lastName || "Doe",
          idNumber: person?.idNumber || "123456789",
          phoneNumber: person?.phoneNumber || "8888888888",
          gender: person?.gender || "M",
          dateOfBirth: person?.dateOfBirth || "1990-01-01",
          email: person?.email || "john.doe@example.com",
          maritalStatus: person?.maritalStatus || "single",
          isDeceased: person?.isDeceased || false
        },
        document: {
          number: document?.number || "B01234567",
          country: document?.country || "IT",
          type: document?.type || "PASSPORT",
          idCardType: document?.idCardType || "CC",
          firstIssue: document?.firstIssue || "2022-01-01"
        },
        address: {
          fullAddress: person?.fullAddress || "123, Via Roma, Milano, Italia 20100"
        },
        proofOfAddress: {
          acceptableTypes: [
            { name: "UTILITY_BILL" }
          ]
        },
        vendorData: person?.vendorData || "1234567890",
        endUserId: person?.endUserId || "c1de400b-1877-4284-8494-071d37916197",
        consents: [
          {
            type: "ine",
            approved: true
          }
        ]
      }
    };

    // Crea la sessione Veriff
    const response = await axios.post(
      `https://stationapi.veriff.com/api/v1/sessions`,
      sessionData,
      {
        headers: {
          "Content-Type": "application/json",
          "X-AUTH-CLIENT": VERIFF_PUBLIC_KEY,
          "X-SIGNATURE": generateVeriffSignature(sessionData, VERIFF_PRIVATE_KEY),
        },
      }
    );

    if (response.data && response.data.verification) {
      // Genera l'URL di autenticazione Veriff
      const veriffUrl = `https://station.veriff.com/sdk/${response.data.verification.id}?theme=${theme}&lang=${language}`;
      
      // Se è specificato un redirect, aggiungi il parametro
      const finalUrl = redirectUrl ? `${veriffUrl}&redirectUrl=${encodeURIComponent(redirectUrl)}` : veriffUrl;

      res.json({
        success: true,
        message: "URL di autenticazione Veriff generato con successo",
        sessionId: response.data.verification.id,
        authUrl: finalUrl,
        session: response.data,
        instructions: {
          openInNewTab: "Apri questo URL in una nuova tab per iniziare l'autenticazione",
          redirectAfterAuth: "L'utente verrà reindirizzato al redirectUrl dopo l'autenticazione",
          webhookNotification: "Riceverai una notifica webhook quando l'autenticazione sarà completata"
        }
      });
    } else {
      throw new Error("Risposta Veriff non valida");
    }

  } catch (error) {
    console.error("Errore generazione URL autenticazione Veriff:", error);
    res.status(500).json({
      success: false,
      error: "Errore durante la generazione dell'URL di autenticazione Veriff",
      details: error.message,
    });
  }
});

router.get("/quick-auth", async (req, res) => {
  try {
    // Dati di esempio per test rapido
    const sessionData = {
      verification: {
        callback: `${process.env.BASE_URL || 'http://localhost:4000'}/api/veriff/webhook`,
        person: {
          firstName: "Test",
          lastName: "User",
          idNumber: "123456789",
          phoneNumber: "8888888888",
          gender: "M",
          dateOfBirth: "1990-01-01",
          email: "test.user@example.com",
          maritalStatus: "single",
          isDeceased: false,
          fullAddress: "123, Test Street, Test City, Italy 12345",
          vendorData: "test123",
          endUserId: "test-user-123"
        },
        document: {
          number: "TEST123456",
          country: "IT",
          type: "PASSPORT",
          idCardType: "CC",
          firstIssue: "2022-01-01"
        },
        proofOfAddress: {
          acceptableTypes: [{ name: "UTILITY_BILL" }]
        },
        consents: [{ type: "ine", approved: true }]
      }
    };

    // Crea la sessione Veriff
    const response = await axios.post(
      `https://stationapi.veriff.com/api/v1/sessions`,
      sessionData,
      {
        headers: {
          "Content-Type": "application/json",
          "X-AUTH-CLIENT": VERIFF_PUBLIC_KEY,
          "X-SIGNATURE": generateVeriffSignature(sessionData, VERIFF_PRIVATE_KEY),
        },
      }
    );

    if (response.data && response.data.verification) {
      const veriffUrl = `https://station.veriff.com/sdk/${response.data.verification.id}?theme=light&lang=it`;
      
      res.json({
        success: true,
        message: "Test rapido - URL di autenticazione Veriff generato",
        sessionId: response.data.verification.id,
        authUrl: veriffUrl,
        instructions: {
          step1: "Copia l'authUrl e aprilo in una nuova tab",
          step2: "Completa il processo di autenticazione su Veriff",
          step3: "Riceverai una notifica webhook quando sarà completato",
          note: "Questo è un test con dati di esempio"
        }
      });
    } else {
      throw new Error("Risposta Veriff non valida");
    }

  } catch (error) {
    console.error("Errore test rapido Veriff:", error);
    res.status(500).json({
      success: false,
      error: "Errore durante il test rapido Veriff",
      details: error.message,
    });
  }
});

export default router;
