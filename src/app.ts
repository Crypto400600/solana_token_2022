// Import necessary functions and constants from the Solana web3.js and SPL Token packages
const {
  sendAndConfirmTransaction,
  Connection,
  Keypair,
  clusterApiUrl,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
  Cluster,
  PublicKey,
  TransactionInstruction,
} = require('@solana/web3.js');

const {
  ExtensionType,
  createInitializeMintInstruction,
  createInitializeMetadataPointerInstruction,
  mintTo,
  createAccount,
  getMintLen,
  getTransferFeeAmount,
  unpackAccount,
  LENGTH_SIZE,
  TOKEN_2022_PROGRAM_ID,
  TYPE_SIZE,
  createInitializeTransferFeeConfigInstruction,
  harvestWithheldTokensToMint,
  transferCheckedWithFee,
  withdrawWithheldTokensFromAccounts,
  withdrawWithheldTokensFromMint,
  getOrCreateAssociatedTokenAccount,
  createAssociatedTokenAccountIdempotent,
} = require('@solana/spl-token');
const {
  createInitializeInstruction,
  createUpdateFieldInstruction,
  pack,
  TokenMetadata,
} = require('@solana/spl-token-metadata');
import { addKeypairToEnvFile } from '@solana-developers/node-helpers';
import { uploadOffChainMetadata } from './helpers';
import bs from 'bs58';
import dotenv from 'dotenv';
dotenv.config();

// Initialize connection to local Solana node
const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

// Generate keys for payer, mint authority, and mint
// const payer = Keypair.generate();
const payer = Keypair.fromSecretKey(bs.decode(process.env.PAYER));
if (!payer) {
  throw new Error('PAYER not found');
}
console.log('Payer address:', payer.publicKey.toBase58());
console.log('Payer Account Balance:', await connection.getBalance(payer.publicKey));

// Initialize token MetaData
const imagePath = 'src/logo1.png';
const metadataPath = 'src/metadata.json';
const tokenName = 'Trump Bulletverse';
const tokenDescription = 'The First AI-powered Memecoin Creating Infinite Meme Games on Solana';
const tokenSymbol = '$BTrump';
const tokenExternalUrl = 'https://solana.com/';
const tokenAdditionalMetadata = {
  speciality: 'Trump',
  personality: 'Cool',
};

const tokenUri = await uploadOffChainMetadata(
  {
    tokenName,
    tokenDescription,
    tokenSymbol,
    imagePath,
    metadataPath,
    tokenExternalUrl,
    tokenAdditionalMetadata,
  },
  payer,
);
console.log('Token URI:', tokenUri);

const mintAuthority = Keypair.generate();
await addKeypairToEnvFile(mintAuthority, 'MINT_AUTHORITY');

const mintKeypair = Keypair.generate();
await addKeypairToEnvFile(mintKeypair, 'MINT_KEYPAIR');
const mint = mintKeypair.publicKey;

const metadata: typeof TokenMetadata = {
  mint: mint,
  name: tokenName,
  symbol: tokenSymbol,
  uri: tokenUri,
  additionalMetadata: Object.entries(tokenAdditionalMetadata || []).map(([key, value]) => [key, value]),
};

// Generate keys for transfer fee config authority and withdrawal authority
const transferFeeConfigAuthority = Keypair.generate();
await addKeypairToEnvFile(transferFeeConfigAuthority, 'TRANSFER_FEE_CONFIG_AUTHORITY');

const withdrawWithheldAuthority = Keypair.generate();
await addKeypairToEnvFile(withdrawWithheldAuthority, 'WITHDRAW_WITHHELD_AUTHORITY');

// Define the extensions to be used by the mint
const extensions = [ExtensionType.MetadataPointer, ExtensionType.TransferFeeConfig];

// Calculate the length of the mint
const mintLen = getMintLen(extensions);
const metadataLen = TYPE_SIZE + LENGTH_SIZE + pack(metadata).length;

// Set the decimals, fee basis points, and maximum fee
const decimals = 9;
const feeBasisPoints = 100; // 1%
const maxFee = BigInt(10_000 * Math.pow(10, decimals)); // 10,000 tokens

// Define the amount to be minted and the amount to be transferred, accounting for decimals
const mintAmount = BigInt(10_000_000_000 * Math.pow(10, decimals)); // Mint 10,000,000,000 tokens
const transferAmount = BigInt(10_000_000_000 * Math.pow(10, decimals)); // Transfer 10,000,000,000 tokens

// Calculate the fee for the transfer
const calcFee = (transferAmount * BigInt(feeBasisPoints)) / BigInt(10_000); // expect 10 fee
const fee = calcFee > maxFee ? maxFee : calcFee; // expect 9 fee
// Helper function to generate Explorer URL
function generateExplorerTxUrl(txId: string) {
  return `https://explorer.solana.com/tx/${txId}?cluster=devnet`;
}

async function main() {
  // Step 1 - Deposit SOL to Payer

  // Step 2 - Create a New Token
  const mintLamports = await connection.getMinimumBalanceForRentExemption(mintLen + metadataLen);

  const setExtraMetadataInstructions: (typeof TransactionInstruction)[] = [];

  for (const attributes of Object.entries(tokenAdditionalMetadata || [])) {
    setExtraMetadataInstructions.push(
      createUpdateFieldInstruction({
        updateAuthority: mintAuthority.publicKey,
        metadata: mint,
        field: attributes[0],
        value: attributes[1],
        programId: TOKEN_2022_PROGRAM_ID,
      }),
    );
  }

  const mintTransaction = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mint,
      space: mintLen,
      lamports: mintLamports,
      programId: TOKEN_2022_PROGRAM_ID,
    }),
    createInitializeMetadataPointerInstruction(
      mint,
      payer.publicKey,
      mint, // Metadata account - points to itself
      TOKEN_2022_PROGRAM_ID,
    ),
    createInitializeTransferFeeConfigInstruction(
      mint,
      transferFeeConfigAuthority.publicKey,
      withdrawWithheldAuthority.publicKey,
      feeBasisPoints,
      maxFee,
      TOKEN_2022_PROGRAM_ID,
    ),
    createInitializeMintInstruction(
      mint,
      decimals,
      mintAuthority.publicKey,
      mintAuthority.publicKey,
      TOKEN_2022_PROGRAM_ID,
    ),
    createInitializeInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      mint: mint,
      metadata: mint,
      name: metadata.name,
      symbol: metadata.symbol,
      uri: metadata.uri,
      mintAuthority: mintAuthority.publicKey,
      updateAuthority: mintAuthority.publicKey,
    }),
    ...setExtraMetadataInstructions,
  );
  const newTokenTx = await sendAndConfirmTransaction(
    connection,
    mintTransaction,
    [payer, mintKeypair, mintAuthority],
    undefined,
  );
  console.log('New Token Created:', generateExplorerTxUrl(newTokenTx));

  // Step 3 - Mint tokens to Owner
  const owner = Keypair.fromSecretKey(bs.decode(process.env.OWNER));
  if (!owner) {
    throw new Error('OWNER not found');
  }
  const sourceAccount = await createAssociatedTokenAccountIdempotent(
    connection,
    payer,
    mint,
    owner.publicKey,
    {},
    TOKEN_2022_PROGRAM_ID,
  );
  const mintSig = await mintTo(
    connection,
    payer,
    mint,
    sourceAccount,
    mintAuthority,
    mintAmount,
    [],
    undefined,
    TOKEN_2022_PROGRAM_ID,
  );
  console.log('Tokens Minted:', generateExplorerTxUrl(mintSig));
}
// Execute the main function
main();
