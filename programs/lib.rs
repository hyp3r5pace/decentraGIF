use anchor_lang::prelude::*;

declare_id!("Bmn5Pp6urCR5S9kZc9QBthdCiHUb6tvVsaTt85874Znk");

#[program]
pub mod myepicproject {
    use super::*;
    pub fn start_stuff_off(ctx: Context<StartStuffOff>) -> ProgramResult {
        // get reference to the account
        let base_account = &mut ctx.accounts.base_account;
        // intialize total gifs
        base_account.total_gifs = 0;
        Ok(())
    }


    pub fn add_gif(ctx: Context<AddGif>, gif_link: String) -> ProgramResult {
        // Get a reference to the account and increment total_gifs.
        let base_account = &mut ctx.accounts.base_account;
        let user = &mut ctx.accounts.user;

        // Build the struct
        let item = ItemStruct {
            gif_link: gif_link.to_string(),
            user_address: *user.to_account_info().key,
        };

        // add the gif to the vector
        base_account.gif_list.push(item);
        base_account.total_gifs += 1;
        Ok(())
    }
}

// Attach certain variables to the StartStuffOff context.
#[derive(Accounts)]
pub struct StartStuffOff<'info> {
    // defining how to initialize BaseAccount
    #[account(init, payer = user, space = 9000)]
    pub base_account: Account<'info, BaseAccount>,
    #[account(mut)]
    // get the secret key from user calling the function
    // to ensure he owns the wallet
    pub user: Signer<'info>,
    // a reference to 'System Program' --> a intregal program of solana chain which handles
    // allocation, creation of accounts and assiging them to programs
    pub system_program: Program <'info, System>,
}

// Define what information will be passed in the AddGif Context
#[derive(Accounts)]
pub struct AddGif<'info> {
    #[account(mut)]
    pub base_account: Account<'info, BaseAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
}


// A custom Struct which stores the gif link and wallet address
#[derive(Debug, Clone, AnchorSerialize, AnchorDeserialize)]
pub struct ItemStruct {
    pub gif_link: String,
    pub user_address: Pubkey,
}


// Tell Solana what we want to store on this account.
#[account]
pub struct BaseAccount {
    pub total_gifs: u64,
    // A vector of type ItemStruct which stores the gif links
    pub gif_list: Vec<ItemStruct>,
    // storing the user address
    pub user_address: Pubkey,
}