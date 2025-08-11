# JETCV NFT Project

Un contratto NFT minimalista e gas-efficiente per la rete Polygon.

## Caratteristiche

- ✅ **Gas efficiente**: Implementazione leggera senza storage URI complesso
- ✅ **Sicuro**: Basato su OpenZeppelin, ben testato
- ✅ **Nessuna fee nascosta**: Contratto pulito senza meccanismi di fee
- ✅ **Compatibile con Polygon**: Ottimizzato per Polygon e Amoy testnet
- ✅ **Validazioni robuste**: Controlli sui parametri di input

## Struttura del Contratto

### Funzioni Principali

- `mint(address walletAddress, bytes32 idUserActionHash, string calldata uri)`: Mint di un NFT per un wallet specifico
- `updateTokenURI(uint256 tokenId, string calldata newUri)`: Aggiorna l'URI di un token esistente
- `tokenURI(uint256 tokenId)`: Ritorna l'URI di un token

### Caratteristiche Tecniche

- **Token ID**: Basato sull'indirizzo del wallet (`uint160(walletAddress)`)
- **Storage**: Mapping leggero per URI e userIdHash
- **Access Control**: Solo l'owner può mintare e aggiornare URI
- **Validazioni**: Controlli su indirizzi validi, hash non vuoti, URI non vuoti

## Setup

1. **Installa le dipendenze**:

   ```bash
   npm install
   ```

2. **Configura le variabili d'ambiente**:

   ```bash
   cp .env.example .env
   # Modifica .env con la tua chiave privata
   # PRIVATE_KEY=la_tua_chiave_privata_64_caratteri_senza_0x
   # Esempio: PRIVATE_KEY=1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
   ```

3. **Testa il deploy localmente**:

   ```bash
   npx hardhat run scripts/deploy.js --network hardhat
   ```

4. **Verifica la configurazione**:
   ```bash
   # Dovresti vedere: Available networks: [ 'hardhat', 'amoy', 'polygon' ]
   ```

## Deploy

### Testnet (Amoy)

```bash
npm run deploy:amoy
```

### Mainnet (Polygon)

```bash
npm run deploy:polygon
```

## Verifica del Contratto

### Amoy Testnet

```bash
npm run verify:amoy <CONTRACT_ADDRESS>
```

### Polygon Mainnet

```bash
npm run verify:polygon <CONTRACT_ADDRESS>
```

## Reti Supportate

- **Polygon Mainnet** (Chain ID: 137)
- **Amoy Testnet** (Chain ID: 80002)

## Sicurezza

- ✅ Nessuna fee nascosta
- ✅ Validazioni sui parametri di input
- ✅ Controlli di esistenza dei token
- ✅ Access control tramite Ownable
- ✅ Implementazione standard ERC721

## Gas Optimization

- Mapping leggero per URI (invece di ERC721URIStorage)
- Token ID basato su indirizzo wallet (no contatori)
- Funzioni ottimizzate per minimizzare il consumo di gas
