# 🛡️ JetCV NFT API Server

> Backend Express per la gestione di CV in formato NFT, basato su **ethers.js**, **Moralis**, **Polygon**, **IPFS via Web3.Storage** e documentazione integrata via **Swagger**.

---

## 🚀 Funzionalità principali

- ✅ Autenticazione e gestione wallet EVM
- 🧾 Creazione NFT con caricamento IPFS (via `web3.storage`)
- ✏️ Aggiornamento contenuto NFT (URI/IPFS)
- 📄 Lettura dettagli NFT (owner, certificazioni, URI)
- 🔐 Certificazione delegata di NFT
- ⏱️ Configurazione dei tempi di approvazione
- 📘 Documentazione interattiva disponibile su [`/docs`](http://localhost:3000/docs)

---

## 📦 Installazione

```bash
git clone https://github.com/tuo-utente/jetcv-nft-api.git
cd jetcv-nft-api
npm install
```

---

## ⚙️ Configura file `.env`

Crea un file `.env` con le seguenti variabili:

```env
PRIVATE_KEY=0x...                             # Chiave privata usata per firmare le transazioni
ANKR_RPC_URL=https://...                      # RPC URL per la rete Polygon (via Ankr o altro provider)
CONTRACT_ADDRESS=0x...                        # Indirizzo del contratto JetCVNFT
WEB3_STORAGE_TOKEN=...                        # API token da Web3.Storage
LIGHTHOUSE_API_KEY=...                        # (facoltativo) API key Lighthouse
ENCRYPTION_KEY=1234567890abcdef1234567890abcdef  # 32-byte key AES (solo per boot iniziale)

# Azure Key Vault per gestione sicura delle chiavi
AZURE_KEY_VAULT_NAME=nome-del-tuo-vault
AZURE_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AZURE_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AZURE_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Moralis (dipendenza pronta per uso futuro)
MORALIS_API_KEY=...

PORT=3000
```

---

## ▶️ Avvio del server

```bash
npm start
```

> Visita `http://localhost:3000` per vedere la UI statica, oppure `http://localhost:3000/docs` per le API Swagger.

---

## 🔌 API principali

### 🔐 Wallet

| Metodo | Endpoint                       | Descrizione                |
| ------ | ------------------------------ | -------------------------- |
| POST   | `/api/wallet/create`           | Crea un wallet random      |
| GET    | `/api/wallet/:address/balance` | Legge il saldo MATIC       |
| GET    | `/api/token/:address`          | Legge token nativi (MATIC) |

---

### 🖼️ NFT

| Metodo | Endpoint                  | Descrizione                              |
| ------ | ------------------------- | ---------------------------------------- |
| GET    | `/api/nft/:address`       | Legge NFT associati a un address         |
| POST   | `/api/cv/mint`            | Esegue mint NFT da file JSON remoto      |
| POST   | `/api/cv/:tokenId/update` | Aggiorna URI NFT (da nuova risorsa IPFS) |
| GET    | `/api/cv/:tokenId`        | Legge owner, URI e certificazioni        |

---

### 🧾 Certificazioni

| Metodo | Endpoint                                 | Descrizione                       |
| ------ | ---------------------------------------- | --------------------------------- |
| POST   | `/api/cv/:tokenId/certification/propose` | Proponi certificazione            |
| POST   | `/api/cv/:tokenId/certification/approve` | Approva certificazione            |
| POST   | `/api/settings/minApprovalDelay`         | Imposta delay minimo approvazione |

---

## 🌍 Architettura & Tech Stack

- **Node.js** + **Express**
- **Ethers.js** per interazione con smart contract EVM
- **Polygon** RPC provider (via Ankr)
- **Web3.Storage** per caricare file su IPFS
- **Swagger UI** per documentazione integrata
- **Moralis** (solo dipendenza installata, non usata nel file corrente)

---

## 📁 Cartelle principali

```bash
.
├── contracts/                 # ABI del contratto JetCVNFT
├── ui/                       # Frontend statico visualizzabile su /
├── swagger.yaml             # Definizione API REST per Swagger
├── .env                     # Variabili ambiente
└── server.js                # Entrypoint principale del backend
```

---

## 🧪 Testing & Husky

Il progetto include supporto a:

- `jest` + `supertest` per test automatici
- `husky` per bloccare push se i test falliscono
- `docker-compose` per avvio in ambienti containerizzati

---

## 📘 Note finali

- Verifica che l’ABI sia corretto in `contracts/JetCVNFT.abi.json`
- Ricorda di generare manualmente il token su [https://web3.storage](https://web3.storage)
- Puoi usare [https://dashboard.ankr.com/](https://dashboard.ankr.com/) per ottenere un RPC URL gratuito per Polygon
