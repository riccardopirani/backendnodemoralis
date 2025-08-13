// Test per il nuovo router Veriff v1
// Esegui con: node test-veriff-new.js

import axios from "axios";

const BASE_URL = "http://localhost:4000";
const VERIFF_NEW_BASE = `${BASE_URL}/api/veriff-new`;

// Colori per console
const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
};

const log = (color, message) => {
  console.log(`${color}${message}${colors.reset}`);
};

const testEndpoint = async (
  method,
  endpoint,
  data = null,
  description = "",
) => {
  try {
    log(colors.blue, `\n🧪 Test: ${description || `${method} ${endpoint}`}`);

    const config = {
      method,
      url: `${VERIFF_NEW_BASE}${endpoint}`,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (data && (method === "POST" || method === "PUT" || method === "PATCH")) {
      config.data = data;
    }

    const response = await axios(config);

    log(colors.green, `✅ Successo (${response.status}):`);
    console.log(JSON.stringify(response.data, null, 2));

    return { success: true, data: response.data };
  } catch (error) {
    log(colors.red, `❌ Errore:`);
    if (error.response) {
      log(colors.red, `Status: ${error.response.status}`);
      console.log(JSON.stringify(error.response.data, null, 2));
    } else {
      console.log(error.message);
    }
    return { success: false, error: error.message };
  }
};

const runTests = async () => {
  log(colors.blue, "🚀 Avvio test per Veriff v1 Router");
  log(colors.yellow, `Base URL: ${BASE_URL}`);
  log(colors.yellow, `Veriff New Base: ${VERIFF_NEW_BASE}`);

  // Test 1: Endpoint di test
  await testEndpoint("GET", "/test", null, "Test configurazione router");

  // Test 1.5: Test generazione firma
  const testSignatureData = {
    verification: {
      callback: "https://example.com/callback",
      person: {
        firstName: "John",
        lastName: "Doe"
      }
    }
  };
  
  await testEndpoint(
    "POST", 
    "/test-signature", 
    { testData: testSignatureData }, 
    "Test generazione firma"
  );

  // Test 2: Crea sessione semplice
  const simpleSessionData = {
    person: {
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      phoneNumber: "1234567890",
    },
    callback: "https://example.com/callback",
  };

  await testEndpoint(
    "POST",
    "/session/create",
    simpleSessionData,
    "Creazione sessione semplice",
  );

  // Test 3: Crea sessione con documento
  const documentSessionData = {
    person: {
      firstName: "Jane",
      lastName: "Smith",
      email: "jane.smith@example.com",
      phoneNumber: "0987654321",
      dateOfBirth: "1985-06-15",
    },
    document: {
      type: "PASSPORT",
      number: "AB1234567",
      country: "IT",
      firstIssue: "2020-01-01",
    },
    callback: "https://example.com/callback",
  };

  await testEndpoint(
    "POST",
    "/session/create-with-document",
    documentSessionData,
    "Creazione sessione con documento",
  );

  // Test 4: Test con dati minimi (come nel curl dell'utente)
  const minimalData = {
    person: {
      firstName: "John",
      lastName: "Doe",
    },
  };

  await testEndpoint(
    "POST",
    "/session/create",
    minimalData,
    "Creazione sessione con dati minimi (curl example)",
  );

  log(colors.blue, "\n🏁 Test completati!");
};

// Gestione errori globali
process.on("unhandledRejection", (reason, promise) => {
  log(colors.red, "Unhandled Rejection at:");
  console.log(promise);
  log(colors.red, "Reason:");
  console.log(reason);
});

// Esegui i test
runTests().catch((error) => {
  log(colors.red, "Errore durante l'esecuzione dei test:");
  console.error(error);
  process.exit(1);
});
