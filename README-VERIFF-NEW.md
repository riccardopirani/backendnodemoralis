# 🆕 Veriff v1 Router - Nuovo Sistema di Autenticazione

## 📋 Panoramica

Questo è un nuovo router per l'integrazione con Veriff che utilizza l'endpoint **v1** (`https://stationapi.veriff.com/v1/sessions`) come specificato nel tuo esempio curl.

## 🚀 Caratteristiche

- ✅ **Endpoint v1**: Utilizza `https://stationapi.veriff.com/v1/sessions`
- ✅ **Struttura semplificata**: Come nel tuo esempio curl
- ✅ **Gestione errori avanzata**: Timeout, retry e logging dettagliato
- ✅ **Validazione dati**: Controlli sui campi obbligatori
- ✅ **Webhook dedicato**: Endpoint separato per le notifiche
- ✅ **Test endpoint**: Verifica configurazione e connettività

## 🔧 Installazione

Il router è già integrato nel sistema. Assicurati di avere le variabili d'ambiente configurate:

```bash
# Nel file .env
VERIFF_PUBLIC_KEY=e51b1717-924b-4b5c-ab5e-69c40415ff54
VERIFF_PRIVATE_KEY=your_private_key_here
BASE_URL=http://localhost:4000
```

## 📡 Endpoint Disponibili

### Base Path: `/api/veriff-new`

| Metodo | Endpoint                        | Descrizione                 |
| ------ | ------------------------------- | --------------------------- |
| `GET`  | `/test`                         | Test configurazione router  |
| `POST` | `/session/create`               | Crea sessione semplice      |
| `POST` | `/session/create-with-document` | Crea sessione con documento |
| `GET`  | `/session/:sessionId`           | Recupera sessione           |
| `GET`  | `/verification/:verificationId` | Recupera verifica           |
| `POST` | `/webhook`                      | Webhook per notifiche       |

## 🧪 Test Rapido

### 1. Test Configurazione

```bash
curl -X GET "http://localhost:4000/api/veriff-new/test"
```

### 2. Crea Sessione Semplice (come nel tuo curl)

```bash
curl -X POST "http://localhost:4000/api/veriff-new/session/create" \
  -H "Content-Type: application/json" \
  -d '{
    "person": {
      "firstName": "John",
      "lastName": "Doe"
    }
  }'
```

### 3. Crea Sessione con Documento

```bash
curl -X POST "http://localhost:4000/api/veriff-new/session/create-with-document" \
  -H "Content-Type: application/json" \
  -d '{
    "person": {
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "jane@example.com"
    },
    "document": {
      "type": "PASSPORT",
      "number": "AB1234567",
      "country": "IT"
    }
  }'
```

## 📊 Struttura Dati

### Creazione Sessione Semplice

```json
{
  "person": {
    "firstName": "string (obbligatorio)",
    "lastName": "string (obbligatorio)",
    "email": "string (opzionale)",
    "phoneNumber": "string (opzionale)",
    "dateOfBirth": "YYYY-MM-DD (opzionale)",
    "gender": "M|F (opzionale)",
    "fullAddress": "string (opzionale)"
  },
  "callback": "string (opzionale, default: /api/veriff-new/webhook)"
}
```

### Creazione Sessione con Documento

```json
{
  "person": {
    "firstName": "string (obbligatorio)",
    "lastName": "string (obbligatorio)"
    // ... altri campi persona
  },
  "document": {
    "type": "PASSPORT|DRIVERS_LICENSE|ID_CARD|RESIDENCE_PERMIT|UTILITY_BILL (obbligatorio)",
    "number": "string (obbligatorio)",
    "country": "string (obbligatorio)",
    "idCardType": "string (opzionale)",
    "firstIssue": "YYYY-MM-DD (opzionale)",
    "expiryDate": "YYYY-MM-DD (opzionale)"
  },
  "callback": "string (opzionale)"
}
```

## 🔄 Flusso di Verifica

1. **Crea Sessione**: Chiama `/session/create` o `/session/create-with-document`
2. **Ricevi Session ID**: Veriff restituisce un `sessionId`
3. **Apri UI Veriff**: Usa l'URL fornito nel response
4. **Completa Verifica**: L'utente completa il processo su Veriff
5. **Ricevi Webhook**: Veriff invia notifica al tuo endpoint `/webhook`
6. **Controlla Stato**: Usa `/session/:sessionId` per verificare lo stato

## 📝 Esempi di Risposta

### Successo - Sessione Creata

```json
{
  "success": true,
  "message": "Sessione Veriff creata con successo",
  "sessionId": "veriff_session_123",
  "session": {
    /* dati completi sessione */
  },
  "verificationUrl": "https://station.veriff.com/sdk/veriff_session_123",
  "instructions": {
    "step1": "Sessione creata con successo",
    "step2": "Utilizza il verificationUrl per aprire l'UI Veriff",
    "step3": "Riceverai notifiche webhook al callback specificato"
  }
}
```

### Errore - Dati Mancanti

```json
{
  "success": false,
  "error": "Dati persona incompleti",
  "required": ["person.firstName", "person.lastName"]
}
```

## 🚨 Gestione Errori

Il router gestisce diversi tipi di errori:

- **400**: Dati richiesta non validi
- **401**: Autenticazione Veriff fallita
- **403**: Accesso negato
- **404**: Sessione non trovata
- **500**: Errore interno del server
- **503**: API Veriff non raggiungibile

## 🧪 Test Completi

### Script di Test Node.js

```bash
node test-veriff-new.js
```

### Script di Test Bash

```bash
./examples/veriff-new-curl-examples.sh
```

## 🔍 Debug e Logging

Il router include logging dettagliato:

- **Creazione sessione**: Log dei dati inviati e risposta ricevuta
- **Errori API**: Status code, response data e headers
- **Webhook**: Timestamp e dettagli completi delle notifiche
- **Timeout**: Gestione errori di connessione

## 🔗 Integrazione con Frontend

Il router è pronto per l'integrazione con frontend React/Angular/Vue:

```javascript
// Esempio chiamata frontend
const response = await fetch("/api/veriff-new/session/create", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    person: { firstName: "John", lastName: "Doe" },
  }),
});

const data = await response.json();
if (data.success) {
  // Apri UI Veriff
  window.open(data.verificationUrl, "_blank");
}
```

## 📚 Differenze con Router Precedente

| Caratteristica | Router Precedente  | Nuovo Router v1         |
| -------------- | ------------------ | ----------------------- |
| Endpoint       | `/api/v1/sessions` | `/v1/sessions`          |
| Base URL       | `api.veriff.com`   | `stationapi.veriff.com` |
| Struttura      | Complessa          | Semplificata            |
| Validazione    | Base               | Avanzata                |
| Error Handling | Base               | Dettagliato             |
| Logging        | Minimo             | Completo                |

## 🎯 Prossimi Passi

1. **Configura chiavi Veriff** nel file `.env`
2. **Testa connettività** con `/test`
3. **Crea prima sessione** con dati minimi
4. **Integra nel frontend** per l'UI utente
5. **Configura webhook** per notifiche in tempo reale

## 🆘 Supporto

Per problemi o domande:

- Controlla i log del server
- Verifica configurazione variabili d'ambiente
- Testa connettività con endpoint `/test`
- Controlla documentazione Veriff ufficiale

---

**Nota**: Questo router utilizza l'endpoint **v1** di Veriff come specificato nel tuo esempio curl. Assicurati che le tue chiavi API siano valide per questo endpoint.
