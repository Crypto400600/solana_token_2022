import { clusterApiUrl, Keypair, Connection } from '@solana/web3.js';
import { uploadOffChainMetadata } from './helpers';
import createTokenWithEmbeddedMetadata from './create-token';
import dotenv from 'dotenv';
dotenv.config();

const connection = new Connection(clusterApiUrl('devnet'), 'finalized');
const payer = Keypair.fromSecretKey(
  new Uint8Array([72,71,99,86,1,142,215,243,102,219,177,174,135,207,60,97,121,192,95,190,160,116,213,240,153,162,99,16,104,196,136,195,21,111,139,2,70,230,0,177,35,115,117,159,222,253,56,179,179,225,209,170,3,23,10,14,20,190,206,162,165,172,194,62])
);
if (!payer) { throw new Error('PAYER not found') }
console.log('Payer address:', payer.publicKey.toBase58());

const imagePath = 'src/cat.png';
const metadataPath = 'src/temp.json';
const tokenName = 'Cat NFT';
const tokenDescription = 'This is a cat';
const tokenSymbol = 'EMB';
const tokenExternalUrl = 'https://solana.com/';
const tokenAdditionalMetadata = {
  species: 'Cat',
  breed: 'Cool',
}

const tokenUri = await uploadOffChainMetadata({
  tokenName,
  tokenDescription,
  tokenSymbol,
  imagePath,
  metadataPath,
  tokenExternalUrl,
  tokenAdditionalMetadata,
}, payer);

console.log('Token URI:', tokenUri);

await createTokenWithEmbeddedMetadata({
  payer,
  connection,
  tokenName,
  tokenSymbol,
  tokenUri,
  tokenAdditionalMetadata,
});