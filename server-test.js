import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import yaml from "js-yaml";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { SERVER_CONFIG } from "./config/constants.js";
import routes from "./routes/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use(cors({ origin: "*", credentials: false }));

app.use("/api", routes);

const swaggerDocument = yaml.load(
  fs.readFileSync(path.join(__dirname, "swagger.yaml"), "utf8"),
);
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get("/", (req, res) => {
  res.json({
    message: "JetCV Backend API (Test Mode)",
    version: "2.3.0",
    status: "running",
    documentation: "/docs",
    endpoints: {
      wallets: "/api/wallet",
      nfts: "/api/nft",
      collections: "/api/collection",
      cv: "/api/cv",
      veriff: "/api/veriff",
    },
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

app.use("*", (req, res) => {
  res.status(404).json({ error: "Endpoint non trovato" });
});

app.use((error, req, res, next) => {
  console.error("Errore server:", error);
  res.status(500).json({ error: "Errore interno del server" });
});

app.listen(SERVER_CONFIG.PORT, () => {
  console.log(`🚀 Server di test avviato sulla porta ${SERVER_CONFIG.PORT}`);
  console.log(
    `📚 Documentazione API: http://localhost:${SERVER_CONFIG.PORT}/docs`,
  );
  console.log(`🌐 Crossmint Collection: c028239b-580d-4162-b589-cb5212a0c8ac`);
  console.log(`⚠️  Modalità test - senza database Prisma`);
});

process.on("SIGINT", () => {
  console.log("\n🛑 Arresto del server di test...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n🛑 Arresto del server di test...");
  process.exit(0);
});
