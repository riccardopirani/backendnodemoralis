const hre = require('hardhat');

async function main() {
  const contractAddress = '0xbf36f3B345aBbbfCb5cCB4aDE7FD9237BD16eFdD';
  
  try {
    // Prova a connetterti alla rete Polygon
    const provider = new hre.ethers.JsonRpcProvider(process.env.POLYGON_RPC);
    
    // Ottieni il bytecode del contratto
    const bytecode = await provider.getCode(contractAddress);
    
    if (bytecode === '0x') {
      console.log('❌ Contratto non trovato o indirizzo non valido');
      return;
    }
    
    console.log('✅ Contratto trovato!');
    console.log('📝 Bytecode length:', bytecode.length);
    
    // Prova a ottenere informazioni base del contratto
    try {
      // Prova a chiamare alcune funzioni comuni per capire il tipo di contratto
      const nameCall = await provider.call({
        to: contractAddress,
        data: '0x06fdde03' // selector per name()
      });
      
      const symbolCall = await provider.call({
        to: contractAddress,
        data: '0x95d89b41' // selector per symbol()
      });
      
      console.log('🔍 Funzioni rilevate:');
      console.log('- name():', nameCall);
      console.log('- symbol():', symbolCall);
      
    } catch (error) {
      console.log('⚠️ Non è possibile chiamare le funzioni standard');
    }
    
    // Salva il bytecode per analisi
    const fs = require('fs');
    fs.writeFileSync('contract_bytecode.txt', bytecode);
    console.log('💾 Bytecode salvato in contract_bytecode.txt');
    
  } catch (error) {
    console.error('❌ Errore:', error.message);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
