const request = require("supertest");
require("dotenv").config();

let server;

beforeAll(async () => {
  server = require("./server"); // Assumendo che il file principale sia `server.js`
});

describe("API JetCV - Wallet", () => {
  it("POST /api/wallet/create - dovrebbe creare un wallet", async () => {
    const res = await request("http://localhost:3000")
      .post("/api/wallet/create")
      .send();

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("address");
    expect(res.body).toHaveProperty("privateKey");
    expect(res.body).toHaveProperty("mnemonic");
  });

  it("GET /api/wallet/:address/balance - dovrebbe restituire saldo", async () => {
    const walletRes = await request("http://localhost:3000")
      .post("/api/wallet/create")
      .send();

    const address = walletRes.body.address;

    const balanceRes = await request("http://localhost:3000").get(
      `/api/wallet/${address}/balance`
    );

    expect(balanceRes.statusCode).toBe(200);
    expect(balanceRes.body).toHaveProperty("balance");
  });
});

describe("API JetCV - NFT", () => {
  it("GET /api/nft/:address - dovrebbe restituire nfts array", async () => {
    const walletRes = await request("http://localhost:3000")
      .post("/api/wallet/create")
      .send();

    const address = walletRes.body.address;

    const nftRes = await request("http://localhost:3000").get(
      `/api/nft/${address}`
    );

    expect(nftRes.statusCode).toBe(200);
    expect(nftRes.body).toHaveProperty("nfts");
    expect(Array.isArray(nftRes.body.nfts)).toBe(true);
  });
});
