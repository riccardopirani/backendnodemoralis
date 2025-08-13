# JetCV Backend API

Backend Node.js per la gestione di NFT tramite Crossmint, wallet Solana, validazione CV JSON e autenticazione Veriff.

## 🚀 Caratteristiche

- **NFT Management**: Mint e gestione NFT tramite Crossmint API
- **Wallet Solana**: Creazione di wallet Solana con chiavi ed25519
- **CV Validation**: Validazione e creazione file CV JSON sul filesystem
- **IPFS Integration**: Upload diretto su Lighthouse IPFS tramite SDK integrato
- **Veriff Authentication**: Sistema di verifica identità tramite Veriff
- **Modular Architecture**: Struttura modulare moderna e scalabile
- **Swagger Documentation**: Documentazione API completa e interattiva

## 🏗️ Struttura del Progetto

```
backendnodemoralis/
├── config/                 # Configurazioni centralizzate
│   └── constants.js        # Costanti dell'applicazione
├── routes/                 # Route modulari
│   ├── index.js           # Router principale
│   ├── wallets.js         # API wallet Solana
│   ├── nfts.js            # API NFT e Crossmint
│   ├── collections.js     # API collezioni
│   ├── cv.js              # API validazione CV
│   └── veriff.js          # API autenticazione Veriff
├── utils/                  # Funzioni utility
│   └── helpers.js         # Helper comuni
├── prisma/                 # Schema database
├── server.js               # Entry point principale
└── swagger.yaml            # Documentazione API
```

## 📋 Prerequisiti

- Node.js >= 18.0.0
- PostgreSQL
- Account Crossmint
- Account Veriff
- Account Lighthouse IPFS

## 🛠️ Installazione

1. **Clona il repository**

```bash
git clone <repository-url>
cd backendnodemoralis
```

2. **Installa le dipendenze**

```bash
npm install
```

3. **Configura le variabili d'ambiente**

```bash
cp .env.example .env
# Modifica .env con le tue chiavi API
```

4. **Configura il database**

```bash
npm run db:generate
npm run db:migrate
```

5. **Avvia il server**

```bash
npm start
```

## 🔧 Configurazione

### Variabili d'Ambiente

Crea un file `.env` con:

```env
# Server
PORT=4000
NODE_ENV=development
BASE_URL=http://localhost:4000

# Crossmint
CROSSMINT_API_KEY=your_crossmint_api_key
CROSSMINT_COLLECTION_ID=your_collection_id

# Veriff
VERIFF_PUBLIC_KEY=your_veriff_public_key
VERIFF_PRIVATE_KEY=your_veriff_private_key

# IPFS
LIGHTHOUSE_API_KEY=your_lighthouse_api_key

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
```

## 📚 API Endpoints

### Wallet

- `POST /api/wallet/create` - Crea wallet Solana

### NFT

- `POST /api/nft/mint` - Mint NFT singolo
- `POST /api/nft/mint/batch` - Mint NFT multipli
- `GET /api/nft/status/:crossmintId` - Status NFT
- `PATCH /api/nft/update/:crossmintId` - Aggiorna metadata
- `GET /api/nft/metadata` - Lista NFT con paginazione

### Collection

- `GET /api/collection/info` - Informazioni collezione

### CV

- `POST /api/cv/validate-and-create` - Valida e crea CV JSON

### Veriff

- `POST /api/veriff/session/create` - Crea sessione verifica
- `GET /api/veriff/session/:sessionId` - Recupera sessione
- `GET /api/veriff/verification/:verificationId` - Recupera verifica
- `POST /api/veriff/webhook` - Webhook notifiche

## 🐳 Docker

### Avvio rapido

```bash
npm run docker-quick
```

### Deployment completo

```bash
npm run docker-deploy
```

## 🧪 Testing

### Test unitari

```bash
npm test
```

### Test server

```bash
npm run test:server
```

### Test manuale

```bash
curl http://localhost:4000/health
curl http://localhost:4000/docs
```

## 📖 Documentazione

- **Swagger UI**: http://localhost:4000/docs
- **Struttura progetto**: [STRUCTURE.md](./STRUCTURE.md)
- **API Reference**: Vedi swagger.yaml

## 🔐 Integrazione Veriff

Il sistema Veriff è integrato per la verifica dell'identità degli utenti:

1. **Creazione sessione**: `POST /api/veriff/session/create`
2. **Verifica utente**: L'utente completa la verifica su Veriff
3. **Webhook**: Veriff invia notifiche sui cambiamenti di stato
4. **Recupero risultati**: `GET /api/veriff/verification/:id`

### Flusso di verifica:

```
Utente → Crea Sessione → Veriff → Webhook → Sistema
```

## 🚀 Deployment

### AWS

```bash
npm run deploy-aws
```

### Docker

```bash
npm run docker-deploy
```

## 📝 Note Tecniche

- **ES Modules**: Utilizza ES modules (`import/export`)
- **Async/Await**: Operazioni asincrone con async/await
- **Error Handling**: Gestione errori centralizzata
- **CORS**: Configurato per accesso cross-origin
- **Validation**: Validazione input robusta
- **IPFS**: Upload diretto tramite Lighthouse SDK

## 🤝 Contribuire

1. Fork il progetto
2. Crea un branch per la feature (`git checkout -b feature/AmazingFeature`)
3. Commit le modifiche (`git commit -m 'Add AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Apri una Pull Request

## 📄 Licenza

Questo progetto è sotto licenza MIT - vedi [LICENSE](LICENSE) per i dettagli.

## 🆘 Supporto

Per supporto e domande:

- Email: support@jetcv.com
- Issues: [GitHub Issues](https://github.com/your-repo/issues)

## 🔄 Changelog

### v2.3.0

- ✨ Nuova struttura modulare
- 🔐 Integrazione Veriff per autenticazione
- 🎯 API organizzate per dominio
- 📚 Documentazione Swagger aggiornata
- 🛠️ Funzioni utility centralizzate
- 🏗️ Configurazione centralizzata

### v2.0.0

- 🚀 Integrazione Crossmint
- 💰 Wallet Solana
- 📄 Validazione CV JSON
- 🌐 Upload IPFS integrato
