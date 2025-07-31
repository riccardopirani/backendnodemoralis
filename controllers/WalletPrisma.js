import express from "express";
import prisma from "../config/prisma.js";

const router = express.Router();

// 🟢 Crea un nuovo wallet per un utente
router.post("/", async (req, res) => {
  const { userId, address, privateKey, mnemonic } = req.body || {};

  if (!userId || !address || !privateKey) {
    return res.status(400).json({ 
      error: "userId, address e privateKey sono obbligatori" 
    });
  }

  try {
    const wallet = await prisma.wallet.create({
      data: {
        userId: parseInt(userId, 10),
        address,
        privateKey,
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
    if (err.code === 'P2002') {
      return res.status(400).json({ error: "Indirizzo wallet già esistente" });
    }
    if (err.code === 'P2003') {
      return res.status(400).json({ error: "Utente non trovato" });
    }
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// 🔵 Leggi tutti i wallet
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

// 🟠 Leggi singolo wallet
router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
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

// 🟡 Aggiorna wallet
router.put("/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: "ID non valido" });
  }

  const { address, privateKey, mnemonic } = req.body || {};
  if (!address || !privateKey) {
    return res.status(400).json({ 
      error: "address e privateKey sono obbligatori" 
    });
  }

  try {
    const wallet = await prisma.wallet.update({
      where: { id },
      data: {
        address,
        privateKey,
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
    if (err.code === 'P2025') {
      return res.status(404).json({ error: "Wallet non trovato" });
    }
    if (err.code === 'P2002') {
      return res.status(400).json({ error: "Indirizzo wallet già esistente" });
    }
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// 🔴 Elimina wallet
router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: "ID non valido" });
  }

  try {
    await prisma.wallet.delete({
      where: { id },
    });
    res.json({ message: "Wallet eliminato con successo" });
  } catch (err) {
    console.error("Errore eliminazione wallet:", err.message);
    if (err.code === 'P2025') {
      return res.status(404).json({ error: "Wallet non trovato" });
    }
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// 🔵 Leggi tutti i wallet di un utente specifico
router.get("/user/:userId", async (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  if (isNaN(userId)) {
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