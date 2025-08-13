# JetCV Backend - Struttura del Progetto

## Panoramica

Questo progetto è stato riorganizzato seguendo una struttura modulare moderna per migliorare la manutenibilità e la scalabilità del codice.

## Struttura delle Directory

```
backendnodemoralis/
├── config/                 # Configurazioni centralizzate
│   ├── constants.js        # Costanti dell'applicazione
│   └── prisma.js          # Configurazione Prisma
├── routes/                 # Route modulari
│   ├── index.js           # Router principale che registra tutte le route
│   ├── wallets.js         # API per la gestione dei wallet Solana
│   ├── nfts.js            # API per la gestione degli NFT e Crossmint
│   ├── collections.js     # API per la gestione delle collezioni
│   ├── cv.js              # API per la validazione e creazione CV JSON
│   └── veriff.js          # API per l'integrazione con Veriff
├── utils/                  # Funzioni utility
│   └── helpers.js         # Funzioni helper comuni
├── prisma/                 # Schema e migrazioni database
├── server.js               # Entry point dell'applicazione
└── swagger.yaml            # Documentazione API
```

## Architettura

### 1. Entry Point (`server.js`)

- Configurazione Express e middleware
- Connessione al database Prisma
- Registrazione delle route modulari
- Configurazione Swagger UI
- Gestione degli errori globali

### 2. Configurazione (`config/`)

- **constants.js**: Centralizza tutte le costanti (API keys, URL, configurazioni)
- **prisma.js**: Configurazione del client Prisma

### 3. Route Modulari (`routes/`)

Ogni modulo gestisce un dominio specifico dell'applicazione:

#### `wallets.js`

- `POST /api/wallet/create` - Creazione wallet Solana

#### `nfts.js`

- `POST /api/nft/mint` - Mint di NFT singolo
- `POST /api/nft/mint/batch` - Mint di NFT multipli
- `GET /api/nft/status/:crossmintId` - Status di un NFT
- `PATCH /api/nft/update/:crossmintId` - Aggiornamento metadata NFT
- `GET /api/nft/metadata` - Lista di tutti gli NFT con paginazione

#### `collections.js`

- `GET /api/collection/info` - Informazioni sulla collezione

#### `cv.js`

- `POST /api/cv/validate-and-create` - Validazione e creazione file CV JSON

#### `veriff.js`

- `POST /api/veriff/session/create` - Creazione sessione di verifica
- `GET /api/veriff/session/:sessionId` - Recupero sessione
- `GET /api/veriff/verification/:verificationId` - Recupero verifica
- `POST /api/veriff/webhook` - Webhook per notifiche

### 4. Utility (`utils/`)

- **helpers.js**: Funzioni comuni riutilizzabili
  - `uploadToWeb3StorageFromUrl()` - Upload IPFS tramite Lighthouse
  - `generateVeriffSignature()` - Generazione firme per Veriff
  - `validateJsonCV()` - Validazione JSON CV
  - `createCVFile()` - Creazione file CV sul filesystem

## Vantaggi della Nuova Struttura

1. **Modularità**: Ogni dominio ha il proprio file di route
2. **Manutenibilità**: Codice organizzato e facile da trovare
3. **Riutilizzabilità**: Funzioni utility condivise
4. **Configurazione Centralizzata**: Tutte le costanti in un unico posto
5. **Scalabilità**: Facile aggiungere nuovi moduli
6. **Testing**: Ogni modulo può essere testato indipendentemente

## Aggiunta di Nuove Funzionalità

### Per aggiungere una nuova API:

1. Creare un nuovo file in `routes/` (es: `routes/users.js`)
2. Definire le route nel nuovo file
3. Importare e registrare nel `routes/index.js`
4. Aggiornare `swagger.yaml` per la documentazione

### Per aggiungere nuove utility:

1. Aggiungere funzioni in `utils/helpers.js`
2. Importare dove necessario
3. Aggiornare la documentazione se necessario

## Configurazione

### Variabili d'Ambiente

Creare un file `.env` con:

```env
PORT=4000
NODE_ENV=development
VERIFF_PUBLIC_KEY=your_key
VERIFF_PRIVATE_KEY=your_key
LIGHTHOUSE_API_KEY=your_key
```

### Dipendenze

Le dipendenze principali sono gestite in `package.json`:

- Express per il server web
- Prisma per il database
- Swagger per la documentazione API
- Lighthouse per l'upload IPFS
- Solana Web3 per i wallet

## Deployment

### Docker

```bash
docker-compose up -d
```

### Locale

```bash
npm install
npm start
```

## Testing

### Test delle API

```bash
npm test
```

### Test Manuale

```bash
curl http://localhost:4000/health
curl http://localhost:4000/docs
```

## Integrazione Veriff

Il sistema Veriff è integrato per:

- Verifica dell'identità degli utenti
- Creazione di sessioni di verifica
- Gestione dei webhook per aggiornamenti di stato
- Recupero di informazioni sulle verifiche completate

### Flusso di Verifica:

1. Creazione sessione (`POST /api/veriff/session/create`)
2. Utente completa verifica su Veriff
3. Veriff invia webhook con risultato
4. Sistema aggiorna stato verifica
5. Recupero informazioni verifica (`GET /api/veriff/verification/:id`)

## Note Tecniche

- **ES Modules**: Il progetto utilizza ES modules (`import/export`)
- **Async/Await**: Tutte le operazioni asincrone utilizzano async/await
- **Error Handling**: Gestione errori centralizzata con try/catch
- **CORS**: Configurato per permettere accesso da qualsiasi origine
- **Validation**: Validazione input con controlli di tipo e presenza
- **IPFS**: Upload diretto tramite Lighthouse SDK integrato
