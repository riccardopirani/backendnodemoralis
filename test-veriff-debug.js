// Test per gli endpoint di debug Veriff
// Esegui con: node test-veriff-debug.js

import axios from 'axios';

const BASE_URL = 'http://localhost:4000';
const VERIFF_NEW_BASE = `${BASE_URL}/api/veriff-new`;

// Colori per console
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

const log = (color, message) => {
  console.log(`${color}${message}${colors.reset}`);
};

const testEndpoint = async (method, endpoint, data = null, description = '') => {
  try {
    log(colors.blue, `\n🧪 Test: ${description || `${method} ${endpoint}`}`);
    
    const config = {
      method,
      url: `${VERIFF_NEW_BASE}${endpoint}`,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
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

const runDebugTests = async () => {
  log(colors.blue, '🚀 Avvio test di debug per Veriff v1');
  log(colors.yellow, `Base URL: ${BASE_URL}`);
  log(colors.yellow, `Veriff New Base: ${VERIFF_NEW_BASE}`);

  // Test 1: Endpoint di test base
  await testEndpoint('GET', '/test', null, 'Test configurazione router');

  // Test 2: Test generazione firma
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
    'POST', 
    '/test-signature', 
    { testData: testSignatureData }, 
    'Test generazione firma'
  );

  // Test 3: Test richiesta minima (struttura del tuo curl)
  await testEndpoint(
    'POST', 
    '/test-minimal-request', 
    null, 
    'Test richiesta minima (struttura curl)'
  );

  // Test 4: Test diversi formati
  await testEndpoint(
    'POST', 
    '/test-different-formats', 
    null, 
    'Test diversi formati dati'
  );

  log(colors.blue, '\n🏁 Test di debug completati!');
  log(colors.yellow, '📝 Controlla i log del server per vedere i dettagli delle chiamate API Veriff');
  log(colors.green, '💡 Se la richiesta minima funziona, sapremo che il problema è nei parametri aggiuntivi');
};

// Gestione errori globali
process.on('unhandledRejection', (reason, promise) => {
  log(colors.red, 'Unhandled Rejection at:');
  console.log(promise);
  log(colors.red, 'Reason:');
  console.log(reason);
});

// Esegui i test
runDebugTests().catch(error => {
  log(colors.red, 'Errore durante l\'esecuzione dei test di debug:');
  console.error(error);
  process.exit(1);
});
