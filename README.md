# To Get Started

### Usage

1. `npm install` or yarn
2. please check metadata details in app.ts.
3. creat .env file and insert public and private keys
    
    PAYER="PAYER_WALLET_PRIVATE_KEY"
    OWNER="OWNER_WALLET_PRIVATE_KEY"
    FEE_RECIPIENT_WALLET="TAX_MANAGER_PUBLIC_KEY"

4. `npm run start` it will mint token -> owner wallet
5. `npm run withdraw-fee` it will withdraw fee -> tax manager wallet
6. before adding liquidity, please run `npm run disable-freeze` to stop mint token after launched