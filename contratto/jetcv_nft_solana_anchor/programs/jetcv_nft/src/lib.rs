use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, MintTo, Token, TokenAccount},
};
use mpl_token_metadata::{
    instructions::{CreateMasterEditionV3Cpi, CreateMetadataAccountV3Cpi},
    types::{CollectionDetails, Creator, DataV2, ProgrammableConfig, TokenStandard, Uses, Collection},
    accounts::{MasterEdition, Metadata},
};

declare_id!("J3tCv111111111111111111111111111111111111111");

#[program]
pub mod jetcv_nft {
    use super::*;

    /// Mint NFT con royalties = 0, nessun creator, e salva userIdHash in PDA legata al wallet.
    pub fn mint_nft(
        ctx: Context<MintNft>,
        name: String,
        symbol: String,
        uri: String,
        user_id_hash: [u8; 32],
    ) -> Result<()> {
        // 1) Salva userIdHash nel PDA
        let pda = &mut ctx.accounts.user_pda;
        pda.user = ctx.accounts.owner.key();
        pda.user_id_hash = user_id_hash;

        // 2) Crea metadata con seller_fee_basis_points = 0 e creators = None
        let data = DataV2 {
            name,
            symbol,
            uri,
            seller_fee_basis_points: 0,
            creators: None,            // 👉 nessun creator
            collection: None,
            uses: None,
        };

        // PDAs per metadata & master edition (derivabili da mint)
        let mint_pubkey = ctx.accounts.mint.key();
        let (metadata_pda, _bump_md) = mpl_token_metadata::pda::find_metadata_account(&mint_pubkey);
        let (master_edition_pda, _bump_me) = mpl_token_metadata::pda::find_master_edition_account(&mint_pubkey);

        // CPI: create metadata
        {
            let cpi_accounts = CreateMetadataAccountV3Cpi {
                metadata: &ctx.accounts.metadata.to_account_info(),
                mint: &ctx.accounts.mint.to_account_info(),
                mint_authority: &ctx.accounts.owner.to_account_info(),
                payer: &ctx.accounts.owner.to_account_info(),
                update_authority: (&ctx.accounts.owner.to_account_info(), true),
                system_program: &ctx.accounts.system_program.to_account_info(),
                rent: Some(&ctx.accounts.rent.to_account_info()),
            };
            // Controllo: l'account passato combacia con PDA attesa
            require_keys_eq!(metadata_pda, ctx.accounts.metadata.key(), CustomError::WrongMetadataPda);

            cpi_accounts.invoke(&mpl_token_metadata::instructions::CreateMetadataAccountV3CpiArgs {
                data,
                is_mutable: true,
                collection_details: None,
            })?;
        }

        // 3) Mint 1 token all'ATA dell'owner
        token::mint_to(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.owner_ata.to_account_info(),
                    authority: ctx.accounts.owner.to_account_info(),
                },
            ),
            1,
        )?;

        // 4) Crea master edition
        {
            let cpi_accounts = CreateMasterEditionV3Cpi {
                edition: &ctx.accounts.master_edition.to_account_info(),
                mint: &ctx.accounts.mint.to_account_info(),
                update_authority: &ctx.accounts.owner.to_account_info(),
                mint_authority: &ctx.accounts.owner.to_account_info(),
                payer: &ctx.accounts.owner.to_account_info(),
                metadata: &ctx.accounts.metadata.to_account_info(),
                token_program: &ctx.accounts.token_program.to_account_info(),
                system_program: &ctx.accounts.system_program.to_account_info(),
                rent: Some(&ctx.accounts.rent.to_account_info()),
            };
            require_keys_eq!(master_edition_pda, ctx.accounts.master_edition.key(), CustomError::WrongMasterEditionPda);

            cpi_accounts.invoke(&mpl_token_metadata::instructions::CreateMasterEditionV3CpiArgs {
                max_supply: Some(1),
            })?;
        }

        Ok(())
    }
}

#[derive(Accounts)]
pub struct MintNft<'info> {
    /// Payer e authority della mint
    #[account(mut)]
    pub owner: Signer<'info>,

    /// Mint dell'NFT (deve essere già creata con decimals=0 e mint_authority = owner)
    #[account(mut)]
    pub mint: Account<'info, Mint>,

    /// ATA dell'owner per la mint
    #[account(
        init_if_needed,
        payer = owner,
        associated_token::mint = mint,
        associated_token::authority = owner
    )]
    pub owner_ata: Account<'info, TokenAccount>,

    /// PDA che salva userIdHash per wallet
    #[account(
        init_if_needed,
        payer = owner,
        space = 8 + 32 + 32, // discriminator + Pubkey + [u8;32]
        seeds = [b"uid", owner.key().as_ref()],
        bump
    )]
    pub user_pda: Account<'info, UserPda>,

    /// Metadata PDA (unchecked ma verifichiamo la chiave in runtime)
    /// = find_metadata_account(mint)
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,

    /// Master edition PDA (unchecked, verifichiamo in runtime)
    /// = find_master_edition_account(mint)
    #[account(mut)]
    pub master_edition: UncheckedAccount<'info>,

    /// Programmi & sys
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    /// CHECK: chiamato dalla CPI di Metaplex, non letto direttamente
    pub token_metadata_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
    /// CHECK: passato a CPI
    pub rent: UncheckedAccount<'info>,
}

#[account]
pub struct UserPda {
    pub user: Pubkey,
    pub user_id_hash: [u8; 32],
}

#[error_code]
pub enum CustomError {
    #[msg("Provided Metadata PDA does not match the expected PDA.")]
    WrongMetadataPda,
    #[msg("Provided MasterEdition PDA does not match the expected PDA.")]
    WrongMasterEditionPda,
}
