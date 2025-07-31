import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

// Configurazione della connessione Prisma
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${
        process.env.DB_HOST
      }:${process.env.DB_PORT || 5432}/${process.env.DB_NAME}?sslmode=require`,
    },
  },
});

// Gestione degli eventi di connessione
prisma
  .$connect()
  .then(() => {
    console.log("✅ Connessione Prisma al database PostgreSQL stabilita");
  })
  .catch((err) => {
    console.error("❌ Errore connessione Prisma:", err);
  });

// Gestione della chiusura dell'applicazione
process.on("beforeExit", async () => {
  await prisma.$disconnect();
});

export default prisma;
