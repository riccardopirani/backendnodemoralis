use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, MintTo, Token, TokenAccount},
    metadata::{
        self,
        Metadata,
        MasterEditionAccount,
        MetadataAccount,
        mpl_token_metadata::types::DataV2
    },
};

declare_id!("JEtCv111111111111111111111111111111111111111"); // dopo il primo deploy sostituisci con il vero programId

#[program]
pub mod jetcv_nft {
    use super::*;

    /// Mint di un NFT 1/1 (supply=1) al wallet `owner`,
    /// creazione Metadata + MasterEdition con seller_fee_basis_points = 0 (no royalties),
    /// salvataggio userIdHash in un PDA.
    pub fn mint_cv(
        ctx: Context<MintCv>,
        user_id_hash: [u8; 32],
        name: String,
        symbol: String,
        uri: String,
    ) -> Result<()> {
        // 1) Mintare 1 al token account del destinatario
        token::mint_to(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.owner_ata.to_account_info(),
                    authority: ctx.accounts.mint_authority.to_account_info(),
                },
            ),
            1,
        )?;

        // 2) Metadati (royalties = 0, creators = None)
        let data = DataV2 {
            name,
            symbol,
            uri,
            seller_fee_basis_points: 0, // <-- niente royalties
            creators: None,              // nessun creator on-chain
            collection: None,
            uses: None,
        };

        // Crea Metadata
        metadata::create_v3(
            CpiContext::new(
                ctx.accounts.token_metadata_program.to_account_info(),
                metadata::CreateV3 {
                    metadata: ctx.accounts.metadata.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                    mint_authority: ctx.accounts.mint_authority.to_account_info(),
                    payer: ctx.accounts.payer.to_account_info(),
                    update_authority: ctx.accounts.update_authority.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                    rent: ctx.accounts.rent.to_account_info(),
                },
            ),
            data,
            false, // is_mutable
            true,  // update_authority_is_signer
            None,  // collection details
        )?;

        // 3) Master Edition (NFT 1/1)
        metadata::create_master_edition_v3(
            CpiContext::new(
                ctx.accounts.token_metadata_program.to_account_info(),
                metadata::CreateMasterEditionV3 {
                    edition: ctx.accounts.master_edition.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                    update_authority: ctx.accounts.update_authority.to_account_info(),
                    mint_authority: ctx.accounts.mint_authority.to_account_info(),
                    payer: ctx.accounts.payer.to_account_info(),
                    metadata: ctx.accounts.metadata.to_account_info(),
                    token_program: ctx.accounts.token_program.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                    rent: ctx.accounts.rent.to_account_info(),
                },
            ),
            Some(0), // max_supply = 0 => classico 1/1
        )?;

        // 4) Salva userIdHash nel PDA
        let data_acc = &mut ctx.accounts.user_data;
        data_acc.mint = ctx.accounts.mint.key();
        data_acc.user_id_hash = user_id_hash;

        Ok(())
    }

    /// Aggiorna l'URI dei metadati (se vuoi una funzione di update).
    /// NB: devi essere `update_authority`.
    pub fn update_uri(_ctx: Context<UpdateUri>, _new_uri: String) -> Result<()> {
        // Lasciata come stub: con Metaplex V3 l’aggiornamento
        // tipicamente usa `update_v1` con CPI; implementalo se ti serve.
        Ok(())
    }
}

#[derive(Accounts)]
pub struct MintCv<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    /// Mint SPL già creato (decimals=0). Puoi anche crearne uno via CPI in un'altra ix.
    #[account(mut)]
    pub mint: Account<'info, Mint>,

    /// Chi è authority del mint (può essere il payer)
    pub mint_authority: Signer<'info>,

    /// Proprietario destinatario NFT
    /// ATA (PDA) dell’owner per questo mint
    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = mint,
        associated_token::authority = owner
    )]
    pub owner_ata: Account<'info, TokenAccount>,

    /// CHECK: owner (wallet di destinazione)
    pub owner: UncheckedAccount<'info>,

    /// Metadata PDA per il mint (mut per create_v3)
    /// = find_program_address(["metadata", token_metadata_program_id, mint])
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,

    /// MasterEdition PDA per il mint (mut per create_master_edition_v3)
    /// = find_program_address(["metadata", token_metadata_program_id, mint, "edition"])
    #[account(mut)]
    pub master_edition: UncheckedAccount<'info>,

    /// PDA per salvare userIdHash
    #[account(
        init,
        payer = payer,
        space = 8 + UserData::LEN,
        seeds = [b"user_data", mint.key().as_ref()],
        bump
    )]
    pub user_data: Account<'info, UserData>,

    // Programmi e sys
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,

    /// CHECK: Metaplex Token Metadata program (pubkey noto)
    pub token_metadata_program: UncheckedAccount<'info>,

    /// Chi può aggiornare i metadati (tipicamente uguale a mint_authority/payer)
    pub update_authority: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct UpdateUri<'info> {
    /// Metti qui gli account necessari se implementi l’update reale
    pub update_authority: Signer<'info>,
}

#[account]
pub struct UserData {
    pub mint: Pubkey,
    pub user_id_hash: [u8; 32],
}
// 32 + 32
impl UserData {
    pub const LEN: usize = 64;
}
