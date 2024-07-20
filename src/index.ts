import { clusterApiUrl, Keypair, Connection } from '@solana/web3.js';
import { uploadOffChainMetadata } from './helpers';
import createTokenWithEmbeddedMetadata from './create-token';
import bs from 'bs58';
import dotenv from 'dotenv';
dotenv.config();

if (!process.env.PAYER) {
  throw new Error('PAYER keypairs not found, please insert your private key to env file');
}

const connection = new Connection(clusterApiUrl('devnet'), 'finalized');
const payer = Keypair.fromSecretKey(bs.decode(process.env.PAYER));
if (!payer) {
  throw new Error('PAYER not found');
}
console.log('Payer address:', payer.publicKey.toBase58());
console.log('Payer Account Balance:', await connection.getBalance(payer.publicKey));

const imagePath = 'src/trump.png';
const metadataPath = 'src/temp.json';
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

await createTokenWithEmbeddedMetadata({
  payer,
  connection,
  tokenName,
  tokenSymbol,
  tokenUri,
  tokenAdditionalMetadata,
});
