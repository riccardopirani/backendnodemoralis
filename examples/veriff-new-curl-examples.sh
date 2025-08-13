#!/bin/bash

# Esempi di comandi curl per testare le nuove API Veriff v1
# Assicurati che il server sia in esecuzione su localhost:4000

BASE_URL="http://localhost:4000"
VERIFF_NEW_BASE="${BASE_URL}/api/veriff-new"

echo "🚀 Test API Veriff v1 - Nuovo Router"
echo "======================================"
echo "Base URL: ${BASE_URL}"
echo "Veriff New Base: ${VERIFF_NEW_BASE}"
echo ""

# Colori per output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Funzione per stampare con colori
print_color() {
    echo -e "${1}${2}${NC}"
}

# Test 1: Endpoint di test
print_color $BLUE "🧪 Test 1: Endpoint di test"
print_color $YELLOW "GET ${VERIFF_NEW_BASE}/test"
curl -s -X GET "${VERIFF_NEW_BASE}/test" | jq '.'
echo ""

# Test 2: Crea sessione semplice (come nel curl dell'utente)
print_color $BLUE "🧪 Test 2: Crea sessione semplice (curl example)"
print_color $YELLOW "POST ${VERIFF_NEW_BASE}/session/create"
curl -s -X POST "${VERIFF_NEW_BASE}/session/create" \
  -H "Content-Type: application/json" \
  -d '{
    "person": {
      "firstName": "John",
      "lastName": "Doe"
    }
  }' | jq '.'
echo ""

# Test 3: Crea sessione con callback personalizzato
print_color $BLUE "🧪 Test 3: Crea sessione con callback personalizzato"
print_color $YELLOW "POST ${VERIFF_NEW_BASE}/session/create"
curl -s -X POST "${VERIFF_NEW_BASE}/session/create" \
  -H "Content-Type: application/json" \
  -d '{
    "person": {
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "jane.smith@example.com",
      "phoneNumber": "0987654321"
    },
    "callback": "https://example.com/callback"
  }' | jq '.'
echo ""

# Test 4: Crea sessione con documento
print_color $BLUE "🧪 Test 4: Crea sessione con documento"
print_color $YELLOW "POST ${VERIFF_NEW_BASE}/session/create-with-document"
curl -s -X POST "${VERIFF_NEW_BASE}/session/create-with-document" \
  -H "Content-Type: application/json" \
  -d '{
    "person": {
      "firstName": "Mario",
      "lastName": "Rossi",
      "email": "mario.rossi@example.com",
      "phoneNumber": "3331234567",
      "dateOfBirth": "1980-01-01"
    },
    "document": {
      "type": "PASSPORT",
      "number": "AB1234567",
      "country": "IT",
      "firstIssue": "2020-01-01"
    },
    "callback": "https://example.com/callback"
  }' | jq '.'
echo ""

# Test 5: Crea sessione con dati completi
print_color $BLUE "🧪 Test 5: Crea sessione con dati completi"
print_color $YELLOW "POST ${VERIFF_NEW_BASE}/session/create-with-document"
curl -s -X POST "${VERIFF_NEW_BASE}/session/create-with-document" \
  -H "Content-Type: application/json" \
  -d '{
    "person": {
      "firstName": "Giuseppe",
      "lastName": "Verdi",
      "idNumber": "VRDGPP80A01H501U",
      "phoneNumber": "3339876543",
      "gender": "M",
      "dateOfBirth": "1980-01-01",
      "email": "giuseppe.verdi@example.com",
      "maritalStatus": "married",
      "isDeceased": false,
      "fullAddress": "Via della Musica 123, Milano, Italia",
      "vendorData": "user-12345",
      "endUserId": "giuseppe-verdi-123"
    },
    "document": {
      "type": "ID_CARD",
      "number": "CA1234567",
      "country": "IT",
      "idCardType": "CC",
      "firstIssue": "2020-01-01",
      "expiryDate": "2030-01-01"
    },
    "callback": "https://example.com/callback"
  }' | jq '.'
echo ""

# Test 6: Simula webhook (se hai un sessionId valido)
print_color $BLUE "🧪 Test 6: Simula webhook (richiede sessionId valido)"
print_color $YELLOW "POST ${VERIFF_NEW_BASE}/webhook"
print_color $YELLOW "Nota: Questo è un test del webhook, non una vera notifica Veriff"
curl -s -X POST "${VERIFF_NEW_BASE}/webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "approved",
    "verification": {
      "id": "test_verification_123",
      "status": "approved",
      "document": {
        "type": "PASSPORT",
        "number": "AB1234567"
      },
      "person": {
        "firstName": "John",
        "lastName": "Doe"
      }
    },
    "session": {
      "id": "test_session_123"
    }
  }' | jq '.'
echo ""

print_color $GREEN "✅ Tutti i test completati!"
print_color $BLUE "📝 Controlla i log del server per vedere le chiamate API Veriff"
print_color $YELLOW "💡 Per testare con sessionId reali, usa i response dei test precedenti"
