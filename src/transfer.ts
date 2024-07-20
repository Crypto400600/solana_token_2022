require('dotenv').config();
import { getExplorerLink, getKeypairFromEnvironment } from '@solana-developers/helpers';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { TOKEN_2022_PROGRAM_ID, getOrCreateAssociatedTokenAccount, transfer } from '@solana/spl-token';
const connection = new Connection(clusterApiUrl("devnet"), "confirmed")

const sender = getKeypairFromEnvironment('FEE_RECIPIENT');

console.log(`🔑 Loaded our keypair securely, using an env file! Our public key is: ${sender.publicKey.toBase58()}`);

const recipient = new PublicKey('4LBkpbvkbRbhNBRX3rghZdAQCGjCVXskHv9UZpbZztPT'); // Test3 wallet

const tokenMintAccount = new PublicKey('AxxuhS34xciCoyCeHRbAfHqQNMsjrw15BJNuDemH5c5C');

const MINOR_UNITS_PER_MAJOR_UNITS = Math.pow(10, 9);

console.log(`💸 Attempting to send 1000 token to ${recipient.toBase58()}...`);

const sourceTokenAccount = await getOrCreateAssociatedTokenAccount(
  connection,
  sender,
  tokenMintAccount,
  sender.publicKey,
);

const destinationTokenAccount = await getOrCreateAssociatedTokenAccount(
  connection,
  sender,
  tokenMintAccount,
  recipient,
);

const signature = await transfer(
  connection,
  sender,
  sourceTokenAccount.address,
  destinationTokenAccount.address,
  sender,
  1000 * MINOR_UNITS_PER_MAJOR_UNITS,
);

const explorerLink = getExplorerLink('transaction', signature, 'testnet');

console.log(`￼ Transaction confirmed, explorer link is: ${explorerLink}!`);
