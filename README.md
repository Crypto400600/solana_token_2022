# To Get Started

### Usage

1. `npm install` or yarn
2. Write code in `index.js`
3. `npm run start`

### Helpers

1. initializeKeypair:
   1. takes a connection obj
   1. takes optional filePath, if you provide the keypair file path like
      `~/.config/solana/id.json` which is the default keypair for Solana CLI it
      will take the keypair from there and consider them as payer
   1. if not it will generate a new keypair and store them in the .env to use
      them in the future with any other transaction
   1. it will airdrop SOL for the payer account if need
1. uploadOffChainMetadata:
   1. take metadata inputs like name, symbol, description, and image
   1. uploads them to an off-chain storage provide
   1. return a URI that points to that metadata JSON
