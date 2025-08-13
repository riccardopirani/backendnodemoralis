import express from "express";
import axios from "axios";
import { VERIFF_CONFIG } from "../config/constants.js";
import { generateVeriffSignature } from "../utils/helpers.js";

const router = express.Router();

const VERIFF_PUBLIC_KEY = VERIFF_CONFIG.PUBLIC_KEY;
const VERIFF_PRIVATE_KEY = VERIFF_CONFIG.PRIVATE_KEY;

router.post("/session/create", async (req, res) => {
  try {
    const { person, document, verification } = req.body;

    const sessionData = {
      verification: {
        callback:
          verification?.callback ||
          `${process.env.BASE_URL || "http://localhost:4000"}/api/veriff/webhook`,
        person: {
          firstName: person?.givenName || "John",
          lastName: person?.lastName || "Doe",
          idNumber: person?.idNumber || "123456789",
          phoneNumber: person?.phoneNumber || "8888888888",
          gender: person?.gender || "M",
          dateOfBirth: person?.dateOfBirth || "1990-01-01",
          email: person?.email || "john.doe@example.com",
          maritalStatus: person?.maritalStatus || "single",
          isDeceased: person?.isDeceased || false,
        },
        document: {
          number: document?.number || "B01234567",
          country: document?.country || "US",
          type: document?.type || "PASSPORT",
          idCardType: document?.idCardType || "CC",
          firstIssue: document?.firstIssue || "2022-01-01",
        },
        address: {
          fullAddress:
            person?.fullAddress ||
            "123, Main Street, Your County, Anytown 12345",
        },
        proofOfAddress: {
          acceptableTypes: [
            {
              name: "UTILITY_BILL",
            },
          ],
        },
        vendorData: person?.vendorData || "1234567890",
        endUserId: person?.endUserId || "c1de400b-1877-4284-8494-071d37916197",
        consents: [
          {
            type: "ine",
            approved: true,
          },
        ],
      },
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
      language = "it",
    } = req.body;

    // Crea i dati per la sessione
    const sessionData = {
      verification: {
        callback: `${process.env.BASE_URL || "http://localhost:4000"}/api/veriff/webhook`,
        person: {
          firstName: person?.firstName || "John",
          lastName: person?.lastName || "Doe",
          idNumber: person?.idNumber || "123456789",
          phoneNumber: person?.phoneNumber || "8888888888",
          gender: person?.gender || "M",
          dateOfBirth: person?.dateOfBirth || "1990-01-01",
          email: person?.email || "john.doe@example.com",
          maritalStatus: person?.maritalStatus || "single",
          isDeceased: person?.isDeceased || false,
        },
        document: {
          number: document?.number || "B01234567",
          country: document?.country || "IT",
          type: document?.type || "PASSPORT",
          idCardType: document?.idCardType || "CC",
          firstIssue: document?.firstIssue || "2022-01-01",
        },
        address: {
          fullAddress:
            person?.fullAddress || "123, Via Roma, Milano, Italia 20100",
        },
        proofOfAddress: {
          acceptableTypes: [{ name: "UTILITY_BILL" }],
        },
        vendorData: person?.vendorData || "1234567890",
        endUserId: person?.endUserId || "c1de400b-1877-4284-8494-071d37916197",
        consents: [
          {
            type: "ine",
            approved: true,
          },
        ],
      },
    };

    // Crea la sessione Veriff
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

    if (response.data && response.data.verification) {
      // Genera l'URL di autenticazione Veriff
      const veriffUrl = `https://station.veriff.com/sdk/${response.data.verification.id}?theme=${theme}&lang=${language}`;

      // Se è specificato un redirect, aggiungi il parametro
      const finalUrl = redirectUrl
        ? `${veriffUrl}&redirectUrl=${encodeURIComponent(redirectUrl)}`
        : veriffUrl;

      res.json({
        success: true,
        message: "URL di autenticazione Veriff generato con successo",
        sessionId: response.data.verification.id,
        authUrl: finalUrl,
        session: response.data,
        instructions: {
          openInNewTab:
            "Apri questo URL in una nuova tab per iniziare l'autenticazione",
          redirectAfterAuth:
            "L'utente verrà reindirizzato al redirectUrl dopo l'autenticazione",
          webhookNotification:
            "Riceverai una notifica webhook quando l'autenticazione sarà completata",
        },
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
        callback: `${process.env.BASE_URL || "http://localhost:4000"}/api/veriff/webhook`,
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
          endUserId: "test-user-123",
        },
        document: {
          number: "TEST123456",
          country: "IT",
          type: "PASSPORT",
          idCardType: "CC",
          firstIssue: "2022-01-01",
        },
        proofOfAddress: {
          acceptableTypes: [{ name: "UTILITY_BILL" }],
        },
        consents: [{ type: "ine", approved: true }],
      },
    };

    // Crea la sessione Veriff
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
          note: "Questo è un test con dati di esempio",
        },
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

// ===== DOCUMENT VERIFICATION APIs =====

// Lista dei tipi di documento supportati
router.get("/document-types", async (req, res) => {
  try {
    const documentTypes = {
      success: true,
      documentTypes: [
        {
          type: "PASSPORT",
          name: "Passaporto",
          description: "Passaporto internazionale",
          countries: ["IT", "US", "GB", "DE", "FR", "ES", "CA", "AU"],
          requiredFields: ["number", "country", "type", "firstIssue"],
          optionalFields: ["idCardType", "expiryDate"],
        },
        {
          type: "DRIVERS_LICENSE",
          name: "Patente di guida",
          description: "Patente di guida nazionale",
          countries: ["IT", "US", "GB", "DE", "FR", "ES", "CA", "AU"],
          requiredFields: ["number", "country", "type"],
          optionalFields: ["idCardType", "firstIssue", "expiryDate"],
        },
        {
          type: "ID_CARD",
          name: "Carta d'identità",
          description: "Carta d'identità nazionale",
          countries: ["IT", "US", "GB", "DE", "FR", "ES", "CA", "AU"],
          requiredFields: ["number", "country", "type", "idCardType"],
          optionalFields: ["firstIssue", "expiryDate"],
        },
        {
          type: "RESIDENCE_PERMIT",
          name: "Permesso di soggiorno",
          description: "Permesso di soggiorno per stranieri",
          countries: ["IT", "US", "GB", "DE", "FR", "ES", "CA", "AU"],
          requiredFields: ["number", "country", "type"],
          optionalFields: ["idCardType", "firstIssue", "expiryDate"],
        },
        {
          type: "UTILITY_BILL",
          name: "Bolletta utenze",
          description: "Documento di prova dell'indirizzo",
          countries: ["IT", "US", "GB", "DE", "FR", "ES", "CA", "AU"],
          requiredFields: ["type"],
          optionalFields: ["fullAddress", "issueDate"],
        },
      ],
      countries: [
        { code: "IT", name: "Italia" },
        { code: "US", name: "Stati Uniti" },
        { code: "GB", name: "Regno Unito" },
        { code: "DE", name: "Germania" },
        { code: "FR", name: "Francia" },
        { code: "ES", name: "Spagna" },
        { code: "CA", name: "Canada" },
        { code: "AU", name: "Australia" },
      ],
    };

    res.json(documentTypes);
  } catch (error) {
    console.error("Errore recupero tipi documento:", error);
    res.status(500).json({
      success: false,
      error: "Errore durante il recupero dei tipi di documento",
      details: error.message,
    });
  }
});

// Verifica documento specifico
router.post("/document/verify", async (req, res) => {
  try {
    const { documentData, personData } = req.body;

    // Validazione dati documento
    if (
      !documentData ||
      !documentData.type ||
      !documentData.number ||
      !documentData.country
    ) {
      return res.status(400).json({
        success: false,
        error: "Dati documento incompleti",
        required: ["type", "number", "country"],
      });
    }

    // Validazione dati persona
    if (!personData || !personData.firstName || !personData.lastName) {
      return res.status(400).json({
        success: false,
        error: "Dati persona incompleti",
        required: ["firstName", "lastName"],
      });
    }

    // Crea sessione di verifica documento
    const sessionData = {
      verification: {
        callback: `${process.env.BASE_URL || "http://localhost:4000"}/api/veriff/webhook`,
        person: {
          firstName: personData.firstName,
          lastName: personData.lastName,
          idNumber: personData.idNumber || "N/A",
          phoneNumber: personData.phoneNumber || "N/A",
          gender: personData.gender || "M",
          dateOfBirth: personData.dateOfBirth || "1990-01-01",
          email: personData.email || "user@example.com",
          maritalStatus: personData.maritalStatus || "single",
          isDeceased: personData.isDeceased || false,
          fullAddress: personData.fullAddress || "N/A",
          vendorData: personData.vendorData || "doc-verification",
          endUserId: personData.endUserId || `user-${Date.now()}`,
        },
        document: {
          number: documentData.number,
          country: documentData.country,
          type: documentData.type,
          idCardType: documentData.idCardType || "CC",
          firstIssue: documentData.firstIssue || "2020-01-01",
          expiryDate: documentData.expiryDate || null,
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
      },
    };

    // Crea la sessione Veriff
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

    if (response.data && response.data.verification) {
      const veriffUrl = `https://station.veriff.com/sdk/${response.data.verification.id}?theme=light&lang=it`;

      res.json({
        success: true,
        message: "Verifica documento avviata con successo",
        sessionId: response.data.verification.id,
        authUrl: veriffUrl,
        documentType: documentData.type,
        verificationData: {
          documentNumber: documentData.number,
          country: documentData.country,
          personName: `${personData.firstName} ${personData.lastName}`,
          verificationUrl: veriffUrl,
        },
        instructions: {
          step1: "Apri l'authUrl per iniziare la verifica del documento",
          step2: "Segui le istruzioni per caricare e verificare il documento",
          step3:
            "Riceverai una notifica webhook quando la verifica sarà completata",
          note: "Assicurati che il documento sia chiaro e leggibile",
        },
      });
    } else {
      throw new Error("Risposta Veriff non valida");
    }
  } catch (error) {
    console.error("Errore verifica documento:", error);
    res.status(500).json({
      success: false,
      error: "Errore durante la verifica del documento",
      details: error.message,
    });
  }
});

// Verifica multipla documenti
router.post("/document/verify-batch", async (req, res) => {
  try {
    const { documents, personData } = req.body;

    if (!Array.isArray(documents) || documents.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Array documenti richiesto e non vuoto",
      });
    }

    if (!personData || !personData.firstName || !personData.lastName) {
      return res.status(400).json({
        success: false,
        error: "Dati persona incompleti",
        required: ["firstName", "lastName"],
      });
    }

    const verificationSessions = [];

    // Crea sessioni per ogni documento
    for (const document of documents) {
      try {
        const sessionData = {
          verification: {
            callback: `${process.env.BASE_URL || "http://localhost:4000"}/api/veriff/webhook`,
            person: {
              firstName: personData.firstName,
              lastName: personData.lastName,
              idNumber: personData.idNumber || "N/A",
              phoneNumber: personData.phoneNumber || "N/A",
              gender: personData.gender || "M",
              dateOfBirth: personData.dateOfBirth || "1990-01-01",
              email: personData.email || "user@example.com",
              maritalStatus: personData.maritalStatus || "single",
              isDeceased: personData.isDeceased || false,
              fullAddress: personData.fullAddress || "N/A",
              vendorData: personData.vendorData || "batch-verification",
              endUserId: personData.endUserId || `user-${Date.now()}`,
            },
            document: {
              number: document.number,
              country: document.country,
              type: document.type,
              idCardType: document.idCardType || "CC",
              firstIssue: document.firstIssue || "2020-01-01",
              expiryDate: document.expiryDate || null,
            },
            proofOfAddress: {
              acceptableTypes: [
                { name: "UTILITY_BILL" },
                { name: "BANK_STATEMENT" },
                { name: "RENTAL_AGREEMENT" },
              ],
            },
            consents: [
              { type: "ine", approved: true },
              { type: "document_verification", approved: true },
            ],
          },
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

        if (response.data && response.data.verification) {
          verificationSessions.push({
            documentType: document.type,
            documentNumber: document.number,
            sessionId: response.data.verification.id,
            authUrl: `https://station.veriff.com/sdk/${response.data.verification.id}?theme=light&lang=it`,
            status: "created",
          });
        }
      } catch (docError) {
        console.error(
          `Errore creazione sessione per documento ${document.type}:`,
          docError,
        );
        verificationSessions.push({
          documentType: document.type,
          documentNumber: document.number,
          error: docError.message,
          status: "failed",
        });
      }
    }

    res.json({
      success: true,
      message: `Verifica batch avviata per ${documents.length} documenti`,
      totalDocuments: documents.length,
      successfulSessions: verificationSessions.filter(
        (s) => s.status === "created",
      ).length,
      failedSessions: verificationSessions.filter((s) => s.status === "failed")
        .length,
      sessions: verificationSessions,
      instructions: {
        step1: "Ogni documento ha una sessione di verifica separata",
        step2: "Apri gli authUrl per ogni documento da verificare",
        step3: "Riceverai notifiche webhook per ogni verifica completata",
        note: "Le verifiche possono essere completate in parallelo",
      },
    });
  } catch (error) {
    console.error("Errore verifica batch documenti:", error);
    res.status(500).json({
      success: false,
      error: "Errore durante la verifica batch dei documenti",
      details: error.message,
    });
  }
});

// Stato verifica documento
router.get("/document/status/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Recupera stato sessione
    const sessionResponse = await axios.get(
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

    // Recupera stato verifica se disponibile
    let verificationStatus = null;
    if (sessionResponse.data.verification?.id) {
      try {
        const verificationResponse = await axios.get(
          `https://stationapi.veriff.com/api/v1/verifications/${sessionResponse.data.verification.id}`,
          {
            headers: {
              "X-AUTH-CLIENT": VERIFF_PUBLIC_KEY,
              "X-SIGNATURE": generateVeriffSignature(
                { verificationId: sessionResponse.data.verification.id },
                VERIFF_PRIVATE_KEY,
              ),
            },
          },
        );
        verificationStatus = verificationResponse.data;
      } catch (verificationError) {
        console.warn(
          "Impossibile recuperare stato verifica:",
          verificationError.message,
        );
      }
    }

    res.json({
      success: true,
      sessionId,
      sessionStatus: sessionResponse.data,
      verificationStatus,
      documentVerification: {
        isComplete: verificationStatus?.verification?.status === "approved",
        status: verificationStatus?.verification?.status || "pending",
        documentType: sessionResponse.data.verification?.document?.type,
        documentNumber: sessionResponse.data.verification?.document?.number,
        personName: verificationStatus?.verification?.person
          ? `${verificationStatus.verification.person.firstName} ${verificationStatus.verification.person.lastName}`
          : "N/A",
      },
    });
  } catch (error) {
    console.error("Errore recupero stato verifica documento:", error);
    res.status(500).json({
      success: false,
      error: "Errore durante il recupero dello stato della verifica documento",
      details: error.message,
    });
  }
});

// Lista tutte le verifiche documento
router.get("/document/verifications", async (req, res) => {
  try {
    const { page = 1, limit = 10, status, documentType } = req.query;

    // Nota: Veriff non fornisce un endpoint per listare tutte le verifiche
    // Questo è un endpoint di esempio che potrebbe essere implementato
    // con un database locale per tracciare le sessioni

    res.json({
      success: true,
      message: "Endpoint per listare verifiche documenti",
      note: "Questo endpoint richiede implementazione con database locale per tracciare le sessioni Veriff",
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: 0,
      },
      filters: {
        status: status || "all",
        documentType: documentType || "all",
      },
      verifications: [],
    });
  } catch (error) {
    console.error("Errore recupero verifiche documenti:", error);
    res.status(500).json({
      success: false,
      error: "Errore durante il recupero delle verifiche documenti",
      details: error.message,
    });
  }
});

// Webhook specifico per verifica documenti
router.post("/document/webhook", async (req, res) => {
  try {
    const { status, verification, document } = req.body;

    console.log("Webhook verifica documento ricevuto:", {
      status,
      verification,
      document,
    });

    // Log dettagliato per debugging
    if (verification) {
      console.log("Dettagli verifica:", {
        id: verification.id,
        status: verification.status,
        documentType: verification.document?.type,
        documentNumber: verification.document?.number,
        personName: verification.person
          ? `${verification.person.firstName} ${verification.person.lastName}`
          : "N/A",
        timestamp: new Date().toISOString(),
      });
    }

    // Gestisci diversi stati
    switch (status) {
      case "approved":
        console.log("✅ Verifica documento APPROVATA per:", verification.id);
        break;
      case "declined":
        console.log("❌ Verifica documento RIFIUTATA per:", verification.id);
        break;
      case "expired":
        console.log("⏰ Verifica documento SCADUTA per:", verification.id);
        break;
      case "abandoned":
        console.log("🚫 Verifica documento ABBANDONATA per:", verification.id);
        break;
      default:
        console.log(
          "ℹ️ Stato verifica documento sconosciuto:",
          status,
          "per:",
          verification.id,
        );
    }

    res.status(200).json({
      success: true,
      message: "Webhook verifica documento ricevuto",
      status,
      verificationId: verification?.id,
    });
  } catch (error) {
    console.error("Errore webhook verifica documento:", error);
    res.status(500).json({
      success: false,
      error: "Errore durante la gestione del webhook verifica documento",
    });
  }
});

export default router;
