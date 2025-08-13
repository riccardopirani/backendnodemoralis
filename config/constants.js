import dotenv from 'dotenv';

// Carica le variabili d'ambiente dal file .env
dotenv.config();

export const CROSSMINT_CONFIG = {
  BASE_URL: process.env.CROSSMINT_BASE_URL || "https://www.crossmint.com/api/2022-06-09",
  COLLECTION_ID: process.env.CROSSMINT_COLLECTION_ID || "c028239b-580d-4162-b589-cb5212a0c8ac",
  API_KEY: process.env.CROSSMINT_API_KEY || "sk_production_5dki6YWe6QqNU7VAd7ELAabw4WMP35kU9rpBhDxG3HiAjSqb5XnimcRWy4S4UGqsZFaqvDAfrJTUZdctGonnjETrrM4h8cmxBJr6yYZ6UfKyWg9i47QxTxpZwX9XBqBVnnhEcJU8bMeLPPTVib8TQKszv3HY8ufZZ7YA73VYmoyDRnBxNGB73ytjTMgxP6TBwQCSVxwKq5CaaeB69nwyt9f4",
};

export const VERIFF_CONFIG = {
  BASE_URL: process.env.VERIFF_BASE_URL || "https://station.veriff.com",
  PUBLIC_KEY: process.env.VERIFF_PUBLIC_KEY || "your_veriff_public_key",
  PRIVATE_KEY: process.env.VERIFF_PRIVATE_KEY || "your_veriff_private_key",
};

export const IPFS_CONFIG = {
  LIGHTHOUSE_API_KEY: process.env.LIGHTHOUSE_API_KEY || "2c0b8b0c.5c0b8b0c5c0b8b0c5c0b8b0c",
};

export const SERVER_CONFIG = {
  PORT: process.env.PORT || 4000,
  NODE_ENV: process.env.NODE_ENV || "development",
};
