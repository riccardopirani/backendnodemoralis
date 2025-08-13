import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor per gestire errori globali
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

// Servizi Veriff
export const veriffService = {
  // Genera URL di autenticazione personalizzato
  generateAuthUrl: async (authData) => {
    const response = await api.post('/api/veriff/auth-url', authData);
    return response.data;
  },

  // Test rapido con dati predefiniti
  quickAuth: async () => {
    const response = await api.get('/api/veriff/quick-auth');
    return response.data;
  },

  // Recupera sessione
  getSession: async (sessionId) => {
    const response = await api.get(`/api/veriff/session/${sessionId}`);
    return response.data;
  },

  // Recupera verifica
  getVerification: async (verificationId) => {
    const response = await api.get(`/api/veriff/verification/${verificationId}`);
    return response.data;
  },
};

// Servizi NFT
export const nftService = {
  // Mint NFT
  mintNFT: async (nftData) => {
    const response = await api.post('/api/nft/mint', nftData);
    return response.data;
  },

  // Batch mint
  batchMint: async (nftsData) => {
    const response = await api.post('/api/nft/mint/batch', nftsData);
    return response.data;
  },

  // Status NFT
  getNFTStatus: async (crossmintId) => {
    const response = await api.get(`/api/nft/status/${crossmintId}`);
    return response.data;
  },

  // Aggiorna NFT
  updateNFT: async (crossmintId, metadata) => {
    const response = await api.patch(`/api/nft/update/${crossmintId}`, { metadata });
    return response.data;
  },

  // Lista NFT
  getNFTs: async (page = 1, perPage = 10) => {
    const response = await api.get('/api/nft/metadata', { params: { page, perPage } });
    return response.data;
  },
};

// Servizi Wallet
export const walletService = {
  // Crea wallet
  createWallet: async () => {
    const response = await api.post('/api/wallet/create');
    return response.data;
  },
};

// Servizi Collection
export const collectionService = {
  // Info collezione
  getCollectionInfo: async () => {
    const response = await api.get('/api/collection/info');
    return response.data;
  },
};

// Servizi CV
export const cvService = {
  // Valida e crea CV
  validateAndCreate: async (jsonCV, filename) => {
    const response = await api.post('/api/cv/validate-and-create', { jsonCV, filename });
    return response.data;
  },
};

// Servizi di sistema
export const systemService = {
  // Health check
  health: async () => {
    const response = await api.get('/health');
    return response.data;
  },

  // Info server
  serverInfo: async () => {
    const response = await api.get('/');
    return response.data;
  },
};

export default api;
