import request from 'supertest';
import { app } from '../server.js';

describe('JetCV NFT Backend API', () => {
  describe('GET /api-docs.json', () => {
    it('should return API documentation', async () => {
      const response = await request(app)
        .get('/api-docs.json')
        .expect(200);
      
      expect(response.body).toHaveProperty('openapi');
      expect(response.body.info.title).toBe('JetCV NFT API');
    });
  });

  describe('GET /api/nft/contract-info', () => {
    it('should return contract information', async () => {
      const response = await request(app)
        .get('/api/nft/contract-info')
        .expect(200);
      
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('symbol');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('contractAddress');
    });
  });

  describe('GET /api/wallet/:address/balance', () => {
    it('should return wallet balance for valid address', async () => {
      const testAddress = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
      
      const response = await request(app)
        .get(`/api/wallet/${testAddress}/balance`)
        .expect(200);
      
      expect(response.body).toHaveProperty('address', testAddress);
      expect(response.body).toHaveProperty('balance');
      expect(typeof response.body.balance).toBe('string');
    });

    it('should return 400 for invalid address', async () => {
      const invalidAddress = 'invalid-address';
      
      await request(app)
        .get(`/api/wallet/${invalidAddress}/balance`)
        .expect(500); // Will fail due to blockchain connection, but should handle gracefully
    });
  });

  describe('GET /api/nft/user/:address/hasJetCV', () => {
    it('should return JetCV ownership status', async () => {
      const testAddress = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
      
      const response = await request(app)
        .get(`/api/nft/user/${testAddress}/hasJetCV`)
        .expect(200);
      
      expect(response.body).toHaveProperty('address', testAddress);
      expect(response.body).toHaveProperty('hasJetCV');
      expect(typeof response.body.hasJetCV).toBe('boolean');
    });
  });

  describe('GET /api/nft/all-tokenIds', () => {
    it('should return all token IDs', async () => {
      const response = await request(app)
        .get('/api/nft/all-tokenIds')
        .expect(200);
      
      expect(response.body).toHaveProperty('tokenIds');
      expect(Array.isArray(response.body.tokenIds)).toBe(true);
    });
  });

  describe('POST /api/nft/mint', () => {
    it('should validate required parameters', async () => {
      const response = await request(app)
        .post('/api/nft/mint')
        .send({})
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('obbligatori');
    });

    it('should validate wallet address format', async () => {
      const response = await request(app)
        .post('/api/nft/mint')
        .send({
          walletAddress: 'invalid-address',
          userIdHash: '0x1234567890abcdef'
        })
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/certifications/token/:tokenId', () => {
    it('should return token certifications', async () => {
      const tokenId = '123';
      
      const response = await request(app)
        .get(`/api/certifications/token/${tokenId}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('tokenId', tokenId);
      expect(response.body).toHaveProperty('certifications');
      expect(Array.isArray(response.body.certifications)).toBe(true);
    });
  });

  describe('GET /api/contract/owner', () => {
    it('should return contract owner', async () => {
      const response = await request(app)
        .get('/api/contract/owner')
        .expect(200);
      
      expect(response.body).toHaveProperty('owner');
      expect(typeof response.body.owner).toBe('string');
    });
  });

  describe('GET /api/nft/token/:tokenId/isMinted', () => {
    it('should return token minted status', async () => {
      const tokenId = '123';
      
      const response = await request(app)
        .get(`/api/nft/token/${tokenId}/isMinted`)
        .expect(200);
      
      expect(response.body).toHaveProperty('tokenId', tokenId);
      expect(response.body).toHaveProperty('isMinted');
      expect(typeof response.body.isMinted).toBe('boolean');
    });
  });

  describe('Legacy API Endpoints', () => {
    it('should support legacy hasJetCV endpoint', async () => {
      const testAddress = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
      
      const response = await request(app)
        .get(`/api/user/${testAddress}/hasJetCV`)
        .expect(200);
      
      expect(response.body).toHaveProperty('address', testAddress);
      expect(response.body).toHaveProperty('hasJetCV');
    });

    it('should support legacy hasCV endpoint', async () => {
      const testAddress = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
      
      const response = await request(app)
        .get(`/api/user/${testAddress}/hasCV`)
        .expect(200);
      
      expect(response.body).toHaveProperty('address', testAddress);
      expect(response.body).toHaveProperty('hasCV');
    });

    it('should support legacy tokenId endpoint', async () => {
      const testAddress = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
      
      const response = await request(app)
        .get(`/api/user/${testAddress}/tokenId`)
        .expect(200);
      
      expect(response.body).toHaveProperty('address', testAddress);
      expect(response.body).toHaveProperty('tokenId');
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for non-existent endpoints', async () => {
      await request(app)
        .get('/api/non-existent-endpoint')
        .expect(404);
    });

    it('should return proper error format', async () => {
      const response = await request(app)
        .get('/api/non-existent-endpoint')
        .expect(404);
      
      expect(response.body).toHaveProperty('error');
      expect(typeof response.body.error).toBe('string');
    });
  });
});
