import axios from "axios";

const BASE_URL = "http://localhost:4500";

async function testServer() {
  console.log("🧪 Testing JetCV NFT Backend Server...\n");

  try {
    // Test 1: Check if server is running
    console.log("1. Testing server availability...");
    const response = await axios.get(`${BASE_URL}/api-docs.json`);
    console.log("✅ Server is running and responding");
    console.log(`📊 API Documentation available at ${BASE_URL}/docs\n`);

    // Test 2: Test contract info endpoint
    console.log("2. Testing contract info endpoint...");
    try {
      const contractInfo = await axios.get(`${BASE_URL}/api/nft/contract-info`);
      console.log("✅ Contract info endpoint working");
      console.log(
        `📋 Contract: ${contractInfo.data.name} (${contractInfo.data.symbol})`,
      );
    } catch (error) {
      console.log(
        "⚠️ Contract info endpoint failed (might be expected if contract not deployed)",
      );
      console.log(`   Error: ${error.response?.data?.error || error.message}`);
    }
    console.log("");

    // Test 3: Test wallet creation
    console.log("3. Testing wallet creation...");
    try {
      const walletResponse = await axios.post(`${BASE_URL}/api/wallet/create`);
      console.log("✅ Wallet creation endpoint working");
      console.log(`💰 Created wallet: ${walletResponse.data.address}`);
    } catch (error) {
      console.log(
        "⚠️ Wallet creation failed (might be expected if Keycloak not configured)",
      );
      console.log(`   Error: ${error.response?.data?.error || error.message}`);
    }
    console.log("");

    // Test 4: Test balance endpoint
    console.log("4. Testing balance endpoint...");
    try {
      const testAddress = "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6"; // Example address
      const balanceResponse = await axios.get(
        `${BASE_URL}/api/wallet/${testAddress}/balance`,
      );
      console.log("✅ Balance endpoint working");
      console.log(`💰 Balance: ${balanceResponse.data.balance} MATIC`);
    } catch (error) {
      console.log("⚠️ Balance endpoint failed");
      console.log(`   Error: ${error.response?.data?.error || error.message}`);
    }
    console.log("");

    // Test 5: Test NFT endpoints
    console.log("5. Testing NFT endpoints...");
    try {
      const testAddress = "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6"; // Example address
      const hasJetCV = await axios.get(
        `${BASE_URL}/api/nft/user/${testAddress}/hasJetCV`,
      );
      console.log("✅ NFT endpoints working");
      console.log(`🎨 Has JetCV: ${hasJetCV.data.hasJetCV}`);
    } catch (error) {
      console.log(
        "⚠️ NFT endpoints failed (might be expected if contract not deployed)",
      );
      console.log(`   Error: ${error.response?.data?.error || error.message}`);
    }
    console.log("");

    // Test 6: Test legacy endpoints
    console.log("6. Testing legacy endpoints...");
    try {
      const testAddress = "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6"; // Example address
      const legacyResponse = await axios.get(
        `${BASE_URL}/api/user/${testAddress}/hasJetCV`,
      );
      console.log("✅ Legacy endpoints working");
      console.log(`🔄 Legacy hasJetCV: ${legacyResponse.data.hasJetCV}`);
    } catch (error) {
      console.log("⚠️ Legacy endpoints failed");
      console.log(`   Error: ${error.response?.data?.error || error.message}`);
    }
    console.log("");

    console.log("🎉 Server test completed!");
    console.log(`📚 Documentation: ${BASE_URL}/docs`);
    console.log(`🌐 Web Interface: ${BASE_URL}`);
  } catch (error) {
    console.error("❌ Server test failed:", error.message);
    if (error.code === "ECONNREFUSED") {
      console.log("💡 Make sure the server is running with: npm start");
    }
  }
}

// Run the test
testServer().catch(console.error);
