require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const Moralis = require("moralis").default;
const { Wallet } = require("ethers");
const swaggerUi = require("swagger-ui-express");
const fs = require("fs");
const yaml = require("yaml");

const swaggerDocument = yaml.parse(fs.readFileSync("./swagger.yaml", "utf8"));
const app = express();
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use(express.json());
app.use(cookieParser());

const startMoralis = async () => {
  await Moralis.start({ apiKey: process.env.MORALIS_API_KEY });
};

const requireAuth = async (req, res, next) => {
  const token = req.cookies["moralis_token"];
  if (!token) return res.status(401).json({ error: "Token mancante" });

  try {
    const user = await Moralis.Auth.verify({ token, network: "evm" });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token non valido" });
  }
};

app.post("/api/auth/request-message", async (req, res) => {
  const { address, chain } = req.body;

  try {
    const message = await Moralis.Auth.requestMessage({
      address,
      chain,
      statement: "Autenticazione su Moralis Wallet System",
      domain: process.env.DOMAIN.replace(/^https?:\/\//, ""),
      uri: process.env.DOMAIN,
      timeout: 60,
    });

    res.json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/verify", async (req, res) => {
  const { message, signature } = req.body;

  try {
    const verified = await Moralis.Auth.verify({
      message,
      signature,
      network: "evm",
    });

    res.cookie("moralis_token", verified.token, {
      httpOnly: true,
      sameSite: "Lax",
      secure: false,
    });

    res.json({ address: verified.address, profileId: verified.profileId });
  } catch (err) {
    res.status(401).json({ error: "Verifica fallita" });
  }
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("moralis_token");
  res.json({ message: "Logout effettuato" });
});

app.post("/api/wallet/create", requireAuth, async (req, res) => {
  try {
    const wallet = Wallet.createRandom();

    res.json({
      address: wallet.address,
      privateKey: wallet.privateKey,
      mnemonic: wallet.mnemonic.phrase,
    });
  } catch (err) {
    res.status(500).json({ error: "Errore nella creazione del wallet" });
  }
});

app.get("/api/wallet/:address/balance", requireAuth, async (req, res) => {
  const { address } = req.params;

  try {
    const result = await Moralis.EvmApi.balance.getNativeBalance({
      address,
      chain: "0x1",
    });

    res.json({
      balance: Moralis.EvmUtils.formatUnits(result.result.balance, 18),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/token/:address", requireAuth, async (req, res) => {
  const { address } = req.params;

  try {
    const result = await Moralis.EvmApi.token.getWalletTokenBalances({
      address,
      chain: "0x1",
    });

    res.json(result.toJSON());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/nft/:address", requireAuth, async (req, res) => {
  const { address } = req.params;

  try {
    const result = await Moralis.EvmApi.nft.getWalletNFTs({
      address,
      chain: "0x1",
    });

    res.json(result.toJSON());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/nft/mint", requireAuth, async (req, res) => {
  res
    .status(501)
    .json({ message: "Minting non supportato. Usa smart contract." });
});

const startServer = async () => {
  await startMoralis();

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server in ascolto su http://localhost:${PORT}`);
  });
};

startServer();
