import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, createMint } from "@solana/spl-token";

describe("jetcv_nft", () => {
  const provider = anchor.AnchorProvider.local();
  anchor.setProvider(provider);
  const wallet = provider.wallet as anchor.Wallet;

  const program = anchor.workspace.JetcvNft as Program;

  it("build context and (optionally) calls mint_nft", async () => {
    // Solo setup dimostrativo (completa secondo le tue esigenze)
    // 1) crea una mint 0-decimals di cui il wallet è mint_authority
    // 2) calcola metadata & master edition PDA
    // 3) invoca mint_nft con name/symbol/uri e userIdHash=[u8;32]
  });
});
