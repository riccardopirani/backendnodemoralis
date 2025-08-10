require('@nomicfoundation/hardhat-toolbox');
require('dotenv').config();

const { PRIVATE_KEY, AMOY_RPC, POLYGON_RPC, POLYGONSCAN_KEY } = process.env;

// Build networks configuration conditionally
const networks = {
  hardhat: {
    chainId: 1337
  }
};

// Only add external networks if PRIVATE_KEY is available and valid
if (PRIVATE_KEY && PRIVATE_KEY.length >= 64 && PRIVATE_KEY !== 'your_private_key_here') {
  if (AMOY_RPC) {
    networks.amoy = {
      url: AMOY_RPC,
      chainId: 80002,
      accounts: [PRIVATE_KEY]
    };
  }
  
  if (POLYGON_RPC) {
    networks.polygon = {
      url: POLYGON_RPC,
      chainId: 137,
      accounts: [PRIVATE_KEY]
    };
  }
}

console.log('Available networks:', Object.keys(networks));

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: '0.8.23',
  networks,
  etherscan: {
    apiKey: {
      polygon: POLYGONSCAN_KEY || '',
      polygonAmoy: POLYGONSCAN_KEY || ''
    }
  }
};
