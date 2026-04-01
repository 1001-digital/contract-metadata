# Contract Metadata

Human-readable context for smart contracts.

Contract Metadata is a JSON standard that layers human-readable context on top of onchain data. It enriches smart contracts at every level -- contract descriptions, function titles and warnings, semantic type annotations, input guidance, and event/error enrichment -- giving wallets, explorers, and dApps the information they need to present contract interactions in terms users understand.

**[Read the full specification](./eip-draft.md)**

## Quick Example

```json
{
  "$schema": "https://1001-digital.github.io/contract-metadata/v1/schema.json",
  "chainId": 1,
  "address": "0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb",
  "contract": {
    "name": "CryptoPunks",
    "shortDescription": "10,000 unique collectible pixel art characters on Ethereum.",
    "category": "nft"
  },
  "functions": {
    "offerPunkForSaleToAddress": {
      "title": "List Punk for Sale (Private)",
      "description": "List a punk for sale to a specific address only.",
      "params": {
        "punkIndex": { "label": "Punk", "type": "token-id" },
        "minSalePriceInWei": { "label": "Price", "type": "eth" },
        "toAddress": { "label": "Buyer", "type": "address" }
      }
    }
  }
}
```

## Repository Structure

```
contracts/       Example metadata files for deployed contracts
schema/          JSON Schema definitions and shared interfaces
validate.js      Schema + semantic validation script
eip-draft.md     Full EIP specification
```

## Validation

```bash
npm install
npm run validate
```

## Contributing

1. Create a file in `contracts/` named `{lowercase-address}.json`
2. Follow the schema at `schema/contract-metadata.schema.json`
3. Include at minimum: `$schema`, `chainId`, `address`, and `contract.name`
4. Run `npm run validate` to check your file

## Authors

- YGG ([@yougogirldoteth](https://github.com/yougogirldoteth))
- Jalil Sebastian Wahdatehagh ([@jwahdatehagh](https://github.com/jwahdatehagh))
