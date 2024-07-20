const {
  Keypair,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} = require('@solana/web3.js');
import { CreateTokenInputs } from './helpers.js';
const {
  createInitializeInstruction,
  createUpdateFieldInstruction,
  pack,
  TokenMetadata,
} = require('@solana/spl-token-metadata');
const {
  createInitializeMetadataPointerInstruction,
  createInitializeTransferFeeConfigInstruction,
  createInitializeMintInstruction,
  ExtensionType,
  getMintLen,
  LENGTH_SIZE,
  TOKEN_2022_PROGRAM_ID,
  TYPE_SIZE,
  // getAssociatedTokenAddress,
  // createAssociatedTokenAccountInstruction,
  // createMintToCheckedInstruction,
  // createSetAuthorityInstruction,
  // AuthorityType
} = require('@solana/spl-token');
import { addKeypairToEnvFile } from '@solana-developers/node-helpers';
const bs = require('bs58');

export default async function createTokenWithEmbeddedMetadata(inputs: CreateTokenInputs) {
  const { payer, connection, tokenName, tokenSymbol, tokenUri, tokenAdditionalMetadata } = inputs;

  // 0. Setup Mint

  // Authority that can mint new tokens
  // const mintAuthority = Keypair.fromSecretKey(bs.decode(process.env.MINT_AUTHORITY));
  const mintAuthority = Keypair.generate();
  console.log('Mint Authority address:', mintAuthority.publicKey.toBase58());
  await addKeypairToEnvFile(mintAuthority, 'MINT_AUTHORITY');

  // Mint account, tokens come from here
  // const mintKeypair = Keypair.fromSecretKey(bs.decode(process.env.MINT_KEYPAIR));
  const mintKeypair = Keypair.generate();
  console.log('Mint address:', mintKeypair.publicKey.toBase58());
  await addKeypairToEnvFile(mintKeypair, 'MINT_KEYPAIR');
  const mint = mintKeypair.publicKey;

  // const transferFeeConfigAuthority = Keypair.fromSecretKey(bs.decode(process.env.TRANSFER_FEE_CONFIG_AUTHORITY));
  const transferFeeConfigAuthority = Keypair.generate();
  console.log('Transfer Fee Config Authority address:', transferFeeConfigAuthority.publicKey.toBase58());
  await addKeypairToEnvFile(transferFeeConfigAuthority, 'TRANSFER_FEE_CONFIG_AUTHORITY');

  // const withdrawWithheldAuthority = Keypair.fromSecretKey(bs.decode(process.env.WITHDRAW_WITHHELD_AUTHORITY));
  const withdrawWithheldAuthority = Keypair.generate();
  console.log('Withdraw Withheld Authority address:', withdrawWithheldAuthority.publicKey.toBase58());
  await addKeypairToEnvFile(withdrawWithheldAuthority, 'WITHDRAW_WITHHELD_AUTHORITY');

  const decimals = 9;
  const feeBasisPoints = 100;
  const maxFee = BigInt(10_000 * Math.pow(10, decimals));
  const totalSupply = BigInt(10_000_000_000 * Math.pow(10, decimals));

  // 1. Create the metadata object
  const metadata: typeof TokenMetadata = {
    mint: mint,
    name: tokenName,
    symbol: tokenSymbol,
    uri: tokenUri,
    additionalMetadata: Object.entries(tokenAdditionalMetadata || []).map(([key, value]) => [key, value]),
  };

  // 2. Allocate the mint
  const mintLen = getMintLen([ExtensionType.MetadataPointer, ExtensionType.TransferFeeConfig]);
  const metadataLen = TYPE_SIZE + LENGTH_SIZE + pack(metadata).length;
  const lamports = await connection.getMinimumBalanceForRentExemption(mintLen + metadataLen);

  const createMintAccountInstruction = SystemProgram.createAccount({
    fromPubkey: payer.publicKey,
    lamports,
    newAccountPubkey: mint,
    programId: TOKEN_2022_PROGRAM_ID,
    space: mintLen,
  });

  // 3. Initialize the metadata-pointer making sure that it points to the mint itself
  const initMetadataPointerInstruction = createInitializeMetadataPointerInstruction(
    mint,
    payer.publicKey,
    mint, // Metadata account - points to itself
    TOKEN_2022_PROGRAM_ID,
  );

  // 4. Initialize the transfer fee config
  const initializeTransferFeeConfig = createInitializeTransferFeeConfigInstruction(
    mint,
    transferFeeConfigAuthority.publicKey,
    withdrawWithheldAuthority.publicKey,
    feeBasisPoints,
    maxFee,
    TOKEN_2022_PROGRAM_ID,
  );

  // 5. Initialize the mint
  const initializeMintInstruction = createInitializeMintInstruction(
    mint,
    decimals,
    mintAuthority.publicKey,
    mintAuthority.publicKey,
    TOKEN_2022_PROGRAM_ID,
  );

  // 6. Initialize the metadata inside the mint (that will set name, symbol, and uri for the mint)\
  const initMetadataInstruction = createInitializeInstruction({
    programId: TOKEN_2022_PROGRAM_ID,
    mint: mint,
    metadata: mint,
    name: metadata.name,
    symbol: metadata.symbol,
    uri: metadata.uri,
    mintAuthority: mintAuthority.publicKey,
    updateAuthority: mintAuthority.publicKey,
  });

  // 7. Set the additional metadata in the mint
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

  // 8. Put all of that in one transaction and send it to the network.
  const transaction = new Transaction().add(
    createMintAccountInstruction,
    initMetadataPointerInstruction,
    initializeTransferFeeConfig,
    initializeMintInstruction,
    initMetadataInstruction,
    ...setExtraMetadataInstructions,
  );

  const transactionSignature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [payer, mintKeypair, mintAuthority],
    undefined,
  );
  // 9. fetch and print the token account, the mint account, an the metadata to make sure that it is working correctly
  console.log('Token created!', `https://solana.fm/tx/${transactionSignature}?cluster=devnet-solana`);
}
