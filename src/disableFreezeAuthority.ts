const {
  sendAndConfirmTransaction,
  Connection,
  Keypair,
  clusterApiUrl,
  Transaction,
} = require('@solana/web3.js');

const {
  TOKEN_2022_PROGRAM_ID,
  createSetAuthorityInstruction,
  AuthorityType,
} = require('@solana/spl-token');
import bs from 'bs58';
import dotenv from 'dotenv';
dotenv.config();

// Initialize connection to local Solana node
const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

if(!process.env.PAYER || !process.env.MINT_KEYPAIR || !process.env.MINT_AUTHORITY) {
  throw new Error('PAYER or MINT_KEYPAIR or MINT_AUTHORITY not found');
}

const payer = Keypair.fromSecretKey(bs.decode(process.env.PAYER));
if (!payer) {
  throw new Error('PAYER not found');
}
console.log('Payer address:', payer.publicKey.toBase58());
console.log('Payer Account Balance:', await connection.getBalance(payer.publicKey));

const mint = Keypair.fromSecretKey(new Uint8Array(JSON.parse(process.env.MINT_KEYPAIR)));
const mintAuthority = Keypair.fromSecretKey(new Uint8Array(JSON.parse(process.env.MINT_AUTHORITY)));
const freezeAuthority = mintAuthority;

const transaction = new Transaction().add(
  createSetAuthorityInstruction(
    mint.publicKey,
    freezeAuthority.publicKey,
    AuthorityType.FreezeAccount,
    null,
    [],
    TOKEN_2022_PROGRAM_ID,
  )
);

const signature = await sendAndConfirmTransaction(connection, transaction, [payer, mint, freezeAuthority]);

console.log("Signature:", `https://explorer.solana.com/tx/${signature}?cluster=devnet`);