import express from "express";
import prisma from "../config/prisma.js";
import validator from "validator";

const router = express.Router();

// 🟢 Crea un nuovo utente
router.post("/", async (req, res) => {
  const {
    id,
    name,
    surname,
    birthday,
    city,
    address,
    phone,
    state,
    province,
    streetNumber,
    email,
    nationality,
    gender,
  } = req.body || {};

  // Validazioni minime
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
      data: {
        id,
        name: name.trim(),
        surname: surname?.trim(),
        birthday: birthday ? new Date(birthday) : null,
        city: city?.trim(),
        address: address?.trim(),
        phone: phone?.trim(),
        state: state?.trim(),
        province: province?.trim(),
        streetNumber: streetNumber?.trim(),
        email: email.trim(),
        nationality: nationality?.trim(),
        gender: gender?.trim(),
      },
      select: {
        id: true,
        name: true,
        surname: true,
        email: true,
        createdAt: true,
      },
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

// 🔵 Lista utenti
router.get("/", async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        surname: true,
        email: true,
        city: true,
        phone: true,
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

// 🟠 Singolo utente + wallet
router.get("/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        surname: true,
        birthday: true,
        city: true,
        address: true,
        phone: true,
        state: true,
        province: true,
        streetNumber: true,
        email: true,
        nationality: true,
        gender: true,
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
  const {
    name,
    surname,
    birthday,
    city,
    address,
    phone,
    state,
    province,
    streetNumber,
    email,
    nationality,
    gender,
  } = req.body || {};

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
      data: {
        name: name.trim(),
        surname: surname?.trim(),
        birthday: birthday ? new Date(birthday) : null,
        city: city?.trim(),
        address: address?.trim(),
        phone: phone?.trim(),
        state: state?.trim(),
        province: province?.trim(),
        streetNumber: streetNumber?.trim(),
        email: email.trim(),
        nationality: nationality?.trim(),
        gender: gender?.trim(),
      },
      select: {
        id: true,
        name: true,
        surname: true,
        email: true,
        createdAt: true,
      },
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
