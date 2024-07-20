import { Connection, Keypair, clusterApiUrl } from '@solana/web3.js';
import { TOKEN_2022_PROGRAM_ID, createAccount, mintTo, transferCheckedWithFee } from '@solana/spl-token';
import { addKeypairToEnvFile } from '@solana-developers/node-helpers';
import dotenv from 'dotenv';
import bs from 'bs58';
dotenv.config();

if (!process.env.PAYER || !process.env.MINT_AUTHORITY || !process.env.MINT_KEYPAIR || !process.env.OWNER || !process.env.FEE_RECIPIENT) {
  throw new Error('Necessary keypairs not found, have you run the create-token script?');
}

const connection = new Connection(clusterApiUrl("devnet"), "confirmed")

const payer = Keypair.fromSecretKey(bs.decode(process.env.PAYER));
if (!payer) {
  throw new Error('PAYER not found');
}

// Authority that can mint new tokens
const mintAuthority = Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(process.env.MINT_AUTHORITY))
);

// Mint account, tokens come from here
const mintKeypair = Keypair.fromSecretKey( new Uint8Array(JSON.parse(process.env.MINT_KEYPAIR)));
const mint = mintKeypair.publicKey;

const balance = await connection.getBalance(payer.publicKey);
if (balance < 10000000) {
  // 0.01 SOL
  throw new Error('Not enough SOL in payer account, please fund: ');
}

const owner = Keypair.fromSecretKey(bs.decode(process.env.OWNER));
if (!owner) {
  throw new Error('OWNER not found');
}

const feeBasisPoints = 100;
const decimals = 9;
const totalSupply = BigInt(10_000_000_000 * Math.pow(10, decimals));
const sourceAccount = await createAccount(
  connection, // connection to use
  payer, // payer of transaction and intialization fee
  mint, // mint for the account
  owner.publicKey, // owner of the new account
  undefined, // optional keypair
  undefined, // options for confirming transaction
  TOKEN_2022_PROGRAM_ID, // SPL token program id
);

// amount of tokens to mint to the new account
const mintAmount = totalSupply; // 10 Billion

const mintcheckSig = await mintTo(
  connection, // connection to use
  payer, // payer of transaction fee
  mint, // mint for the token account
  sourceAccount, // address of account to mint to
  mintAuthority, // minting authority
  mintAmount, // amount to mint
  [], // signing acocunt
  undefined, // options for confirming the transaction
  TOKEN_2022_PROGRAM_ID, // SPL token program id
);
console.log(
  'Tokens minted:',
  `https://solana.fm/tx/${mintcheckSig}?cluster=devnet-solana`,
);

const recipientKeypair = Keypair.fromSecretKey(bs.decode(process.env.FEE_RECIPIENT));
if (!recipientKeypair) {
  throw new Error('PAYER not found');
}

const destinationAccount = await createAccount(
  connection, // connection to use
  payer, // payer of transaction and intialization fee
  mint, // mint for the account
  owner.publicKey, // owner of the new account
  recipientKeypair, // optional keypair
  undefined, // options for confirming transaction
  TOKEN_2022_PROGRAM_ID // SPL token program id
);

const transferAmount = totalSupply;

let fee = (transferAmount * BigInt(feeBasisPoints)) / BigInt(10_000);
if (fee > BigInt(10_000 * Math.pow(10, decimals))) {
  fee = BigInt(10_000 * Math.pow(10, decimals)); // Max fee
}

const transferCheckedWithFeeSig = await transferCheckedWithFee(
  connection, // connection to use
  payer, // payer of the transaction fee
  sourceAccount, // source account
  mint, // mint for the account
  destinationAccount, // destination account
  owner, // owner of the source account
  transferAmount, // number of tokens to transfer
  decimals, // number of decimals
  fee, // expected fee collected for transfer
  [], // signing accounts
  undefined, // options for confirming the transaction
  TOKEN_2022_PROGRAM_ID // SPL token program id
);

console.log(
  'Tokens minted and transferred:',
  `https://solana.fm/tx/${transferCheckedWithFeeSig}?cluster=devnet-solana`
);