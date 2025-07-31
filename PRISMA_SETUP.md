# 🚀 Implementazione Prisma ORM

Questo progetto ora supporta Prisma ORM per la gestione delle entità del database PostgreSQL su Amazon RDS.

## 📁 Struttura File

```
├── config/
│   ├── database.js      # Configurazione PostgreSQL (per operazioni legacy)
│   └── prisma.js        # Configurazione Prisma ORM
├── controllers/
│   ├── UserPrisma.js    # Controller utenti (Prisma ORM)
│   └── WalletPrisma.js  # Controller wallet (Prisma ORM)
├── prisma/
│   └── schema.prisma    # Schema del database
└── PRISMA_SETUP.md      # Questa documentazione
```

## 🔧 Configurazione

### 1. Installazione Dipendenze

```bash
npm install prisma @prisma/client
```

### 2. Generazione Client Prisma

```bash
# Su Windows PowerShell (se npx non funziona)
node node_modules/.bin/prisma generate

# Su altri sistemi
npx prisma generate
```

### 3. Sincronizzazione Database

```bash
# Applica le migrazioni al database
npx prisma db push

# Oppure genera e applica migrazioni
npx prisma migrate dev --name init
```

## 🎯 Vantaggi di Prisma ORM

### ✅ Rispetto a Query SQL Tradizionali

1. **Type Safety**: TypeScript support completo
2. **Auto-completion**: IntelliSense per tutte le query
3. **Validazione**: Controlli automatici sui dati
4. **Relazioni**: Gestione automatica delle relazioni
5. **Migrazioni**: Gestione automatica delle modifiche al database
6. **Performance**: Query ottimizzate automaticamente

### 📊 Confronto Codice

**Prima (SQL tradizionale):**

```javascript
const result = await pool.query(
  `INSERT INTO users (name, email, password)
   VALUES ($1, $2, $3)
   RETURNING id, name, email`,
  [name, email, password],
);
```

**Dopo (Prisma ORM):**

```javascript
const user = await prisma.user.create({
  data: {
    name,
    email,
    password,
  },
  select: {
    id: true,
    name: true,
    email: true,
    createdAt: true,
  },
});
```

## 🛠️ API Endpoints

### Utenti (Prisma)

- `POST /api/users-prisma` - Crea utente
- `GET /api/users-prisma` - Lista utenti
- `GET /api/users-prisma/:id` - Dettagli utente con wallet
- `PUT /api/users-prisma/:id` - Aggiorna utente
- `DELETE /api/users-prisma/:id` - Elimina utente

### Wallet (Prisma)

- `POST /api/wallets` - Crea wallet
- `GET /api/wallets` - Lista wallet
- `GET /api/wallets/:id` - Dettagli wallet
- `PUT /api/wallets/:id` - Aggiorna wallet
- `DELETE /api/wallets/:id` - Elimina wallet
- `GET /api/wallets/user/:userId` - Wallet di un utente

## 🔄 Migrazione Graduale

Il progetto ora utilizza esclusivamente Prisma ORM per la gestione delle entità database:

- **Approccio Prisma**: `/api/users-prisma` e `/api/wallets` (Prisma ORM)

La migrazione è stata completata e il vecchio controller `User.js` è stato rimosso.

## 📝 Esempi di Utilizzo

### Creazione Utente con Wallet

```javascript
// 1. Crea utente
const user = await prisma.user.create({
  data: {
    name: "Mario Rossi",
    email: "mario@example.com",
    password: "password123",
  },
});

// 2. Crea wallet per l'utente
const wallet = await prisma.wallet.create({
  data: {
    userId: user.id,
    address: "0x123...",
    privateKey: "encrypted_key",
    mnemonic: "word1 word2...",
  },
});
```

### Query con Relazioni

```javascript
// Utente con tutti i suoi wallet
const userWithWallets = await prisma.user.findUnique({
  where: { id: 1 },
  include: {
    wallets: true,
  },
});

// Wallet con informazioni utente
const walletWithUser = await prisma.wallet.findUnique({
  where: { id: 1 },
  include: {
    user: {
      select: {
        id: true,
        name: true,
        email: true,
      },
    },
  },
});
```

## 🚨 Gestione Errori

Prisma fornisce codici di errore specifici:

- `P2002`: Violazione constraint unique
- `P2003`: Violazione foreign key
- `P2025`: Record non trovato
- `P2021`: Tabella non esistente

## 🔧 Comandi Utili

```bash
# Visualizza schema del database
npx prisma db pull

# Apri Prisma Studio (GUI per il database)
npx prisma studio

# Reset database
npx prisma db push --force-reset

# Genera client Prisma
npx prisma generate
```

## 📚 Risorse

- [Documentazione Prisma](https://www.prisma.io/docs)
- [Prisma Studio](https://www.prisma.io/studio)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
