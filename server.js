require("dotenv").config();
const express = require("express");
const Moralis = require("moralis").default;

const app = express();
app.use(express.json());

// 👉 Avvio Moralis
const startMoralis = async () => {
  await Moralis.start({ apiKey: process.env.MORALIS_API_KEY });
  console.log("🔌 Moralis connesso");
};

// 🧾 API Wallet - Balance
app.get("/api/wallet/:address/balance", async (req, res) => {
  const { address } = req.params;
  try {
    const result = await Moralis.EvmApi.balance.getNativeBalance({
      address,
      chain: "0x1", // Ethereum Mainnet
    });
    res.json({
      balance: Moralis.EvmUtils.formatUnits(result.result.balance, 18),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🧾 API Token - ERC20
app.get("/api/token/:address", async (req, res) => {
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

// 🧾 API NFT - Lettura NFT del wallet
app.get("/api/nft/:address", async (req, res) => {
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

// 🔨 API NFT - Mint simulato (non implementato)
app.post("/api/nft/mint", async (req, res) => {
  res.status(501).json({
    message: "⚠️ Minting NFT via Moralis REST non supportato. Usa smart contract.",
  });
});

// ▶️ Start server
const startServer = async () => {
  await startMoralis();

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Server in ascolto su http://localhost:${PORT}`);
  });
};

startServer();

