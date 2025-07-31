# 🛡️ JetCV NFT API Server

> Backend Express per la gestione di CV in formato NFT, basato su **ethers.js**, **Azure Key Vault**, **Polygon**, **IPFS via Web3.Storage** e documentazione integrata via **Swagger**.

---

## 🚀 Funzionalità principali

- ✅ Creazione wallet EVM con salvataggio sicuro su Azure Key Vault
- 🧾 Mint NFT con caricamento su IPFS (via `web3.storage`)
- ✏️ Aggiornamento URI NFT con nuovo contenuto IPFS
- 📄 Lettura completa NFT: owner, URI, certificazioni
- 🔐 Certificazioni firmate da entità terze
- 🔒 Cifratura e decifratura file con chiave AES da Key Vault
- ⏱️ Gestione delay di approvazione certificazioni
- 📘 Swagger UI disponibile su [`/docs`](http://localhost:3000/docs)

---

## 📦 Installazione

```bash
git clone https://github.com/tuo-utente/jetcv-nft-api.git
cd jetcv-nft-api
npm install
```

---

## ⚙️ Configura file `.env`

```env
# Chiave per transazioni
PRIVATE_KEY=0x...

# Provider RPC Polygon
ANKR_RPC_URL=https://rpc.ankr.com/polygon/...

# Indirizzo contratto JetCVNFT
CONTRACT_ADDRESS=0x...

# API Web3.Storage per IPFS
WEB3_STORAGE_TOKEN=...

# (Facoltativo) API Lighthouse
LIGHTHOUSE_API_KEY=...

# Chiave AES 256-bit (usata solo al primo avvio per popolamento su Key Vault)
ENCRYPTION_KEY=1234567890abcdef1234567890abcdef

# Azure Key Vault (gestione segreti)
AZURE_KEY_VAULT_NAME=nome-del-vault
AZURE_CLIENT_ID=xxxxxx
AZURE_TENANT_ID=xxxxxx
AZURE_CLIENT_SECRET=xxxxxx

# (Facoltativo) Moralis (attualmente non utilizzato)
MORALIS_API_KEY=...

# Database PostgreSQL (Amazon RDS)
DB_HOST=your-rds-endpoint.amazonaws.com
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_database_name
DB_PORT=5432

PORT=3000
```

---

## ▶️ Avvio del server

```bash
npm start
```

📍 Interfacce disponibili:

- `http://localhost:3000` → UI statica
- `http://localhost:3000/docs` → Swagger API

---

## 🔌 API principali

### 🔐 Wallet

| Metodo | Endpoint                       | Descrizione                                      |
| ------ | ------------------------------ | ------------------------------------------------ |
| POST   | `/api/wallet/create`           | Crea un nuovo wallet e salva chiavi su Key Vault |
| GET    | `/api/wallet/:address/balance` | Ottiene il saldo MATIC del wallet                |
| GET    | `/api/token/:address`          | Ottiene token nativi (MATIC)                     |
| GET    | `/api/wallet/:address`         | Recupera chiavi wallet da Azure Key Vault        |

---

### 🖼️ NFT

| Metodo | Endpoint                  | Descrizione                                 |
| ------ | ------------------------- | ------------------------------------------- |
| GET    | `/api/nft/:address`       | Elenca NFT associati all’utente             |
| POST   | `/api/cv/mint`            | Mint di NFT con contenuto da URL/IPFS       |
| POST   | `/api/cv/:tokenId/update` | Aggiorna URI NFT                            |
| GET    | `/api/cv/:tokenId`        | Restituisce URI, owner e certificazioni NFT |

---



### 👥 Utenti (Prisma ORM)

| Metodo | Endpoint                    | Descrizione                    |
| ------ | --------------------------- | ------------------------------ |
| POST   | `/api/users-prisma`         | Crea nuovo utente              |
| GET    | `/api/users-prisma`         | Lista utenti con conteggio wallet |
| GET    | `/api/users-prisma/:id`     | Dettagli utente con wallet     |
| PUT    | `/api/users-prisma/:id`     | Aggiorna utente                |
| DELETE | `/api/users-prisma/:id`     | Elimina utente                 |

### 💰 Wallet (Prisma ORM)

| Metodo | Endpoint                    | Descrizione                    |
| ------ | --------------------------- | ------------------------------ |
| POST   | `/api/wallets`              | Crea nuovo wallet              |
| GET    | `/api/wallets`              | Lista tutti i wallet           |
| GET    | `/api/wallets/:id`          | Dettagli wallet                |
| PUT    | `/api/wallets/:id`          | Aggiorna wallet                |
| DELETE | `/api/wallets/:id`          | Elimina wallet                 |
| GET    | `/api/wallets/user/:userId` | Wallet di un utente specifico  |

---

### 🧾 Certificazioni

| Metodo | Endpoint                                  | Descrizione                                |
| ------ | ----------------------------------------- | ------------------------------------------ |
| POST   | `/api/cv/:tokenId/certification/propose`  | Proponi una nuova certificazione           |
| POST   | `/api/cv/:tokenId/certification/approve`  | Approva una certificazione esistente       |
| GET    | `/api/certifications/:tokenId/:certIndex` | Ottiene dettagli di una certificazione     |
| GET    | `/api/certifications/:address`            | Elenca tutte le certificazioni dell’utente |

---

## 🌍 Architettura & Tech Stack

- **Node.js** + **Express**
- **Ethers.js** per smart contract EVM
- **Polygon** via Ankr RPC
- **Web3.Storage** per gestione file IPFS
- **Azure Key Vault** per sicurezza dei segreti
- **Swagger UI** per documentazione interattiva
- **PostgreSQL** su Amazon RDS per dati utenti e wallet
- **Prisma ORM** per gestione entità database (opzionale)

---

## 📁 Struttura progetto

```bash
.
├── config/                   # Configurazioni centralizzate
│   ├── database.js          # Configurazione PostgreSQL (per operazioni legacy)
│   └── prisma.js            # Configurazione Prisma ORM
├── controllers/              # Controller API
│   ├── UserPrisma.js        # Controller utenti (Prisma ORM)
│   └── WalletPrisma.js      # Controller wallet (Prisma ORM)
├── prisma/                   # Schema e configurazione Prisma
│   └── schema.prisma        # Schema del database
├── contracts/                # ABI del contratto JetCVNFT
├── ui/                       # Frontend statico visualizzabile su /
├── swagger.yaml             # Definizione API REST per Swagger
├── .env                     # Variabili ambiente
├── server.js                # Entrypoint principale del backend
└── PRISMA_SETUP.md         # Documentazione Prisma ORM
```

---

## 🧪 Testing & Husky

- ✅ `jest` + `supertest` per test automatici
- ✅ `husky` per bloccare push se i test falliscono
- ✅ `docker-compose` per ambienti containerizzati

---

## 📘 Note finali

- Verifica che l’ABI sia corretto in `contracts/JetCVNFT.abi.json`
- Genera un token da [https://web3.storage](https://web3.storage)
- Per RPC gratuito su Polygon: [https://dashboard.ankr.com](https://dashboard.ankr.com)
