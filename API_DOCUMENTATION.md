# API Documentation - JetCV NFT Backend

## Overview
This backend provides comprehensive APIs for managing JetCV NFTs, certifications, and wallet operations based on the smart contract ABI.

## Base URL
```
http://localhost:4000
```

## Authentication
Currently, the API doesn't require authentication, but it uses a private key for blockchain transactions.

## API Endpoints

### 🔐 Wallet Management

#### Create Wallet
```http
POST /api/wallet/create
```
Creates a new Ethereum wallet and stores credentials in Keycloak.

**Response:**
```json
{
  "address": "0x...",
  "privateKey": "0x...",
  "mnemonic": "word1 word2 ...",
  "scriptError": false,
  "output": "..."
}
```

#### Get Wallet Balance
```http
GET /api/wallet/:address/balance
```
Returns the MATIC balance for a wallet address.

**Response:**
```json
{
  "address": "0x...",
  "balance": "1.234567"
}
```

#### Get Wallet Secret
```http
GET /api/wallet/:address/secret
```
Retrieves encrypted wallet credentials from Keycloak.

**Response:**
```json
{
  "address": "0x...",
  "encryptedPrivateKey": "...",
  "mnemonic": "..."
}
```

#### Get Token Balance
```http
GET /api/token/:address
```
Returns token balances for an address.

**Response:**
```json
[
  {
    "token": "MATIC",
    "balance": "1.234567"
  }
]
```

### 🎨 NFT Management

#### Contract Information
```http
GET /api/nft/contract-info
```
Returns basic contract information.

**Response:**
```json
{
  "name": "JetCV NFT",
  "symbol": "JETCV",
  "version": "1.0.0",
  "contractAddress": "0x..."
}
```

#### Check User Has JetCV
```http
GET /api/nft/user/:address/hasJetCV
```
Checks if a user has a JetCV NFT.

**Response:**
```json
{
  "address": "0x...",
  "hasJetCV": true
}
```

#### Check User Has CV
```http
GET /api/nft/user/:address/hasCV
```
Checks if a user has a CV.

**Response:**
```json
{
  "address": "0x...",
  "hasCV": true
}
```

#### Get User Token ID
```http
GET /api/nft/user/:address/tokenId
```
Returns the token ID for a user's address.

**Response:**
```json
{
  "address": "0x...",
  "tokenId": "123"
}
```

#### Get Token Details
```http
GET /api/nft/token/:tokenId
```
Returns comprehensive token information.

**Response:**
```json
{
  "tokenId": "123",
  "owner": "0x...",
  "uri": "ipfs://...",
  "userIdHash": "0x..."
}
```

#### Check Token Minted
```http
GET /api/nft/token/:tokenId/isMinted
```
Checks if a token ID has been minted.

**Response:**
```json
{
  "tokenId": "123",
  "isMinted": true
}
```

#### Get Token Owner
```http
GET /api/nft/token/:tokenId/owner
```
Returns the owner of a specific token.

**Response:**
```json
{
  "tokenId": "123",
  "owner": "0x..."
}
```

#### Get Token URI
```http
GET /api/nft/token/:tokenId/uri
```
Returns the URI for a token's metadata.

**Response:**
```json
{
  "tokenId": "123",
  "uri": "ipfs://..."
}
```

#### Get User NFT Balance
```http
GET /api/nft/user/:address/balance
```
Returns the number of NFTs owned by an address.

**Response:**
```json
{
  "address": "0x...",
  "balance": "1"
}
```

#### Get All Token IDs
```http
GET /api/nft/all-tokenIds
```
Returns all minted token IDs.

**Response:**
```json
{
  "tokenIds": ["1", "2", "3"]
}
```

#### Get All Tokens
```http
GET /api/nft/all-tokens
```
Returns detailed information for all tokens.

**Response:**
```json
{
  "tokens": [
    {
      "tokenId": "1",
      "owner": "0x...",
      "uri": "ipfs://...",
      "userIdHash": "0x..."
    }
  ]
}
```

### 🪙 Minting

#### Mint JetCV
```http
POST /api/nft/mint
```
Mints a new JetCV NFT for a user.

**Request Body:**
```json
{
  "walletAddress": "0x...",
  "userIdHash": "0x..."
}
```

**Response:**
```json
{
  "message": "JetCV mintato con successo",
  "tokenId": "123",
  "txHash": "0x...",
  "blockNumber": 12345,
  "gasUsed": "150000"
}
```

### 🏆 Certifications

#### Get Token Certifications
```http
GET /api/certifications/token/:tokenId
```
Returns all certifications for a specific token.

**Response:**
```json
{
  "tokenId": "123",
  "certifications": [
    {
      "certificationIdHash": "0x...",
      "legalEntityAddress": "0x...",
      "legalEntityIdHash": "0x...",
      "certificatorAddress": "0x...",
      "certificatorIdHash": "0x...",
      "documents": ["doc1", "doc2"],
      "createdAt": "1234567890"
    }
  ]
}
```

#### Get User Certifications
```http
GET /api/certifications/user/:address
```
Returns all certifications for a user's address.

**Response:**
```json
{
  "address": "0x...",
  "tokenId": "123",
  "certifications": [...]
}
```

#### Approve Certification
```http
POST /api/certifications/approve
```
Approves a certification for a token.

**Request Body:**
```json
{
  "walletAddress": "0x...",
  "tokenId": "123",
  "certificationIdHash": "0x...",
  "documents": ["doc1", "doc2"],
  "legalEntityAddress": "0x...",
  "legalEntityIdHash": "0x...",
  "certificatorAddress": "0x...",
  "certificatorIdHash": "0x..."
}
```

**Response:**
```json
{
  "message": "Certificazione approvata con successo",
  "txHash": "0x...",
  "blockNumber": 12345,
  "gasUsed": "200000"
}
```

### 🔄 Migration

#### Migrate JetCV
```http
POST /api/nft/migrate
```
Burns a JetCV for migration to a new contract.

**Request Body:**
```json
{
  "walletAddress": "0x...",
  "reason": "Upgrade to v2",
  "newContract": "0x..."
}
```

**Response:**
```json
{
  "message": "JetCV migrato con successo",
  "tokenId": "123",
  "userIdHash": "0x...",
  "txHash": "0x...",
  "blockNumber": 12345,
  "gasUsed": "100000"
}
```

### 👑 Ownership Management

#### Get Contract Owner
```http
GET /api/contract/owner
```
Returns the current contract owner.

**Response:**
```json
{
  "owner": "0x..."
}
```

#### Transfer Ownership
```http
POST /api/contract/transfer-ownership
```
Transfers contract ownership to a new address.

**Request Body:**
```json
{
  "newOwner": "0x..."
}
```

**Response:**
```json
{
  "message": "Proprietà trasferita con successo",
  "newOwner": "0x...",
  "txHash": "0x...",
  "blockNumber": 12345,
  "gasUsed": "50000"
}
```

#### Renounce Ownership
```http
POST /api/contract/renounce-ownership
```
Renounces contract ownership.

**Response:**
```json
{
  "message": "Proprietà rinunciata con successo",
  "txHash": "0x...",
  "blockNumber": 12345,
  "gasUsed": "30000"
}
```

### ✅ Approval Management

#### Get Token Approval
```http
GET /api/nft/token/:tokenId/approved
```
Returns the approved address for a token.

**Response:**
```json
{
  "tokenId": "123",
  "approved": "0x..."
}
```

#### Approve Token
```http
POST /api/nft/token/:tokenId/approve
```
Approves an address to transfer a specific token.

**Request Body:**
```json
{
  "to": "0x..."
}
```

**Response:**
```json
{
  "message": "Approvazione completata",
  "tokenId": "123",
  "to": "0x...",
  "txHash": "0x...",
  "blockNumber": 12345,
  "gasUsed": "40000"
}
```

#### Set Approval For All
```http
POST /api/nft/set-approval-for-all
```
Approves or revokes approval for all tokens.

**Request Body:**
```json
{
  "operator": "0x...",
  "approved": true
}
```

**Response:**
```json
{
  "message": "Approvazione per tutti impostata",
  "operator": "0x...",
  "approved": true,
  "txHash": "0x...",
  "blockNumber": 12345,
  "gasUsed": "35000"
}
```

#### Check Approval For All
```http
GET /api/nft/is-approved-for-all?owner=0x...&operator=0x...
```
Checks if an operator is approved for all tokens of an owner.

**Response:**
```json
{
  "owner": "0x...",
  "operator": "0x...",
  "isApproved": true
}
```

### 🔄 Transfer Operations

#### Transfer Token
```http
POST /api/nft/transfer
```
Transfers a token from one address to another.

**Request Body:**
```json
{
  "from": "0x...",
  "to": "0x...",
  "tokenId": "123"
}
```

**Response:**
```json
{
  "message": "Transfer completato",
  "from": "0x...",
  "to": "0x...",
  "tokenId": "123",
  "txHash": "0x...",
  "blockNumber": 12345,
  "gasUsed": "60000"
}
```

#### Safe Transfer Token
```http
POST /api/nft/safe-transfer
```
Safely transfers a token with optional data.

**Request Body:**
```json
{
  "from": "0x...",
  "to": "0x...",
  "tokenId": "123",
  "data": "0x..." // optional
}
```

**Response:**
```json
{
  "message": "Safe transfer completato",
  "from": "0x...",
  "to": "0x...",
  "tokenId": "123",
  "data": "0x...",
  "txHash": "0x...",
  "blockNumber": 12345,
  "gasUsed": "65000"
}
```

### 🔧 Interface Support

#### Check Interface Support
```http
GET /api/contract/supports-interface?interfaceId=0x...
```
Checks if the contract supports a specific interface.

**Response:**
```json
{
  "interfaceId": "0x...",
  "supports": true
}
```

### 📚 Documentation

#### Get API Documentation
```http
GET /api-docs.json
```
Returns the Swagger API documentation in JSON format.

### 🔄 Legacy APIs (Backward Compatibility)

The following legacy endpoints are maintained for backward compatibility:

- `GET /api/user/:address/hasJetCV`
- `GET /api/user/:address/hasCV`
- `GET /api/user/:address/tokenId`
- `GET /api/cv/:tokenId`
- `GET /api/certifications/:address`
- `GET /api/cv/all-tokenIds`

## Error Handling

All endpoints return appropriate HTTP status codes:

- `200` - Success
- `400` - Bad Request (missing or invalid parameters)
- `404` - Not Found
- `500` - Internal Server Error

Error responses follow this format:
```json
{
  "error": "Error message description"
}
```

## Environment Variables

Required environment variables:

```env
PRIVATE_KEY=your_private_key
ANKR_RPC_URL=your_rpc_url
CONTRACT_ADDRESS=your_contract_address
WEB3_STORAGE_TOKEN=your_web3_storage_token
LIGHTHOUSE_API_KEY=your_lighthouse_api_key
DATABASE_URL=your_database_url
```

## Running the Server

```bash
npm start
```

The server will start on port 4000 by default, or the port specified in the `PORT` environment variable.

## Documentation Access

- Swagger UI: `http://localhost:4000/docs`
- Web Interface: `http://localhost:4000`
- API Documentation JSON: `http://localhost:4000/api-docs.json`
