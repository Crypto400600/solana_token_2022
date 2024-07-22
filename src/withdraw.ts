import { PublicKey } from "@solana/web3.js";

const { Connection, Keypair, clusterApiUrl } = require('@solana/web3.js');
const {
  TOKEN_2022_PROGRAM_ID,
  getTransferFeeAmount,
  unpackAccount,
  withdrawWithheldTokensFromAccounts,
  createAssociatedTokenAccountIdempotent
} = require('@solana/spl-token');
const bs = require('bs58');
const dotenv = require('dotenv');
dotenv.config();

const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

const payer = Keypair.fromSecretKey(bs.decode(process.env.PAYER));
if (!payer) {
  throw new Error('PAYER not found');
}

const recipientPublicKey = new PublicKey(process.env.FEE_RECIPIENT_WALLET);

const mint = Keypair.fromSecretKey(new Uint8Array(JSON.parse(process.env.MINT_KEYPAIR))).publicKey;

const withdrawWithheldAuthority = Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(process.env.WITHDRAW_WITHHELD_AUTHORITY)),
);

const balance = await connection.getBalance(payer.publicKey);
if (balance < 10000000) {
  // 0.01 SOL
  throw new Error(`Not enough SOL in payer account, please fund: ${payer.publicKey.toBase58()}`);
}

const allAccounts = await connection.getProgramAccounts(TOKEN_2022_PROGRAM_ID, {
  commitment: 'confirmed',
  filters: [
    {
      memcmp: {
        offset: 0,
        bytes: mint.toString(),
      },
    },
  ],
});

const accountsToWithdrawFrom = [];

for (const accountInfo of allAccounts) {
  const account = unpackAccount(accountInfo.pubkey, accountInfo.account, TOKEN_2022_PROGRAM_ID);

  // We then extract the transfer fee extension data from the account
  const transferFeeAmount = getTransferFeeAmount(account);

  if (transferFeeAmount !== null && transferFeeAmount.withheldAmount > BigInt(0)) {
    accountsToWithdrawFrom.push(accountInfo.pubkey);
  }
}

if (accountsToWithdrawFrom.length === 0) {
  throw new Error('No accounts to withdraw from: no transfers have been made');
} else {
  console.log('Found', accountsToWithdrawFrom.length, 'accounts to withdraw from 🤑');
}

console.log(accountsToWithdrawFrom);
console.log(recipientPublicKey.toBase58());

const feeVaultAccount = await createAssociatedTokenAccountIdempotent(
  connection,
  payer,
  mint,
  // recipientKeypair.publicKey,
  recipientPublicKey,
  {},
  TOKEN_2022_PROGRAM_ID,
);

const withdrawTokensSig = await withdrawWithheldTokensFromAccounts(
  connection, // connection to use
  payer, // payer of the transaction fee
  mint, // the token mint
  feeVaultAccount, // the destination account
  withdrawWithheldAuthority, // the withdraw withheld token authority
  [], // signing accounts
  accountsToWithdrawFrom, // source accounts from which to withdraw withheld fees
  undefined, // options for confirming the transaction
  TOKEN_2022_PROGRAM_ID, // SPL token program id
);

console.log('Bag secured, check it:', `https://explorer.solana.com/tx/${withdrawTokensSig}?cluster=devnet`);

// Optionally - you can also withdraw withheld tokens from the mint itself
// see ReadMe for the difference

// await withdrawWithheldTokensFromMint(
//   connection, // connection to use
//   payer, // payer of the transaction fee
//   mint, // the token mint
//   recipientKeypair.publicKey, // the destination account
//   withdrawWithheldAuthority, // the withdraw withheld authority
//   [], // signing accounts
//   undefined, // options for confirming the transaction
//   TOKEN_2022_PROGRAM_ID // SPL token program id
// );
