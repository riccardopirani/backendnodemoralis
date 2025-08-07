import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

// Configurazione della connessione Prisma
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

// Gestione degli eventi di connessione
prisma
  .$connect()
  .then(() => {
    console.log("✅ Connessione Prisma al database PostgreSQL stabilita");
  })
  .catch((err) => {
    console.error("❌ Errore connessione Prisma:", err);
    // Non terminare l'applicazione se il database non è disponibile
    // L'applicazione può funzionare senza database per le operazioni blockchain
  });

// Gestione della chiusura dell'applicazione
process.on("beforeExit", async () => {
  await prisma.$disconnect();
});

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

export default prisma;
