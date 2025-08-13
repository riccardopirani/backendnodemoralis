import express from "express";
import axios from "axios";
import { VERIFF_CONFIG } from "../config/constants.js";
import { generateVeriffSignature } from "../utils/helpers.js";

const router = express.Router();

const VERIFF_PUBLIC_KEY = VERIFF_CONFIG.PUBLIC_KEY;
const VERIFF_PRIVATE_KEY = VERIFF_CONFIG.PRIVATE_KEY;

// ===== VERIFF SESSIONS API =====

// Crea sessione di verifica semplificata
router.post("/session/create", async (req, res) => {
  try {
    const { person, callback, additionalData } = req.body;

    // Validazione dati minimi richiesti
    if (!person || !person.firstName || !person.lastName) {
      return res.status(400).json({
        success: false,
        error: "Dati persona incompleti",
        required: ["person.firstName", "person.lastName"],
      });
    }

    // Struttura dati per Veriff v1
    const sessionData = {
      verification: {
        callback:
          callback ||
          `${process.env.BASE_URL || "http://localhost:4000"}/api/veriff-new/webhook`,
        person: {
          firstName: person.firstName,
          lastName: person.lastName,
          // Campi opzionali
          ...(person.idNumber && { idNumber: person.idNumber }),
          ...(person.phoneNumber && { phoneNumber: person.phoneNumber }),
          ...(person.gender && { gender: person.gender }),
          ...(person.dateOfBirth && { dateOfBirth: person.dateOfBirth }),
          ...(person.email && { email: person.email }),
          ...(person.maritalStatus && { maritalStatus: person.maritalStatus }),
          ...(person.isDeceased !== undefined && {
            isDeceased: person.isDeceased,
          }),
          ...(person.fullAddress && { fullAddress: person.fullAddress }),
          ...(person.vendorData && { vendorData: person.vendorData }),
          ...(person.endUserId && { endUserId: person.endUserId }),
        },
        // Dati aggiuntivi se forniti
        ...(additionalData && additionalData),
      },
    };

    console.log(
      "Creazione sessione Veriff con dati:",
      JSON.stringify(sessionData, null, 2),
    );

    // Chiamata API Veriff v1
    const response = await axios.post(
      "https://stationapi.veriff.com/v1/sessions",
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
        timeout: 30000, // 30 secondi timeout
      },
    );

    console.log("Risposta Veriff:", response.data);

    if (response.data && response.data.verification) {
      res.json({
        success: true,
        message: "Sessione Veriff creata con successo",
        sessionId: response.data.verification.id,
        session: response.data,
        verificationUrl: `https://station.veriff.com/sdk/${response.data.verification.id}`,
        instructions: {
          step1: "Sessione creata con successo",
          step2: "Utilizza il verificationUrl per aprire l'UI Veriff",
          step3: "Riceverai notifiche webhook al callback specificato",
        },
      });
    } else {
      throw new Error("Risposta Veriff non valida o mancante verification.id");
    }
  } catch (error) {
    console.error("Errore creazione sessione Veriff:", error);

    // Gestione errori specifici
    if (error.response) {
      console.error("Dettagli errore Veriff:", {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers,
      });

      res.status(error.response.status).json({
        success: false,
        error: "Errore API Veriff",
        details: error.response.data,
        status: error.response.status,
      });
    } else if (error.request) {
      res.status(503).json({
        success: false,
        error: "Impossibile raggiungere l'API Veriff",
        details: "Timeout o errore di connessione",
      });
    } else {
      res.status(500).json({
        success: false,
        error: "Errore interno durante la creazione della sessione",
        details: error.message,
      });
    }
  }
});

// Crea sessione con documento specifico
router.post("/session/create-with-document", async (req, res) => {
  try {
    const { person, document, callback, additionalData } = req.body;

    // Validazione dati
    if (!person || !person.firstName || !person.lastName) {
      return res.status(400).json({
        success: false,
        error: "Dati persona incompleti",
        required: ["person.firstName", "person.lastName"],
      });
    }

    if (!document || !document.type || !document.number || !document.country) {
      return res.status(400).json({
        success: false,
        error: "Dati documento incompleti",
        required: ["document.type", "document.number", "document.country"],
      });
    }

    // Struttura dati completa per Veriff v1
    const sessionData = {
      verification: {
        callback:
          callback ||
          `${process.env.BASE_URL || "http://localhost:4000"}/api/veriff-new/webhook`,
        person: {
          firstName: person.firstName,
          lastName: person.lastName,
          ...(person.idNumber && { idNumber: person.idNumber }),
          ...(person.phoneNumber && { phoneNumber: person.phoneNumber }),
          ...(person.gender && { gender: person.gender }),
          ...(person.dateOfBirth && { dateOfBirth: person.dateOfBirth }),
          ...(person.email && { email: person.email }),
          ...(person.maritalStatus && { maritalStatus: person.maritalStatus }),
          ...(person.isDeceased !== undefined && {
            isDeceased: person.isDeceased,
          }),
          ...(person.fullAddress && { fullAddress: person.fullAddress }),
          ...(person.vendorData && { vendorData: person.vendorData }),
          ...(person.endUserId && { endUserId: person.endUserId }),
        },
        document: {
          number: document.number,
          country: document.country,
          type: document.type,
          ...(document.idCardType && { idCardType: document.idCardType }),
          ...(document.firstIssue && { firstIssue: document.firstIssue }),
          ...(document.expiryDate && { expiryDate: document.expiryDate }),
        },
        proofOfAddress: {
          acceptableTypes: [
            { name: "UTILITY_BILL" },
            { name: "BANK_STATEMENT" },
            { name: "RENTAL_AGREEMENT" },
          ],
        },
        consents: [
          {
            type: "ine",
            approved: true,
          },
          {
            type: "document_verification",
            approved: true,
          },
        ],
        // Dati aggiuntivi se forniti
        ...(additionalData && additionalData),
      },
    };

    console.log(
      "Creazione sessione Veriff con documento:",
      JSON.stringify(sessionData, null, 2),
    );

    const response = await axios.post(
      "https://stationapi.veriff.com/v1/sessions",
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
        timeout: 30000,
      },
    );

    if (response.data && response.data.verification) {
      res.json({
        success: true,
        message: "Sessione Veriff con documento creata con successo",
        sessionId: response.data.verification.id,
        session: response.data,
        verificationUrl: `https://station.veriff.com/sdk/${response.data.verification.id}`,
        documentInfo: {
          type: document.type,
          number: document.number,
          country: document.country,
        },
        instructions: {
          step1: "Sessione creata con successo",
          step2: "Utilizza il verificationUrl per aprire l'UI Veriff",
          step3: "Carica e verifica il documento specificato",
          step4: "Riceverai notifiche webhook al callback specificato",
        },
      });
    } else {
      throw new Error("Risposta Veriff non valida");
    }
  } catch (error) {
    console.error("Errore creazione sessione Veriff con documento:", error);

    if (error.response) {
      res.status(error.response.status).json({
        success: false,
        error: "Errore API Veriff",
        details: error.response.data,
        status: error.response.status,
      });
    } else {
      res.status(500).json({
        success: false,
        error: "Errore interno durante la creazione della sessione",
        details: error.message,
      });
    }
  }
});

// Recupera sessione
router.get("/session/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: "Session ID richiesto",
      });
    }

    const response = await axios.get(
      `https://stationapi.veriff.com/v1/sessions/${sessionId}`,
      {
        headers: {
          "X-AUTH-CLIENT": VERIFF_PUBLIC_KEY,
          "X-SIGNATURE": generateVeriffSignature(
            { sessionId },
            VERIFF_PRIVATE_KEY,
          ),
        },
        timeout: 15000,
      },
    );

    res.json({
      success: true,
      sessionId,
      session: response.data,
      status: response.data.verification?.status || "unknown",
    });
  } catch (error) {
    console.error("Errore recupero sessione Veriff:", error);

    if (error.response) {
      res.status(error.response.status).json({
        success: false,
        error: "Errore API Veriff",
        details: error.response.data,
        status: error.response.status,
      });
    } else {
      res.status(500).json({
        success: false,
        error: "Errore interno durante il recupero della sessione",
        details: error.message,
      });
    }
  }
});

// Recupera verifica
router.get("/verification/:verificationId", async (req, res) => {
  try {
    const { verificationId } = req.params;

    if (!verificationId) {
      return res.status(400).json({
        success: false,
        error: "Verification ID richiesto",
      });
    }

    const response = await axios.get(
      `https://stationapi.veriff.com/v1/verifications/${verificationId}`,
      {
        headers: {
          "X-AUTH-CLIENT": VERIFF_PUBLIC_KEY,
          "X-SIGNATURE": generateVeriffSignature(
            { verificationId },
            VERIFF_PRIVATE_KEY,
          ),
        },
        timeout: 15000,
      },
    );

    res.json({
      success: true,
      verificationId,
      verification: response.data,
      status: response.data.verification?.status || "unknown",
    });
  } catch (error) {
    console.error("Errore recupero verifica Veriff:", error);

    if (error.response) {
      res.status(error.response.status).json({
        success: false,
        error: "Errore API Veriff",
        details: error.response.data,
        status: error.response.status,
      });
    } else {
      res.status(500).json({
        success: false,
        error: "Errore interno durante il recupero della verifica",
        details: error.message,
      });
    }
  }
});

// Webhook per ricevere notifiche
router.post("/webhook", async (req, res) => {
  try {
    const { status, verification, session } = req.body;

    console.log("Webhook Veriff ricevuto:", {
      timestamp: new Date().toISOString(),
      status,
      verificationId: verification?.id,
      sessionId: session?.id,
      body: req.body,
    });

    // Gestione diversi stati
    switch (status) {
      case "approved":
        console.log("✅ Verifica APPROVATA per:", verification?.id);
        break;
      case "declined":
        console.log("❌ Verifica RIFIUTATA per:", verification?.id);
        break;
      case "expired":
        console.log("⏰ Verifica SCADUTA per:", verification?.id);
        break;
      case "abandoned":
        console.log("🚫 Verifica ABBANDONATA per:", verification?.id);
        break;
      default:
        console.log(
          "ℹ️ Stato verifica sconosciuto:",
          status,
          "per:",
          verification?.id,
        );
    }

    // Log dettagli aggiuntivi se disponibili
    if (verification) {
      console.log("Dettagli verifica:", {
        id: verification.id,
        status: verification.status,
        documentType: verification.document?.type,
        documentNumber: verification.document?.number,
        personName: verification.person
          ? `${verification.person.firstName} ${verification.person.lastName}`
          : "N/A",
      });
    }

    res.status(200).json({
      success: true,
      message: "Webhook Veriff ricevuto con successo",
      status,
      verificationId: verification?.id,
      sessionId: session?.id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Errore webhook Veriff:", error);
    res.status(500).json({
      success: false,
      error: "Errore durante la gestione del webhook",
      details: error.message,
    });
  }
});

// Test endpoint per verificare la configurazione
router.get("/test", async (req, res) => {
  try {
    // Test generazione firma
    const testData = {
      verification: {
        callback: "https://example.com/callback",
        person: {
          firstName: "John",
          lastName: "Doe"
        }
      }
    };
    
    const signature = generateVeriffSignature(testData, VERIFF_PRIVATE_KEY);
    
    res.json({
      success: true,
      message: "Router Veriff v1 funzionante",
      config: {
        publicKey: VERIFF_PUBLIC_KEY ? "Configurato" : "Non configurato",
        privateKey: VERIFF_PRIVATE_KEY ? "Configurato" : "Non configurato",
        baseUrl: "https://stationapi.veriff.com/v1",
        endpoints: {
          createSession: "POST /session/create",
          createWithDocument: "POST /session/create-with-document",
          getSession: "GET /session/:sessionId",
          getVerification: "GET /verification/:verificationId",
          webhook: "POST /webhook",
        },
      },
      signatureTest: {
        testData,
        generatedSignature: signature,
        signatureLength: signature.length,
        note: "Verifica che la firma sia di 64 caratteri (32 bytes)"
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Errore test router",
      details: error.message,
    });
  }
});

// Test endpoint per verificare la generazione della firma
router.post("/test-signature", async (req, res) => {
  try {
    const { testData } = req.body;
    
    if (!testData) {
      return res.status(400).json({
        success: false,
        error: "testData richiesto nel body"
      });
    }
    
    const signature = generateVeriffSignature(testData, VERIFF_PRIVATE_KEY);
    
    res.json({
      success: true,
      message: "Test generazione firma completato",
      input: testData,
      generatedSignature: signature,
      signatureLength: signature.length,
      expectedLength: 64,
      isValidLength: signature.length === 64,
      note: "La firma Veriff deve essere di 64 caratteri esadecimali"
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Errore test firma",
      details: error.message,
    });
  }
});

// Test endpoint per verificare la struttura dati minima
router.post("/test-minimal-request", async (req, res) => {
  try {
    // Ricevi parametri dal body della richiesta
    const { 
      callback = "https://example.com/callback",
      firstName = "riccardo",
      lastName = "Doe",
      additionalFields = {}
    } = req.body;

    // Costruisci i dati dinamicamente
    const minimalData = {
      verification: {
        callback,
        person: {
          firstName,
          lastName,
          ...additionalFields // Permette di aggiungere campi extra per test
        }
      }
    };

    console.log("🧪 Test richiesta minima con parametri:", {
      received: req.body,
      built: minimalData
    });

    const response = await axios.post(
      "https://stationapi.veriff.com/v1/sessions",
      minimalData,
      {
        headers: {
          "Content-Type": "application/json",
          "X-AUTH-CLIENT": VERIFF_PUBLIC_KEY,
          "X-SIGNATURE": generateVeriffSignature(minimalData, VERIFF_PRIVATE_KEY),
        },
        timeout: 30000,
      }
    );

    res.json({
      success: true,
      message: "Test richiesta minima riuscito",
      receivedParams: req.body,
      builtData: minimalData,
      response: response.data,
      note: "Questa struttura dati funziona con l'API Veriff v1"
    });

  } catch (error) {
    console.error("❌ Test richiesta minima fallito:", error.response?.data || error.message);
    
    res.status(400).json({
      success: false,
      error: "Test richiesta minima fallito",
      details: error.response?.data || error.message,
      status: error.response?.status,
      note: "Controlla i log per vedere l'errore specifico"
    });
  }
});

// Test endpoint per verificare diversi formati
router.post("/test-different-formats", async (req, res) => {
  try {
    const testCases = [
      {
        name: "Formato 1: Solo firstName e lastName",
        data: {
          verification: {
            callback: "https://example.com/callback",
            person: {
              firstName: "John",
              lastName: "Doe"
            }
          }
        }
      },
      {
        name: "Formato 2: Con email",
        data: {
          verification: {
            callback: "https://example.com/callback",
            person: {
              firstName: "Jane",
              lastName: "Smith",
              email: "jane@example.com"
            }
          }
        }
      },
      {
        name: "Formato 3: Con telefono",
        data: {
          verification: {
            callback: "https://example.com/callback",
            person: {
              firstName: "Bob",
              lastName: "Johnson",
              phoneNumber: "1234567890"
            }
          }
        }
      }
    ];

    const results = [];

    for (const testCase of testCases) {
      try {
        console.log(`🧪 Testando: ${testCase.name}`);
        
        const response = await axios.post(
          "https://stationapi.veriff.com/v1/sessions",
          testCase.data,
          {
            headers: {
              "Content-Type": "application/json",
              "X-AUTH-CLIENT": VERIFF_PUBLIC_KEY,
              "X-SIGNATURE": generateVeriffSignature(testCase.data, VERIFF_PRIVATE_KEY),
            },
            timeout: 15000,
          }
        );

        results.push({
          name: testCase.name,
          success: true,
          response: response.data
        });

      } catch (error) {
        results.push({
          name: testCase.name,
          success: false,
          error: error.response?.data || error.message,
          status: error.response?.status
        });
      }
    }

    res.json({
      success: true,
      message: "Test diversi formati completato",
      results,
      note: "Controlla quali formati funzionano e quali no"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Errore durante i test",
      details: error.message,
    });
  }
});

export default router;
