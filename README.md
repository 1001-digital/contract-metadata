# Contract Metadata

Human-readable context for smart contracts.

## The Problem

Smart contracts expose two layers of machine-readable information: the **ABI** (what functions exist and their Solidity types) and **NatSpec** (embedded source code documentation). Neither is structured to help end users understand the full scope of smart contract interactions.

When someone encounters a contract in a wallet, explorer, or dApp, they see raw function signatures like `offerPunkForSaleToAddress(uint256, uint256, address)` with no context about what happens when they call it, what the risks are, or what the parameters actually mean in human terms. A `uint256` could represent an ETH amount, a timestamp, a token ID, or a percentage in basis points. The ABI doesn't say which.

NatSpec provides basic descriptions (including user-facing `@notice` text), but it's flat text embedded in source code. It can't express semantic types, input guidance, or contract-level context, and is unavailable for unverified contracts.

## The Solution

Contract Metadata is a JSON standard that layers human-readable context on top of onchain data. It enriches smart contracts at every level:

- **Contract context:** title, description, origin story, category, tags, links, risks, audits
- **Function enrichment:** human-readable titles, descriptions, warnings, parameter labels, grouped by domain
- **Semantic type annotations:** what a `uint256` actually represents (ETH amount, timestamp, NFT ID, basis points)
- **Input guidance:** how parameters should be collected. input validation like min max for numeric inputs, date, datetime, limited selects, sliders, etc.
- **Event and error enrichment:** the same annotations applied to events and custom errors

## Schema Overview

A metadata file describes a single deployed contract:

```json
{
  "$schema": "https://1001-digital.github.io/contract-metadata/v1/schema.json",
  "chainId": 1,
  "address": "0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb",
  "contract": { ... },
  "groups": { ... },
  "functions": { ... },
  "events": { ... },
  "errors": { ... }
}
```

### Top-Level Fields

| Field       | Type     | Description                                                              |
| ----------- | -------- | ------------------------------------------------------------------------ |
| `$schema`   | `string` | URI pointing to the contract-metadata JSON Schema                        |
| `chainId`   | `number` | The chain ID of the network where the contract is deployed               |
| `address`   | `string` | The contract address (lowercase)                                         |
| `includes`  | `array`  | Interface identifiers to include (e.g. `["erc721"]`)                     |
| `meta`      | `object` | Document housekeeping (authors, version, lastUpdated, locale, signature) |
| `contract`  | `object` | Contract-level context (title, description, about, links, etc.)          |
| `groups`    | `object` | Named groups for organizing functions                                    |
| `functions` | `object` | Per-function metadata, keyed by name, signature, or 4-byte selector      |
| `events`    | `object` | Per-event metadata, keyed by name, signature, or 32-byte topic hash      |
| `errors`    | `object` | Per-error metadata, keyed by name, signature, or 4-byte selector         |
| `messages`  | `object` | EIP-712 typed message metadata, keyed by primary type name               |

### Contract Object

Provides context about the contract itself. The fields `name`, `symbol`, `description`, `image`, `banner_image`, `featured_image`, `external_link`, and `collaborators` are compatible with [ERC-7572](https://eips.ethereum.org/EIPS/eip-7572). The `theme` color model is inspired by [ENSIP-18](https://docs.ens.domains/ensip/18):

```json
{
  "contract": {
    "name": "CryptoPunks",
    "symbol": "PUNK",
    "shortDescription": "10,000 unique collectible pixel art characters on Ethereum.",
    "description": "One of the earliest NFT projects, predating the ERC-721 standard...",
    "image": "ipfs://QmTNgv3jx2HHfBjQX9RnKtxj2xv2xQDtbDXoRi5rJ3a46",
    "external_link": "https://cryptopunks.app",
    "origin": "Deployed June 2017 by Larva Labs.",
    "category": "nft",
    "tags": ["nft", "collectible", "pfp"],
    "links": [{ "label": "Website", "url": "https://..." }],
    "risks": ["No upgradeability. Bugs are permanent"],
    "audits": [
      { "auditor": "Trail of Bits", "url": "https://...", "date": "2023-01-15" }
    ],
    "about": [
      {
        "heading": "10,000 unique collectible characters",
        "body": "CryptoPunks extend the collecting impulse into the digital realm..."
      }
    ],
    "theme": {
      "background": "#000000",
      "text": "#ffffff",
      "accent": "#ff04b4",
      "accentText": "#ffffff",
      "border": "#333333"
    }
  }
}
```

### Function Keys

Functions, events, and errors are keyed by one of three formats:

| Format            | When to use                  | Example                                             |
| ----------------- | ---------------------------- | --------------------------------------------------- |
| `name`            | No overloads, verified ABI   | `"transfer"`                                        |
| `name(type,type)` | Overloaded functions         | `"safeTransferFrom(address,address,uint256,bytes)"` |
| `0xabcdef12`      | Unverified contract / no ABI | `"0xa9059cbb"`                                      |

**Bare name** is the default for verified contracts without overloaded functions. When a contract has multiple functions with the same name but different parameter types (overloads), use the full Solidity-style signature to disambiguate. For unverified contracts where no ABI is available, use the 4-byte function selector (the first 4 bytes of `keccak256(signature)`).

The same formats apply to events and errors. For events, the selector is the full 32-byte topic hash (`0x` + 64 hex chars). For errors, it's the 4-byte selector like functions.

Consumers should match by name first, then fall back to signature or selector lookup.

### Function Metadata

Metadata enriches parameters with labels, descriptions, and semantic type annotations:

```json
{
  "functions": {
    "offerPunkForSaleToAddress": {
      "title": "List Punk for Sale (Private)",
      "description": "List a punk for sale to a specific address only, at a minimum price.",
      "group": "marketplace",
      "warning": "This creates a binding offer. The buyer can purchase at any time.",
      "params": {
        "punkIndex": {
          "label": "Punk",
          "description": "The punk ID to list (0-9999)",
          "type": "token-id",
          "validation": { "min": "0", "max": "9999" }
        },
        "minSalePriceInWei": {
          "label": "Price",
          "type": "eth"
        },
        "toAddress": {
          "label": "Buyer",
          "description": "Only this address can buy the punk",
          "type": "address"
        }
      },
      "related": ["offerPunkForSale", "buyPunk"]
    }
  }
}
```

Functions also support `"featured": true` to highlight primary actions (e.g. the main mint or swap function) and `"hidden": true` to suppress internal or admin-only functions from the default UI.

### Types

The `type` field is a semantic annotation that tells consumers what a value _represents_. A `uint256` in the ABI carries no meaning beyond "256-bit unsigned integer." Types bridge that gap — consumers use them to render appropriate UI for both display (read) and input (write) contexts.

**String values:**

| Type           | Meaning                                                           |
| -------------- | ----------------------------------------------------------------- |
| `eth`          | Value in wei, represents an ETH amount                            |
| `gwei`         | Value in gwei                                                     |
| `timestamp`    | Unix timestamp (display: formatted date, input: date picker)      |
| `address`      | Ethereum address (with ENS resolution)                            |
| `boolean`      | Boolean value                                                     |
| `blocknumber`  | Block number                                                      |
| `duration`     | Duration in seconds                                               |
| `bytes32-utf8` | bytes32 encoding a UTF-8 string                                   |
| `token-id`     | Token ID / NFT identifier                                         |
| `percentage`   | Percentage value (0-100)                                          |
| `basis-points` | Value in basis points (1/100th of a percent)                      |
| `token-amount` | Token amount (display: formatted balance, input: with max button) |
| `date`         | Date value                                                        |
| `datetime`     | Date and time value                                               |
| `hidden`       | Not shown to the user; value is auto-populated (see `autofill`)   |

**Object values** for types that need configuration:

```jsonc
// Address with options
{ "type": "address", "ens": true, "addressBook": true }

// Token amount for a specific token
{ "type": "token-amount", "tokenAddress": "0x..." }

// Token ID for a specific NFT collection
{ "type": "token-id", "tokenAddress": "0x..." }

// Enum — display: show label, input: render as select dropdown
{ "type": "enum", "values": { "0": "Pending", "1": "Active" } }

// Slider — input: render as range slider
{ "type": "slider", "min": "0", "max": "9999", "step": "1" }
```

### Autofill

The `autofill` field specifies a source to pre-populate an input with. It is separate from `type` — one describes the value, the other controls the default.

**String values** for well-known sources:

| Value               | Meaning                          |
| ------------------- | -------------------------------- |
| `connected-address` | User's connected wallet address  |
| `contract-address`  | This contract's address          |
| `zero-address`      | The zero address (`0x000...000`) |
| `block-timestamp`   | Current block timestamp          |

**Object value** for literal constants:

```json
{ "type": "constant", "value": "86400" }
```

A parameter can combine `type` and `autofill`. For example, an address field that defaults to the connected wallet:

```json
"from": {
  "label": "from",
  "type": "address",
  "autofill": "connected-address"
}
```

### Groups

Functions are organized into named groups with explicit ordering:

```json
{
  "groups": {
    "marketplace": { "label": "Marketplace", "order": 1 },
    "bidding": { "label": "Bidding", "order": 2 },
    "ownership": { "label": "Ownership", "order": 3 }
  }
}
```

### Intent Templates

Functions can include an `intent` template. This is a human-readable sentence rendered with formatted parameter values:

```json
{
  "functions": {
    "composite": {
      "title": "Composite",
      "intent": "Composite Check #{tokenId} with #{burnId}",
      "params": {
        "tokenId": {
          "label": "Keep Token ID",
          "preview": {
            "image": "eip155:1/erc721:0x036721e5a769cc48b3189efbb9cce4471e8a48b1/{tokenId}"
          }
        },
        "burnId": {
          "label": "Burn Token ID",
          "preview": { "image": "ipfs://Qme/{burnId}" }
        }
      }
    }
  }
}
```

After the user fills in parameters, the intent renders as: **"Composite Check #4200 with #8000"**. Placeholders use `{paramName}` syntax. Prefix with `#` to prepend a hash symbol (e.g. `#{tokenId}` renders as `#4200`). Values are formatted using their `type` before insertion.

### Parameter Previews

Parameters can include a `preview` object to show a visual preview as the user fills in values. The `image` field specifies a URI template that resolves to an image for the current parameter value:

```json
"preview": { "image": "eip155:1/erc721:0x036721e5a769cc48b3189efbb9cce4471e8a48b1/{tokenId}" }
```

URI templates use `{paramName}` interpolation — the same syntax as intent templates. Supported URI formats:

| Format                                                                                 | Example                                    | Use case                                         |
| -------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------ |
| [CAIP-19](https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-19.md) asset URI | `eip155:1/erc721:0x036.../{tokenId}`       | ERC-721 NFT image resolved via token metadata    |
| [CAIP-29](https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-29.md) asset URI | `eip155:1/erc1155:0x28959.../{tokenId}`    | ERC-1155 token image resolved via token metadata |
| IPFS URI                                                                               | `ipfs://Qme/{tokenId}`                     | Off-chain image stored on IPFS                   |
| HTTPS URI                                                                              | `https://example.com/images/{tokenId}.png` | Conventional hosted image                        |

Consumers resolve CAIP-19 and CAIP-29 URIs by fetching the token's metadata (e.g. via `tokenURI` or `uri`) and extracting the image. IPFS and HTTPS URIs resolve directly to the image content.

### Interface Includes

Common interface metadata (ERC-20, ERC-721, etc.) can be defined once and included by contract files:

```json
{
  "includes": ["interface:erc721", "https://example.com/metadata.json"],
  "$schema": "https://1001-digital.github.io/contract-metadata/v1/schema.json",
  "chainId": 1,
  "address": "0x036721e5a769cc48b3189efbb9cce4471e8a48b1",
  "contract": { "title": "Checks Originals", ... },
  "groups": {
    "minting": { "label": "Minting", "order": 1 },
    "compositing": { "label": "Compositing", "order": 2 }
  },
  "functions": {
    "mint": { ... },
    "composite": { ... }
  }
}
```

Includes support two formats:

- **`interface:` prefix** — references a named interface file in the `interfaces/` subdirectory relative to the `$schema` URL (e.g. `"interface:erc721"` resolves to `interfaces/erc721.json` next to the schema file). These files contain only `groups`, `functions`, and `events`.
- **URL** — fetches the metadata file from the given URL. The resolved file can live anywhere and follows the same structure.

Multiple includes merge left-to-right. Contract-specific metadata is then applied on top.

**Merge semantics:** The merge is _shallow per top-level key within each section_. When a contract defines a function that also exists in an included interface, the contract's entire function object replaces the interface's. There is no deep merge of `params`, `returns`, or other nested fields. This means if you override a function, you must re-declare everything you want to keep (params, returns, types, etc.).

```
# Merge order for includes: ["erc20", "erc721"]
1. Start with empty {}
2. Merge erc20.json    → { functions: { transfer: {from erc20}, approve: {from erc20} } }
3. Merge erc721.json   → { functions: { transfer: {from erc721}, approve: {from erc721}, ownerOf: {from erc721} } }
4. Merge contract file  → { functions: { transfer: {from contract}, approve: {from erc721}, ownerOf: {from erc721}, mint: {from contract} } }
```

Available interfaces: `erc20`, `erc721`.

### EIP-712 Message Metadata

Off-chain signing flows (Permit, Seaport orders, etc.) can be described with the `messages` object:

```json
{
  "messages": {
    "Permit": {
      "title": "Token Permit",
      "description": "Approve a spender to transfer your tokens without a separate approve transaction.",
      "warning": "This grants token spending permission. Verify the spender address carefully.",
      "intent": "Permit {spender} to spend {value} of your tokens until {deadline}",
      "fields": {
        "owner": { "label": "owner", "type": "address" },
        "spender": { "label": "spender", "type": "address" },
        "value": { "label": "amount", "type": "eth" },
        "nonce": { "label": "nonce" },
        "deadline": { "label": "deadline", "type": "timestamp" }
      }
    }
  }
}
```

Messages are keyed by EIP-712 primary type name and defined on the contract that verifies them. Each message supports the same enrichment as functions: `title`, `description`, `warning`, `intent`, and `fields` with the same `ParamMeta` (label, description, type).

### Extensions

Publishers can use custom extension objects anywhere in a metadata file. Extension names must start with an `_` character followed by a letter. Consumers that do not understand a given extension must ignore it.

```json
{
  "functions": {
    "colors": {
      "title": "Check Colors",
      "description": "Get the colors of a given Check.",
      "params": {
        "tokenId": { "label": "Check", "type": "token-id" }
      },
      "_checks_colors": {
        "about": "https://github.com/1001-digital/checks-colors",
        "src": "@1001-digital/checks-colors",
        "columns": "8"
      }
    }
  }
}
```

This example uses a `_checks_colors` extension to attach a custom color visualization component to a function. The extension is namespaced to avoid collisions and includes an `about` URL so a human reading the file can understand what it's for.

Extensions can appear at any level — on the top-level object, on a function, on a parameter, etc. No standard keys will ever begin with `_`, so the namespace is reserved for extensions.

**Naming rules:**

- The extension name must begin with `_` followed by a letter (e.g. `_myapp`, `_checks_colors`)
- Extension names and their member keys must not contain `.` characters
- Name extensions after a company, product, or feature to make their purpose clear

## Relationship to Existing Standards

### ABI (Application Binary Interface)

Contract Metadata references ABI function, event, and error names as keys. It does not replace the ABI. It enriches it with context the ABI cannot express.

### NatSpec

NatSpec lives in Solidity source code and targets developers reading the implementation. Contract Metadata targets end users and frontends. They are complementary. NatSpec documents _how_ a function works internally. Contract Metadata documents _what_ it means to a user.

### EIP-7730 (Structured Data Clear Signing)

EIP-7730 makes transaction signing prompts human-readable. Contract Metadata addresses the broader problem: making the entire contract interface understandable _before_ a user constructs a transaction. The two standards are complementary. EIP-7730 answers "what am I signing?" while Contract Metadata answers "what is this contract and what do its functions do?"

## File Structure

```
contracts/
  0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb.json   # CryptoPunks
  0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2.json   # WETH9
  0x036721e5a769cc48b3189efbb9cce4471e8a48b1.json   # Checks Originals
  0x59e16fccd424cc24e280be16e11bcd56bc0ce547.json   # ENS ETH Registrar Controller
schema/
  contract-metadata.schema.json                      # Contract file schema
  interface.schema.json                              # Interface file schema
  interfaces/
    erc20.json                                       # Shared ERC-20 metadata
    erc721.json                                      # Shared ERC-721 metadata
validate.js                                          # Schema + semantic validation script
```

Each contract file is named by its lowercase address. The `chainId` and `address` fields inside make it self-contained and portable. Interface files provide reusable metadata via the `includes` mechanism.

## Validation

Install dependencies and run the validation script:

```bash
npm install
npm run validate
```

This validates all contract files against `schema/contract-metadata.schema.json` and all interface files against `schema/interface.schema.json`. It also runs semantic checks (group references, related function references, filename-address matching).

You can validate selectively:

```bash
npm run validate:contracts    # Contract files only
npm run validate:interfaces   # Interface files only
```

## Contributing

To add metadata for a contract:

1. Create a new file in `contracts/` named `{lowercase-address}.json`
2. Follow the schema at `schema/contract-metadata.schema.json`
3. Include at minimum: `$schema`, `chainId`, `address`, and `contract.name`
4. Add function metadata for the most important user-facing functions first
5. Run `npm run validate` to check your file against the schema

## Open Issues

- [ ] EIP proposal for onchain ENS based metadata resolution (metadata URL stored as ENS text record)
- [ ] CI checks (GitHub Actions for validation on PR)
- [ ] Localization support (multiple locales per contract)
