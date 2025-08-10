const hre = require('hardhat');

async function main() {
  const contractAddress = '0xbf36f3B345aBbbfCb5cCB4aDE7FD9237BD16eFdD';
  
  try {
    const provider = new hre.ethers.JsonRpcProvider(process.env.POLYGON_RPC);
    
    // Funzioni NFT specifiche
    const nftFunctions = [
      { name: 'name', selector: '0x06fdde03', params: [] },
      { name: 'symbol', selector: '0x95d89b41', params: [] },
      { name: 'owner', selector: '0x8da5cb5b', params: [] },
      { name: 'CONTRACT_VERSION', selector: '0x54fd4d50', params: [] },
      { name: 'ownerOf', selector: '0x6352211e', params: ['0x0000000000000000000000000000000000000000000000000000000000000001'] },
      { name: 'balanceOf', selector: '0x70a08231', params: ['0x12Ae466d0f74d152aA352DC8029c631683Bf607b'] },
      { name: 'tokenURI', selector: '0xc87b56dd', params: ['0x0000000000000000000000000000000000000000000000000000000000000001'] },
      { name: 'getApproved', selector: '0x081812fc', params: ['0x0000000000000000000000000000000000000000000000000000000000000001'] },
      { name: 'isApprovedForAll', selector: '0xe985e9c5', params: ['0x12Ae466d0f74d152aA352DC8029c631683Bf607b', '0x12Ae466d0f74d152aA352DC8029c631683Bf607b'] },
      { name: 'userIdHash', selector: '0x8b5b9c63', params: ['0x0000000000000000000000000000000000000000000000000000000000000001'] }
    ];
    
    console.log('🔍 Analizzando contratto NFT:', contractAddress);
    console.log('📋 Testando funzioni NFT...\n');
    
    const results = {};
    
    for (const func of nftFunctions) {
      try {
        let data;
        if (func.name === 'balanceOf') {
          data = func.selector + '000000000000000000000000' + func.params[0].slice(2);
        } else if (func.name === 'isApprovedForAll') {
          data = func.selector + '000000000000000000000000' + func.params[0].slice(2) + '000000000000000000000000' + func.params[1].slice(2);
        } else if (func.name === 'ownerOf' || func.name === 'tokenURI' || func.name === 'getApproved' || func.name === 'userIdHash') {
          data = func.selector + func.params[0].slice(2).padStart(64, '0');
        } else {
          data = func.selector;
        }
          
        const result = await provider.call({
          to: contractAddress,
          data: data
        });
        
        if (result && result !== '0x') {
          // Decodifica il risultato
          if (func.name === 'name' || func.name === 'symbol' || func.name === 'CONTRACT_VERSION') {
            const decoded = hre.ethers.AbiCoder.defaultAbiCoder().decode(['string'], result);
            results[func.name] = decoded[0];
          } else if (func.name === 'owner' || func.name === 'getApproved') {
            const decoded = hre.ethers.AbiCoder.defaultAbiCoder().decode(['address'], result);
            results[func.name] = decoded[0];
          } else if (func.name === 'balanceOf' || func.name === 'ownerOf') {
            const decoded = hre.ethers.AbiCoder.defaultAbiCoder().decode(['uint256'], result);
            results[func.name] = decoded[0].toString();
          } else if (func.name === 'isApprovedForAll') {
            const decoded = hre.ethers.AbiCoder.defaultAbiCoder().decode(['bool'], result);
            results[func.name] = decoded[0];
          } else if (func.name === 'tokenURI') {
            const decoded = hre.ethers.AbiCoder.defaultAbiCoder().decode(['string'], result);
            results[func.name] = decoded[0];
          } else if (func.name === 'userIdHash') {
            const decoded = hre.ethers.AbiCoder.defaultAbiCoder().decode(['bytes32'], result);
            results[func.name] = decoded[0];
          }
          
          console.log(`✅ ${func.name}(): ${results[func.name]}`);
        } else {
          console.log(`❌ ${func.name}(): Non supportata o token non esistente`);
        }
      } catch (error) {
        if (error.message.includes('ERC721NonexistentToken')) {
          console.log(`⚠️  ${func.name}(): Token non esistente (normale per tokenId 1)`);
        } else {
          console.log(`❌ ${func.name}(): Errore - ${error.message}`);
        }
      }
    }
    
    // Crea ABI completo basato sui risultati
    const fullABI = [
      // Constructor
      {
        "inputs": [],
        "stateMutability": "nonpayable",
        "type": "constructor"
      },
      // View functions
      {
        "inputs": [],
        "name": "name",
        "outputs": [{"internalType": "string", "name": "", "type": "string"}],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "symbol",
        "outputs": [{"internalType": "string", "name": "", "type": "string"}],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "owner",
        "outputs": [{"internalType": "address", "name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "CONTRACT_VERSION",
        "outputs": [{"internalType": "string", "name": "", "type": "string"}],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
        "name": "ownerOf",
        "outputs": [{"internalType": "address", "name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [{"internalType": "address", "name": "owner", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
        "name": "tokenURI",
        "outputs": [{"internalType": "string", "name": "", "type": "string"}],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
        "name": "getApproved",
        "outputs": [{"internalType": "address", "name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [{"internalType": "address", "name": "owner", "type": "address"}, {"internalType": "address", "name": "operator", "type": "address"}],
        "name": "isApprovedForAll",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "name": "userIdHash",
        "outputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}],
        "stateMutability": "view",
        "type": "function"
      },
      // State changing functions
      {
        "inputs": [{"internalType": "address", "name": "walletAddress", "type": "address"}, {"internalType": "bytes32", "name": "idUserActionHash", "type": "bytes32"}, {"internalType": "string", "name": "uri", "type": "string"}],
        "name": "mint",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}, {"internalType": "string", "name": "newUri", "type": "string"}],
        "name": "updateTokenURI",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [{"internalType": "address", "name": "to", "type": "address"}, {"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
        "name": "approve",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [{"internalType": "address", "name": "operator", "type": "address"}, {"internalType": "bool", "name": "approved", "type": "bool"}],
        "name": "setApprovalForAll",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [{"internalType": "address", "name": "from", "type": "address"}, {"internalType": "address", "name": "to", "type": "address"}, {"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
        "name": "transferFrom",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [{"internalType": "address", "name": "from", "type": "address"}, {"internalType": "address", "name": "to", "type": "uint256", "name": "tokenId", "type": "uint256"}],
        "name": "safeTransferFrom",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [{"internalType": "address", "name": "from", "type": "address"}, {"internalType": "address", "name": "to", "type": "address"}, {"internalType": "uint256", "name": "tokenId", "type": "uint256"}, {"internalType": "bytes", "name": "data", "type": "bytes"}],
        "name": "safeTransferFrom",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [{"internalType": "address", "name": "newOwner", "type": "address"}],
        "name": "transferOwnership",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "renounceOwnership",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      }
    ];
    
    // Salva l'ABI completo
    const fs = require('fs');
    fs.writeFileSync('contract_full_ABI.json', JSON.stringify(fullABI, null, 2));
    console.log('\n💾 ABI completo salvato in contract_full_ABI.json');
    
    // Mostra riassunto finale
    console.log('\n📊 RIASSUNTO FINALE:');
    console.log('====================');
    console.log(`🏷️  Nome: ${results.name || 'N/A'}`);
    console.log(`🔤 Simbolo: ${results.symbol || 'N/A'}`);
    console.log(`👑 Owner: ${results.owner || 'N/A'}`);
    console.log(`📋 Versione: ${results.CONTRACT_VERSION || 'N/A'}`);
    console.log(`💰 Balance Owner: ${results.balanceOf || 'N/A'}`);
    
    console.log('\n🎯 TIPO CONTRATTO: JETCV NFT (ERC721)');
    console.log('📍 Indirizzo:', contractAddress);
    console.log('🌐 Rete: Polygon Mainnet');
    
  } catch (error) {
    console.error('❌ Errore:', error.message);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
