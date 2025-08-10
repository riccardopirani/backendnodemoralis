const hre = require('hardhat');

async function main() {
  const contractAddress = '0xbf36f3B345aBbbfCb5cCB4aDE7FD9237BD16eFdD';
  
  try {
    const provider = new hre.ethers.JsonRpcProvider(process.env.POLYGON_RPC);
    
    // Funzioni comuni per testare
    const commonFunctions = [
      { name: 'name', selector: '0x06fdde03', params: [] },
      { name: 'symbol', selector: '0x95d89b41', params: [] },
      { name: 'decimals', selector: '0x313ce567', params: [] },
      { name: 'totalSupply', selector: '0x18160ddd', params: [] },
      { name: 'balanceOf', selector: '0x70a08231', params: ['0x0000000000000000000000000000000000000000'] },
      { name: 'owner', selector: '0x8da5cb5b', params: [] },
      { name: 'CONTRACT_VERSION', selector: '0x54fd4d50', params: [] }
    ];
    
    console.log('🔍 Analizzando contratto:', contractAddress);
    console.log('📋 Testando funzioni comuni...\n');
    
    const results = {};
    
    for (const func of commonFunctions) {
      try {
        const data = func.params.length > 0 ? 
          func.selector + func.params.join('') : 
          func.selector;
          
        const result = await provider.call({
          to: contractAddress,
          data: data
        });
        
        if (result && result !== '0x') {
          // Decodifica il risultato se è una stringa
          if (func.name === 'name' || func.name === 'symbol') {
            const decoded = hre.ethers.AbiCoder.defaultAbiCoder().decode(['string'], result);
            results[func.name] = decoded[0];
          } else if (func.name === 'decimals') {
            const decoded = hre.ethers.AbiCoder.defaultAbiCoder().decode(['uint8'], result);
            results[func.name] = decoded[0].toString();
          } else if (func.name === 'totalSupply' || func.name === 'balanceOf') {
            const decoded = hre.ethers.AbiCoder.defaultAbiCoder().decode(['uint256'], result);
            results[func.name] = decoded[0].toString();
          } else if (func.name === 'owner') {
            const decoded = hre.ethers.AbiCoder.defaultAbiCoder().decode(['address'], result);
            results[func.name] = decoded[0];
          } else if (func.name === 'CONTRACT_VERSION') {
            const decoded = hre.ethers.AbiCoder.defaultAbiCoder().decode(['string'], result);
            results[func.name] = decoded[0];
          }
          
          console.log(`✅ ${func.name}(): ${results[func.name]}`);
        } else {
          console.log(`❌ ${func.name}(): Non supportata`);
        }
      } catch (error) {
        console.log(`❌ ${func.name}(): Errore - ${error.message}`);
      }
    }
    
    // Crea un ABI minimo basato sui risultati
    const minimalABI = [];
    
    if (results.name) {
      minimalABI.push({
        "inputs": [],
        "name": "name",
        "outputs": [{"internalType": "string", "name": "", "type": "string"}],
        "stateMutability": "view",
        "type": "function"
      });
    }
    
    if (results.symbol) {
      minimalABI.push({
        "inputs": [],
        "name": "symbol", 
        "outputs": [{"internalType": "string", "name": "", "type": "string"}],
        "stateMutability": "view",
        "type": "function"
      });
    }
    
    if (results.decimals) {
      minimalABI.push({
        "inputs": [],
        "name": "decimals",
        "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
        "stateMutability": "view",
        "type": "function"
      });
    }
    
    if (results.totalSupply) {
      minimalABI.push({
        "inputs": [],
        "name": "totalSupply",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
      });
    }
    
    if (results.balanceOf) {
      minimalABI.push({
        "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
      });
    }
    
    if (results.owner) {
      minimalABI.push({
        "inputs": [],
        "name": "owner",
        "outputs": [{"internalType": "address", "name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function"
      });
    }
    
    if (results.CONTRACT_VERSION) {
      minimalABI.push({
        "inputs": [],
        "name": "CONTRACT_VERSION",
        "outputs": [{"internalType": "string", "name": "", "type": "string"}],
        "stateMutability": "view",
        "type": "function"
      });
    }
    
    // Salva l'ABI minimo
    const fs = require('fs');
    fs.writeFileSync('contract_minimal_ABI.json', JSON.stringify(minimalABI, null, 2));
    console.log('\n💾 ABI minimo salvato in contract_minimal_ABI.json');
    
    // Mostra riassunto
    console.log('\n📊 RIASSUNTO CONTRATTO:');
    console.log('========================');
    console.log(`🏷️  Nome: ${results.name || 'N/A'}`);
    console.log(`🔤 Simbolo: ${results.symbol || 'N/A'}`);
    console.log(`🔢 Decimali: ${results.decimals || 'N/A'}`);
    console.log(`📈 Supply Totale: ${results.totalSupply || 'N/A'}`);
    console.log(`👑 Owner: ${results.owner || 'N/A'}`);
    console.log(`📋 Versione: ${results.CONTRACT_VERSION || 'N/A'}`);
    
  } catch (error) {
    console.error('❌ Errore:', error.message);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
