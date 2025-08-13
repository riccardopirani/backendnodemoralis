import express from "express";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

const router = express.Router();

router.post("/create", async (req, res) => {
  try {
    const keypair = Keypair.generate();
    const wallet = {
      address: keypair.publicKey.toString(),
      privateKey: bs58.encode(keypair.secretKey),
      network: "solana",
      keypairType: "ed25519",
    };

    res.json({
      success: true,
      wallet,
      message: "Wallet Solana creato con successo",
    });
  } catch (error) {
    console.error("Errore creazione wallet:", error);
    res.status(500).json({
      success: false,
      error: "Errore durante la creazione del wallet",
    });
  }
});

export default router;
