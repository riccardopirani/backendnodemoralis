// Test debug per la generazione della firma Veriff
// Esegui con: node test-signature-debug.js

import crypto from 'crypto';

// Simula i dati che verrebbero inviati a Veriff
const testData = {
  verification: {
    callback: "https://example.com/callback",
    person: {
      firstName: "John",
      lastName: "Doe"
    }
  }
};

// Chiave privata di esempio (sostituisci con la tua)
const privateKey = "your_veriff_private_key_here";

console.log("🔍 Debug Generazione Firma Veriff");
console.log("==================================");
console.log("");

console.log("📊 Dati di test:");
console.log(JSON.stringify(testData, null, 2));
console.log("");

console.log("🔑 Chiave privata (primi 10 caratteri):", privateKey.substring(0, 10) + "...");
console.log("");

// Metodo 1: SHA256(payload + privateKey)
const payload1 = JSON.stringify(testData);
const signature1 = crypto.createHash("sha256").update(payload1 + privateKey).digest("hex");

console.log("🔐 Metodo 1: SHA256(payload + privateKey)");
console.log("Payload:", payload1);
console.log("Firma:", signature1);
console.log("Lunghezza:", signature1.length, "caratteri");
console.log("");

// Metodo 2: SHA256(privateKey + payload)
const signature2 = crypto.createHash("sha256").update(privateKey + payload1).digest("hex");

console.log("🔐 Metodo 2: SHA256(privateKey + payload)");
console.log("Firma:", signature2);
console.log("Lunghezza:", signature2.length, "caratteri");
console.log("");

// Metodo 3: HMAC-SHA256 con privateKey come chiave
const signature3 = crypto.createHmac("sha256", privateKey).update(payload1).digest("hex");

console.log("🔐 Metodo 3: HMAC-SHA256(privateKey, payload)");
console.log("Firma:", signature3);
console.log("Lunghezza:", signature3.length, "caratteri");
console.log("");

// Metodo 4: SHA256 solo del payload (senza chiave)
const signature4 = crypto.createHash("sha256").update(payload1).digest("hex");

console.log("🔐 Metodo 4: SHA256(payload) - SENZA chiave");
console.log("Firma:", signature4);
console.log("Lunghezza:", signature4.length, "caratteri");
console.log("");

// Metodo 5: SHA256 della chiave privata
const signature5 = crypto.createHash("sha256").update(privateKey).digest("hex");

console.log("🔐 Metodo 5: SHA256(privateKey) - SOLO chiave");
console.log("Firma:", signature5);
console.log("Lunghezza:", signature5.length, "caratteri");
console.log("");

console.log("📋 Riepilogo:");
console.log("✅ Tutte le firme SHA256 devono essere di 64 caratteri (32 bytes)");
console.log("❌ Se vedi lunghezze diverse, c'è un problema");
console.log("");

console.log("🔍 Per testare con l'API:");
console.log("1. Sostituisci 'your_veriff_private_key_here' con la tua chiave reale");
console.log("2. Esegui questo script per vedere le firme generate");
console.log("3. Prova a usare le diverse firme nell'endpoint /test-signature");
console.log("4. Controlla quale metodo funziona con l'API Veriff");

// Test con dati reali se la chiave è configurata
if (privateKey !== "your_veriff_private_key_here") {
  console.log("");
  console.log("🧪 Test con dati reali:");
  
  // Simula la chiamata API
  const apiData = {
    verification: {
      callback: "https://localhost:4000/api/veriff-new/webhook",
      person: {
        firstName: "Test",
        lastName: "User",
        email: "test@example.com"
      }
    }
  };
  
  const apiSignature = crypto.createHash("sha256").update(JSON.stringify(apiData) + privateKey).digest("hex");
  console.log("Dati API:", JSON.stringify(apiData, null, 2));
  console.log("Firma API (Metodo 1):", apiSignature);
}
