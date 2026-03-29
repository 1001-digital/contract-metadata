# SHA-256 Content Prover

Verifies that an offchain file matches a SHA-256 hash stored onchain.

## How it works

1. Reads the onchain hash from the function return value
2. Fetches the source file (e.g. from GitHub) in the user's browser
3. Computes the SHA-256 digest using the Web Crypto API
4. Compares the computed hash against the onchain value
5. Displays a verification badge (Verified / Mismatch / Unavailable)

## Props

| Prop | Type | Description |
|------|------|-------------|
| `sourceUrl` | `string` | URL to fetch the raw file bytes from |
| `sourcePageUrl` | `string` | Human-readable link to the file (e.g. GitHub blob URL) |
| `explanationUrl` | `string` | Optional link explaining why this hash matters |
| `contentLabel` | `string` | Label for the content being verified (e.g. "Canonical image file") |

## Used by

- **CryptoPunks** (`imageHash` function) — verifies the composite image containing all 10,000 punks matches the onchain SHA-256 fingerprint
