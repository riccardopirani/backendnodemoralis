const anchor = require("@coral-xyz/anchor");
const { PublicKey, SystemProgram } = require("@solana/web3.js");
const { getAssociatedTokenAddressSync, createMint, getOrCreateAssociatedTokenAccount } = require("@solana/spl-token");

// Program ID Metaplex Token Metadata (mainnet/devnet/testnet)
const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

function findMetadataPda(mint) {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  )[0];
}

function findMasterEditionPda(mint) {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
      Buffer.from("edition"),
    ],
    TOKEN_METADATA_PROGRAM_ID
  )[0];
}

function findUserDataPda(programId, mint) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("user_data"), mint.toBuffer()],
    programId
  )[0];
}

(async () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const wallet = provider.wallet;
  const program = anchor.workspace.JetcvNft; // nome dal Cargo/idl (camel-case di jetcv_nft)

  // 1) Crea un mint SPL (decimals=0)
  const mintPubkey = await createMint(
    provider.connection,
    wallet.payer,        // fee payer
    wallet.publicKey,    // mint authority
    wallet.publicKey,    // freeze authority (puoi mettere null)
    0                    // decimals
  );

  console.log("Mint:", mintPubkey.toBase58());

  // 2) Deriva ATA del destinatario (qui usiamo lo stesso wallet)
  const owner = wallet.publicKey;
  const ownerAta = getAssociatedTokenAddressSync(mintPubkey, owner);
  // L'ATA verrà creato dall'istruzione Anchor (init_if_needed), non serve crearlo ora.

  // 3) PDAs Metaplex + UserData
  const metadataPda = findMetadataPda(mintPubkey);
  const masterEditionPda = findMasterEditionPda(mintPubkey);
  const userDataPda = findUserDataPda(program.programId, mintPubkey);

  // 4) Parametri business
  const name = "JetCVNFT";
  const symbol = "JCV";
  const uri = "ipfs://Qm.../metadata.json"; // tuo metadata (nessuna royalty dentro non serve, tanto qui è 0)
  const userIdHashHex = "d8f5f9f3a955e7c4cfa0b7c78f9e1a2bcfa3d1e4b6c5a4830f9e7c6a5b4c3d2e";
  const userIdHash = Buffer.from(userIdHashHex, "hex"); // 32 byte

  // 5) Chiama l’istruzione mint_cv
  await program.methods
    .mintCv([...userIdHash], name, symbol, uri)
    .accounts({
      payer: wallet.publicKey,
      mint: mintPubkey,
      mintAuthority: wallet.publicKey,
      ownerAta,
      owner, // destinatario NFT
      metadata: metadataPda,
      masterEdition: masterEditionPda,
      userData: userDataPda,
      tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      associatedTokenProgram: new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
      tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
      updateAuthority: wallet.publicKey,
      systemProgram: SystemProgram.programId,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    })
    .rpc();

  console.log("Minted NFT 1/1 senza royalties. UserData PDA:", userDataPda.toBase58());
})();
