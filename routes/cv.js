import express from "express";
import { validateJsonCV, createCVFile } from "../utils/helpers.js";

const router = express.Router();

router.post("/validate-and-create", async (req, res) => {
  try {
    const { jsonCV, filename } = req.body;

    const validation = validateJsonCV(jsonCV);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: validation.error,
      });
    }

    if (!filename || typeof filename !== "string") {
      return res.status(400).json({
        success: false,
        error: "Parametro filename è obbligatorio e deve essere una stringa",
      });
    }

    const fileResult = createCVFile(jsonCV, filename);
    if (!fileResult.success) {
      return res.status(500).json({
        success: false,
        error: "Errore durante la creazione del file CV",
        details: fileResult.error,
      });
    }

    res.json({
      success: true,
      message: "CV JSON validato e creato con successo",
      file: fileResult.file,
      validation: {
        isValid: true,
        fields: Object.keys(jsonCV),
        fieldCount: Object.keys(jsonCV).length,
      },
    });
  } catch (error) {
    console.error("Errore validazione e creazione CV:", error);
    res.status(500).json({
      success: false,
      error: "Errore durante la validazione e creazione del CV JSON",
      details: error.message,
    });
  }
});

export default router;
