# JetCV NFT Backend Server

A comprehensive Node.js backend server for managing JetCV NFTs, certifications, and wallet operations based on the smart contract ABI.

## 🚀 Features

- **NFT Management**: Mint, transfer, and manage JetCV NFTs
- **Certification System**: Approve and manage certifications for NFTs
- **Wallet Operations**: Create and manage Ethereum wallets
- **Migration Support**: Burn NFTs for contract upgrades
- **Ownership Management**: Transfer and manage contract ownership
- **Approval System**: Manage token approvals and transfers
- **Database Integration**: PostgreSQL with Prisma ORM
- **API Documentation**: Swagger UI integration
- **Blockchain Integration**: Ethereum/Polygon support via ethers.js

## 📋 Prerequisites

- Node.js >= 18.0.0
- PostgreSQL database
- Ethereum/Polygon RPC endpoint
- Web3 Storage account
- Lighthouse account (for file uploads)

## 🛠️ Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd backendnodemoralis
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Blockchain Configuration
PRIVATE_KEY=your_private_key
ANKR_RPC_URL=your_rpc_url
CONTRACT_ADDRESS=your_contract_address

# Storage Configuration
WEB3_STORAGE_TOKEN=your_web3_storage_token
LIGHTHOUSE_API_KEY=your_lighthouse_api_key

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/jetcv_db

# Server Configuration
PORT=4000
NODE_ENV=development
```

4. **Set up the database**
```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate
```

5. **Start the server**
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## 🧪 Testing

Run the server test to verify all endpoints:
```bash
npm run test:server
```

## 📚 API Documentation

### Base URL
```
http://localhost:4000
```

### Documentation Access
- **Swagger UI**: `http://localhost:4000/docs`
- **Web Interface**: `http://localhost:4000`
- **API Documentation JSON**: `http://localhost:4000/api-docs.json`

## 🔧 API Endpoints

### Wallet Management
- `POST /api/wallet/create` - Create new wallet
- `GET /api/wallet/:address/balance` - Get wallet balance
- `GET /api/wallet/:address/secret` - Get wallet secrets
- `GET /api/token/:address` - Get token balances

### NFT Management
- `GET /api/nft/contract-info` - Get contract information
- `GET /api/nft/user/:address/hasJetCV` - Check if user has JetCV
- `GET /api/nft/user/:address/hasCV` - Check if user has CV
- `GET /api/nft/user/:address/tokenId` - Get user's token ID
- `GET /api/nft/token/:tokenId` - Get token details
- `GET /api/nft/token/:tokenId/isMinted` - Check if token is minted
- `GET /api/nft/token/:tokenId/owner` - Get token owner
- `GET /api/nft/token/:tokenId/uri` - Get token URI
- `GET /api/nft/user/:address/balance` - Get user's NFT balance
- `GET /api/nft/all-tokenIds` - Get all token IDs
- `GET /api/nft/all-tokens` - Get all token details

### Minting
- `POST /api/nft/mint` - Mint new JetCV NFT

### Certifications
- `GET /api/certifications/token/:tokenId` - Get token certifications
- `GET /api/certifications/user/:address` - Get user certifications
- `POST /api/certifications/approve` - Approve certification

### Migration
- `POST /api/nft/migrate` - Migrate JetCV to new contract

### Ownership Management
- `GET /api/contract/owner` - Get contract owner
- `POST /api/contract/transfer-ownership` - Transfer ownership
- `POST /api/contract/renounce-ownership` - Renounce ownership

### Approval Management
- `GET /api/nft/token/:tokenId/approved` - Get token approval
- `POST /api/nft/token/:tokenId/approve` - Approve token
- `POST /api/nft/set-approval-for-all` - Set approval for all
- `GET /api/nft/is-approved-for-all` - Check approval for all

### Transfer Operations
- `POST /api/nft/transfer` - Transfer token
- `POST /api/nft/safe-transfer` - Safe transfer token

### Interface Support
- `GET /api/contract/supports-interface` - Check interface support

### Legacy APIs (Backward Compatibility)
- `GET /api/user/:address/hasJetCV`
- `GET /api/user/:address/hasCV`
- `GET /api/user/:address/tokenId`
- `GET /api/cv/:tokenId`
- `GET /api/certifications/:address`
- `GET /api/cv/all-tokenIds`

## 🗄️ Database Schema

The application uses PostgreSQL with the following main tables:

### Users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100),
  surname VARCHAR(100),
  birthday DATE,
  city VARCHAR(100),
  address VARCHAR(255),
  phone VARCHAR(20),
  state VARCHAR(100),
  province VARCHAR(100),
  street_number VARCHAR(20),
  email VARCHAR(150) UNIQUE,
  nationality VARCHAR(100),
  gender VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Wallets
```sql
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  address VARCHAR(255) UNIQUE,
  private_key VARCHAR(255),
  mnemonic TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🔒 Security

- Private keys are encrypted and stored securely
- Environment variables for sensitive configuration
- Input validation on all endpoints
- Error handling without exposing sensitive information

## 🚀 Deployment

### AWS Deployment
```bash
# Deploy to AWS
npm run deploy-aws

# Deploy with alternative script
npm run deploy-aws2
```

### Docker Deployment
```bash
# Build and run with Docker
docker-compose up -d
```

## 📝 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PRIVATE_KEY` | Ethereum private key for transactions | Yes |
| `ANKR_RPC_URL` | RPC endpoint URL | Yes |
| `CONTRACT_ADDRESS` | Smart contract address | Yes |
| `WEB3_STORAGE_TOKEN` | Web3 Storage API token | Yes |
| `LIGHTHOUSE_API_KEY` | Lighthouse API key | Yes |
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `PORT` | Server port (default: 4000) | No |
| `NODE_ENV` | Environment (development/production) | No |

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Verify `DATABASE_URL` is correct
   - Ensure PostgreSQL is running
   - Run `npm run db:migrate` to apply migrations

2. **Blockchain Connection Error**
   - Verify `ANKR_RPC_URL` is accessible
   - Check `PRIVATE_KEY` format
   - Ensure `CONTRACT_ADDRESS` is correct

3. **File Upload Issues**
   - Verify `LIGHTHOUSE_API_KEY` is valid
   - Check `WEB3_STORAGE_TOKEN` is correct
   - Ensure file paths are accessible

### Debug Mode
```bash
NODE_ENV=development npm run dev
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Check the API documentation at `/docs`
- Review the test server output
- Check the logs for error details
- Open an issue on GitHub

## 🔄 Changelog

### v1.0.3
- Added comprehensive NFT management APIs
- Implemented certification system
- Added migration support
- Enhanced wallet management
- Improved error handling
- Added comprehensive documentation
- Fixed Prisma configuration
- Added server testing utilities
