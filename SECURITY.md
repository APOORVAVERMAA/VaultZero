# Security Policy — VaultZero

## Architecture

VaultZero follows a **zero-knowledge** architecture. All encryption and decryption happens exclusively in the browser using the Web Crypto API. The server never has access to plaintext vault contents or user passphrases.

## Encryption

| Property           | Value                                       |
|--------------------|---------------------------------------------|
| Algorithm          | AES-256-GCM                                 |
| Key Derivation     | PBKDF2 with 100,000 iterations              |
| Hash Function      | SHA-256                                     |
| IV                 | 12 bytes, cryptographically random per vault|
| Salt               | 16 bytes, cryptographically random per vault|
| Integrity          | HMAC-SHA256 (server-side tamper detection)   |
| Comparison         | Timing-safe (crypto.timingSafeEqual)         |

## Authentication

- Passwords hashed with **bcrypt** (12 salt rounds)
- JWT tokens with 1-day expiry
- Email verification required before login
- Security questions use bcrypt-hashed answers

## Server Security

- **Helmet** for HTTP security headers
- **CORS** restricted to configured frontend origin
- **Rate limiting** (100 requests/15 min global, 5/15 min login, 10/15 min release verification)
- `x-powered-by` disabled
- `trust proxy` enabled for accurate IP logging behind reverse proxies
- Structured logging via Pino (no sensitive data logged)

## Data Protection

- Release tokens stored as SHA-256 hashes (raw tokens never persisted)
- Vaults use `LONGTEXT` for encrypted blobs (supports large media files)
- Soft-delete model — vaults marked as `deleted`, not physically removed
- Destroy-type vaults are set to `destroyed` on first read
- Release token access limited to 3 failed attempts before lockout

## Reporting Vulnerabilities

If you discover a security issue, **do not open a public issue**. Instead, email the maintainers directly. Include steps to reproduce and any relevant details.

## Scope

This security policy covers the VaultZero application code. Third-party dependencies are monitored via `npm audit`.
