// 📝 Esempi di utilizzo delle API Prisma
// Questo file contiene esempi di chiamate API per testare le funzionalità Prisma

const BASE_URL = 'http://localhost:3000';

// 🟢 Esempio: Creazione utente con Prisma
async function createUserWithPrisma() {
  const response = await fetch(`${BASE_URL}/api/users-prisma`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'Mario Rossi',
      email: 'mario@example.com',
      password: 'password123'
    })
  });
  
  const user = await response.json();
  console.log('✅ Utente creato:', user);
  return user;
}

// 🔵 Esempio: Creazione wallet per utente
async function createWalletForUser(userId) {
  const response = await fetch(`${BASE_URL}/api/wallets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId: userId,
      address: '0x1234567890123456789012345678901234567890',
      privateKey: 'encrypted_private_key_here',
      mnemonic: 'word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12'
    })
  });
  
  const wallet = await response.json();
  console.log('✅ Wallet creato:', wallet);
  return wallet;
}

// 🟠 Esempio: Ottenere utente con i suoi wallet
async function getUserWithWallets(userId) {
  const response = await fetch(`${BASE_URL}/api/users-prisma/${userId}`);
  const user = await response.json();
  console.log('✅ Utente con wallet:', user);
  return user;
}

// 🟡 Esempio: Lista tutti gli utenti con conteggio wallet
async function getAllUsersWithWalletCount() {
  const response = await fetch(`${BASE_URL}/api/users-prisma`);
  const users = await response.json();
  console.log('✅ Lista utenti con conteggio wallet:', users);
  return users;
}

// 🔴 Esempio: Ottenere wallet di un utente specifico
async function getWalletsByUser(userId) {
  const response = await fetch(`${BASE_URL}/api/wallets/user/${userId}`);
  const wallets = await response.json();
  console.log('✅ Wallet dell\'utente:', wallets);
  return wallets;
}

// 🧪 Test completo delle API
async function runPrismaTests() {
  try {
    console.log('🚀 Iniziando test delle API Prisma...\n');
    
    // 1. Crea un utente
    const user = await createUserWithPrisma();
    
    // 2. Crea un wallet per l'utente
    const wallet = await createWalletForUser(user.id);
    
    // 3. Ottieni utente con i suoi wallet
    await getUserWithWallets(user.id);
    
    // 4. Lista tutti gli utenti
    await getAllUsersWithWalletCount();
    
    // 5. Ottieni wallet dell'utente
    await getWalletsByUser(user.id);
    
    console.log('\n✅ Tutti i test completati con successo!');
    
  } catch (error) {
    console.error('❌ Errore durante i test:', error);
  }
}

// Esporta le funzioni per uso esterno
export {
  createUserWithPrisma,
  createWalletForUser,
  getUserWithWallets,
  getAllUsersWithWalletCount,
  getWalletsByUser,
  runPrismaTests
};

// Se eseguito direttamente, avvia i test
if (import.meta.url === `file://${process.argv[1]}`) {
  runPrismaTests();
} 