# Contract Metadata

Human-readable context for smart contracts.

## The Problem

Smart contracts expose two layers of machine-readable information: the **ABI** (what functions exist and their Solidity types) and **NatSpec** (developer-facing documentation embedded in source code). Neither serves end users.

When someone encounters a contract in a wallet, explorer, or dApp, they see raw function signatures like `offerPunkForSaleToAddress(uint256, uint256, address)` with no context about what happens when they call it, what the risks are, or what the parameters actually mean in human terms. A `uint256` could represent an ETH amount, a timestamp, a token ID, or a percentage in basis points — the ABI doesn't say.

NatSpec helps developers reading source code, but it's not structured for frontends, doesn't cover presentation semantics, and is unavailable for unverified contracts.

## The Solution

Contract Metadata is a JSON standard that layers human-readable context on top of onchain data. It enriches smart contracts at every level:

- **Contract context** — title, description, origin story, category, tags, links, risks, audits
- **Function enrichment** — human-readable titles, descriptions, warnings, parameter labels, grouped by domain
- **Semantic type annotations** — what a `uint256` actually represents (ETH amount, timestamp, NFT ID, basis points)
- **Input guidance** — how parameters should be collected (ENS resolution, address book, dropdown, slider)
- **Event and error enrichment** — the same annotations applied to events and custom errors

Think of it as NatSpec for the frontend — or more precisely, a way to tell the story of a contract.

## Schema Overview

A metadata file describes a single deployed contract:

```json
{
  "schemaVersion": "1.0",
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

| Field | Type | Description |
|-------|------|-------------|
| `schemaVersion` | `string` | Schema version (currently `"1.0"`) |
| `chainId` | `number` | The chain ID of the network where the contract is deployed |
| `address` | `string` | The contract address (lowercase) |
| `includes` | `array` | Interface identifiers to include (e.g. `["erc721"]`) |
| `factory` | `object` | Factory binding (alternative to `address` for factory-deployed contracts) |
| `meta` | `object` | Document housekeeping (version, lastUpdated, locale, signature) |
| `contract` | `object` | Contract-level context (title, description, about, links, etc.) |
| `presentation` | `object` | Visual presentation hints (primaryColor, icon) |
| `groups` | `object` | Named groups for organizing functions |
| `functions` | `object` | Per-function metadata, keyed by ABI function name |
| `events` | `object` | Per-event metadata, keyed by ABI event name |
| `errors` | `object` | Per-error metadata, keyed by ABI error name |
| `messages` | `object` | EIP-712 typed message metadata, keyed by primary type name |
| `components` | `object` | Custom UI components for specialized rendering |

### Contract Object

Provides context about the contract itself:

```json
{
  "contract": {
    "title": "CryptoPunks",
    "shortDescription": "10,000 unique collectible pixel art characters on Ethereum.",
    "description": "One of the earliest NFT projects, predating the ERC-721 standard...",
    "origin": "Deployed June 2017 by Larva Labs.",
    "category": "nft",
    "tags": ["nft", "collectible", "pfp"],
    "links": [{ "label": "Website", "url": "https://..." }],
    "risks": ["No upgradeability — bugs are permanent"],
    "audits": [{ "auditor": "Trail of Bits", "url": "https://...", "date": "2023-01-15" }],
    "about": [
      {
        "heading": "10,000 unique collectible characters",
        "body": "CryptoPunks extend the collecting impulse into the digital realm..."
      }
    ]
  }
}
```

The `presentation` object is a **top-level sibling** of `contract`, not nested inside it:

```json
{
  "presentation": {
    "primaryColor": "#ff04b4",
    "icon": "https://..."
  }
}
```

### Function Metadata

Each function is keyed by its ABI name. Metadata enriches parameters with labels, descriptions, and semantic type annotations:

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
          "label": "punk index",
          "description": "The punk ID to list (0-9999)",
          "displayHint": "nft",
          "validation": { "min": "0", "max": "9999" }
        },
        "minSalePriceInWei": {
          "label": "minimum price",
          "displayHint": "eth"
        },
        "toAddress": {
          "label": "buyer",
          "description": "Only this address can buy the punk",
          "inputHint": "ens-resolve"
        }
      },
      "related": ["offerPunkForSale", "buyPunk"]
    }
  }
}
```

Functions also support `"featured": true` to highlight primary actions (e.g. the main mint or swap function) and `"hidden": true` to suppress internal or admin-only functions from the default UI.

### Display Hints

Display hints are semantic annotations that tell consumers what a value *represents*, not how to style it. A `uint256` in the ABI carries no meaning beyond "256-bit unsigned integer." Display hints bridge that gap:

| Hint | Meaning |
|------|---------|
| `eth` | Value in wei, represents an ETH amount |
| `gwei` | Value in gwei |
| `timestamp` | Unix timestamp |
| `address` | Ethereum address |
| `boolean` | Boolean value |
| `blocknumber` | Block number |
| `duration` | Duration in seconds |
| `bytes32-utf8` | bytes32 encoding a UTF-8 string |
| `nft` | Token ID / NFT identifier |
| `percentage` | Percentage value (0-100) |
| `{ type: "basis-points" }` | Value in basis points (1/100th of a percent) |
| `{ type: "token", tokenAddress: "0x..." }` | Token amount for a specific ERC-20 |
| `{ type: "enum", values: { "0": "Pending", "1": "Active" } }` | Numeric enum with labels |

### Input Hints

Input hints guide how a parameter should be collected from the user:

| Hint | Meaning |
|------|---------|
| `ens-resolve` | Accept ENS names, resolve to address |
| `address-book` | Show address book / recent addresses |
| `connected-address` | Auto-fill with connected wallet |
| `token-amount` | Token amount input with balance display |
| `slider` | Range slider |
| `dropdown` | Dropdown select |
| `hidden` | Hidden from user (auto-populated) |
| `timestamp` | Date/time picker for timestamp inputs |

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

Functions can include an `intent` template — a human-readable sentence rendered with formatted parameter values:

```json
{
  "functions": {
    "composite": {
      "title": "Composite",
      "intent": "Composite Check #{tokenId} with #{burnId}",
      "params": {
        "tokenId": { "label": "keep token ID", "displayHint": "nft" },
        "burnId": { "label": "burn token ID", "displayHint": "nft" }
      }
    }
  }
}
```

After the user fills in parameters, the intent renders as: **"Composite Check #4200 with #8000"**. Placeholders use `{paramName}` syntax. Prefix with `#` to prepend a hash symbol (e.g. `#{tokenId}` renders as `#4200`). Values are formatted using their `displayHint` before insertion.

### Interface Includes

Common interface metadata (ERC-20, ERC-721, etc.) can be defined once and included by contract files:

```json
{
  "includes": ["erc721"],
  "schemaVersion": "1.0",
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

Interface files live in `interfaces/` and contain only `groups`, `functions`, and `events` (validated by `schema/interface.schema.json`). Multiple includes merge left-to-right. Contract-specific metadata is then applied on top.

**Merge semantics:** The merge is *shallow per top-level key within each section*. When a contract defines a function that also exists in an included interface, the contract's entire function object replaces the interface's — there is no deep merge of `params`, `returns`, or other nested fields. This means if you override a function, you must re-declare everything you want to keep (params, returns, displayHints, etc.).

```
# Merge order for includes: ["erc20", "erc721"]
1. Start with empty {}
2. Merge erc20.json    → { functions: { transfer: {from erc20}, approve: {from erc20} } }
3. Merge erc721.json   → { functions: { transfer: {from erc721}, approve: {from erc721}, ownerOf: {from erc721} } }
4. Merge contract file  → { functions: { transfer: {from contract}, approve: {from erc721}, ownerOf: {from erc721}, mint: {from contract} } }
```

Available interfaces: `erc20`, `erc721`.

### Factory Contract Support

For contracts deployed by a factory (e.g. Uniswap pools, Gnosis Safes), use `factory` instead of `address`:

```json
{
  "schemaVersion": "1.0",
  "chainId": 1,
  "factory": {
    "address": "0x1f98431c8ad98523631ae4a59f267346ea31f984",
    "deployEvent": "PoolCreated(address token0, address token1, uint24 fee, int24 tickSpacing, address pool)"
  },
  "contract": {
    "title": "Uniswap V3 Pool",
    "description": "Concentrated liquidity AMM pool..."
  }
}
```

A metadata file has either `address` (specific deployment) or `factory` (all deployments from a factory), not both. Consumers match unknown contracts by checking the factory's logs for the deploy event.

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
        "owner": { "label": "owner", "displayHint": "address" },
        "spender": { "label": "spender", "displayHint": "address" },
        "value": { "label": "amount", "displayHint": "eth" },
        "nonce": { "label": "nonce" },
        "deadline": { "label": "deadline", "displayHint": "timestamp" }
      }
    }
  }
}
```

Messages are keyed by EIP-712 primary type name and defined on the contract that verifies them. Each message supports the same enrichment as functions: `title`, `description`, `warning`, `intent`, and `fields` with the same `ParamMeta` (label, description, displayHint).

### Custom Components

Metadata can reference custom UI components for specialized rendering. Components attach to two slots: `function-result` (renders below a function's output) and `overview` (renders on the contract overview page).

```json
{
  "components": {
    "sha256-content-prover": {
      "src": "components/sha256-content-prover",
      "slot": "function-result",
      "function": "imageHash",
      "props": {
        "sourceUrl": "https://raw.githubusercontent.com/larvalabs/cryptopunks/master/punks.png",
        "contentLabel": "Canonical image file"
      }
    }
  }
}
```

This example attaches a SHA-256 verification component to CryptoPunks' `imageHash` function. When a user reads the image hash onchain, the component fetches the canonical image, hashes it in the browser, and verifies the digest matches — proving the file hasn't been tampered with.

Components are keyed by name and receive standardized props:
- `value` — the function return value (for `function-result` slot)
- `address` — the contract address
- `chainId` — the chain ID
- Any additional `props` defined in the metadata

#### Component Security Model

Components execute in the user's browser and have access to network requests, so they are security-sensitive. All components undergo review before merging:

**Allowed:**
- Fetching from a fixed, auditable set of URLs declared in `props` (e.g. GitHub raw content, IPFS gateways)
- Using browser-native APIs (Web Crypto, Canvas) for local computation
- Reading the `value`, `address`, and `chainId` props passed by the host

**Not allowed:**
- Fetching from user-controlled or dynamically constructed URLs (tracking/SSRF vector)
- Accessing parent DOM, `window.opener`, or `postMessage` to the host
- Executing arbitrary code from fetched content (`eval`, `Function()`, dynamic `import()`)
- Storing data in `localStorage`, `IndexedDB`, or cookies
- Bundle size exceeding 50 KB gzipped (components should be lightweight)

**Review process:**
- All component PRs require review from a maintainer
- The `props.sourceUrl` and any other URL props must point to well-known, trusted origins
- Components should degrade gracefully (show an error state, not crash) when network requests fail

#### Contributing Components

1. Open a PR adding your component implementation
2. Reference it from the contract metadata JSON via the `components` field
3. Components are reviewed against the security model above
4. Approved components are merged and available to all consumers

## Relationship to Existing Standards

### ABI (Application Binary Interface)
Contract Metadata references ABI function, event, and error names as keys. It does not replace the ABI — it enriches it with context the ABI cannot express.

### NatSpec
NatSpec lives in Solidity source code and targets developers reading the implementation. Contract Metadata targets end users and frontends. They are complementary — NatSpec documents *how* a function works internally, Contract Metadata documents *what* it means to a user.

### EIP-7730 (Structured Data Clear Signing)
EIP-7730 makes transaction signing prompts human-readable. Contract Metadata addresses the broader problem: making the entire contract interface understandable *before* a user constructs a transaction. The two standards are complementary — EIP-7730 answers "what am I signing?" while Contract Metadata answers "what is this contract and what do its functions do?"

## File Structure

```
contracts/
  0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb.json   # CryptoPunks
  0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2.json   # WETH9
  0x036721e5a769cc48b3189efbb9cce4471e8a48b1.json   # Checks Originals
  0x59e16fccd424cc24e280be16e11bcd56bc0ce547.json   # ENS ETH Registrar Controller
interfaces/
  erc20.json                                         # Shared ERC-20 metadata
  erc721.json                                        # Shared ERC-721 metadata
schema/
  contract-metadata.schema.json                      # Contract file schema
  interface.schema.json                              # Interface file schema
components/
  sha256-content-prover/                             # SHA-256 content verification component
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
3. Include at minimum: `schemaVersion`, `chainId`, `address`, and `contract.title`
4. Add function metadata for the most important user-facing functions first
5. Run `npm run validate` to check your file against the schema

## Roadmap

- [ ] EIP proposal for onchain metadata resolution
- [ ] ENS-based resolution (metadata URL stored as ENS text record)
- [ ] Registry contract for onchain metadata registration
- [ ] CI checks (GitHub Actions for validation on PR)
- [ ] Localization support (multiple locales per contract)
