import express from "express";
import prisma from "../config/prisma.js";

const router = express.Router();

router.post("/", async (req, res) => {
  let { userId, address, privateKey, mnemonic } = req.body || {};

  if (!userId || typeof userId !== "string") {
    return res.status(400).json({ error: "userId deve essere un UUID valido" });
  }
  if (!address || !address.trim()) {
    return res.status(400).json({ error: "L'indirizzo è obbligatorio" });
  }
  if (!privateKey || !privateKey.trim()) {
    return res.status(400).json({ error: "La privateKey è obbligatoria" });
  }
  mnemonic = mnemonic?.trim() || null;

  try {
    const wallet = await prisma.wallet.create({
      data: {
        userId: userId,
        address: address.trim(),
        privateKey: privateKey.trim(),
        mnemonic,
      },
      select: {
        id: true,
        address: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    res.status(201).json(wallet);
  } catch (err) {
    console.error("Errore creazione wallet:", err.message);
    if (err.code === "P2002") {
      return res.status(400).json({ error: "Indirizzo wallet già esistente" });
    }
    if (err.code === "P2003") {
      return res.status(400).json({ error: "Utente non trovato" });
    }
    res.status(500).json({ error: "Errore interno del server" });
  }
});

router.get("/", async (_req, res) => {
  try {
    const wallets = await prisma.wallet.findMany({
      select: {
        id: true,
        address: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    res.json(wallets);
  } catch (err) {
    console.error("Errore lettura wallets:", err.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

router.get("/:id", async (req, res) => {
  const id = req.params.id;
  if (!id) {
    return res.status(400).json({ error: "ID non valido" });
  }

  try {
    const wallet = await prisma.wallet.findUnique({
      where: { id },
      select: {
        id: true,
        address: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!wallet) {
      return res.status(404).json({ error: "Wallet non trovato" });
    }
    res.json(wallet);
  } catch (err) {
    console.error("Errore lettura wallet:", err.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

router.put("/:id", async (req, res) => {
  const id = req.params.id;
  if (!id) {
    return res.status(400).json({ error: "ID non valido" });
  }

  let { address, privateKey, mnemonic } = req.body || {};
  if (!address || !address.trim()) {
    return res.status(400).json({ error: "address è obbligatorio" });
  }
  if (!privateKey || !privateKey.trim()) {
    return res.status(400).json({ error: "privateKey è obbligatoria" });
  }
  mnemonic = mnemonic?.trim() || null;

  try {
    const wallet = await prisma.wallet.update({
      where: { id },
      data: {
        address: address.trim(),
        privateKey: privateKey.trim(),
        mnemonic,
      },
      select: {
        id: true,
        address: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    res.json(wallet);
  } catch (err) {
    console.error("Errore aggiornamento wallet:", err.message);
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Wallet non trovato" });
    }
    if (err.code === "P2002") {
      return res.status(400).json({ error: "Indirizzo wallet già esistente" });
    }
    res.status(500).json({ error: "Errore interno del server" });
  }
});

router.delete("/:id", async (req, res) => {
  const id = req.params.id;
  if (!id) {
    return res.status(400).json({ error: "ID non valido" });
  }

  try {
    await prisma.wallet.delete({ where: { id } });
    res.json({ message: "Wallet eliminato con successo" });
  } catch (err) {
    console.error("Errore eliminazione wallet:", err.message);
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Wallet non trovato" });
    }
    res.status(500).json({ error: "Errore interno del server" });
  }
});

/**
 * 🔵 Leggi tutti i wallet di un utente specifico
 */
router.get("/user/:userId", async (req, res) => {
  const userId = req.params.userId;
  if (!userId) {
    return res.status(400).json({ error: "ID utente non valido" });
  }

  try {
    const wallets = await prisma.wallet.findMany({
      where: { userId },
      select: {
        id: true,
        address: true,
        createdAt: true,
      },
    });
    res.json(wallets);
  } catch (err) {
    console.error("Errore lettura wallets utente:", err.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

export default router;
