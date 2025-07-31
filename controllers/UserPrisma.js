import express from "express";
import prisma from "../config/prisma.js";
import validator from "validator";

const router = express.Router();

// 🟢 Crea un nuovo utente
router.post("/", async (req, res) => {
  const { name, email, id } = req.body || {};

  // Validazioni
  if (!name || name.trim().length < 3) {
    return res
      .status(400)
      .json({ error: "Il nome deve avere almeno 3 caratteri" });
  }
  if (!email || !validator.isEmail(email)) {
    return res.status(400).json({ error: "Email non valida" });
  }

  try {
    const user = await prisma.user.create({
      data: { id: id, name: name.trim(), email: email.trim() },
      select: { id: true, name: true, email: true, createdAt: true },
    });
    res.status(201).json(user);
  } catch (err) {
    console.error("Errore creazione utente:", err.message);
    if (err.code === "P2002") {
      return res.status(400).json({ error: "Email già esistente" });
    }
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// 🔵 Leggi tutti gli utenti
router.get("/", async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        _count: { select: { wallets: true } },
      },
    });
    res.json(users);
  } catch (err) {
    console.error("Errore lettura utenti:", err.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// 🟠 Leggi singolo utente con i suoi wallet
router.get("/:id", async (req, res) => {
  const id = req.params.id; // UUID come stringa

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        wallets: { select: { id: true, address: true, createdAt: true } },
      },
    });
    if (!user) return res.status(404).json({ error: "Utente non trovato" });
    res.json(user);
  } catch (err) {
    console.error("Errore lettura utente:", err.message);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// 🟡 Aggiorna utente
router.put("/:id", async (req, res) => {
  const id = req.params.id;
  const { name, email } = req.body || {};

  if (!name || name.trim().length < 3) {
    return res
      .status(400)
      .json({ error: "Il nome deve avere almeno 3 caratteri" });
  }
  if (!email || !validator.isEmail(email)) {
    return res.status(400).json({ error: "Email non valida" });
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: { name: name.trim(), email: email.trim() },
      select: { id: true, name: true, email: true, createdAt: true },
    });
    res.json(user);
  } catch (err) {
    console.error("Errore aggiornamento utente:", err.message);
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Utente non trovato" });
    }
    if (err.code === "P2002") {
      return res.status(400).json({ error: "Email già esistente" });
    }
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// 🔴 Elimina utente
router.delete("/:id", async (req, res) => {
  const id = req.params.id;

  try {
    await prisma.user.delete({ where: { id } });
    res.json({ message: "Utente eliminato con successo" });
  } catch (err) {
    console.error("Errore eliminazione utente:", err.message);
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Utente non trovato" });
    }
    res.status(500).json({ error: "Errore interno del server" });
  }
});

export default router;
