# VaultZero

Zero-knowledge encrypted digital vault with dead-man switch system.

Encrypt secrets client-side with AES-256-GCM before they ever touch the server. Nobody — not even VaultZero — can read your data.

## Features

- **Client-Side AES-256 Encryption** — AES-256-GCM with PBKDF2 key derivation (100k iterations), all in-browser
- **Dead-Man Vault Release** — Automatically releases vaults after configurable inactivity (days/months/years)
- **Security Question Verification** — Required for onboarding and release vault recipient verification
- **Media Vault Support** — Encrypt and store files (images, video, audio, documents)
- **Terminal Interface** — Full CLI-style vault management in-browser
- **HMAC Integrity Validation** — Server-side HMAC-SHA256 tamper detection on every vault
- **Email Verification** — Secure account activation flow
- **Security Alerts** — Email notifications for login, vault creation, access, deletion, suspicious activity
- **Audit Log** — Every vault access and event is recorded
- **Guided Tour** — Interactive onboarding walkthrough

## Architecture

```
Browser (React) → REST API (Node/Express) → MySQL Database
       ↓
  Web Crypto API
  (AES-256-GCM, PBKDF2)
```

All encryption/decryption happens exclusively in the browser. The server stores only ciphertext and never has access to plaintext or passphrases.

## Tech Stack

| Layer      | Technology                                      |
|------------|-------------------------------------------------|
| Frontend   | React 19, Tailwind CSS 3, Framer Motion 12      |
| Backend    | Node.js, Express 5                               |
| Database   | MySQL 8                                          |
| Encryption | Web Crypto API (AES-256-GCM, PBKDF2)            |
| Auth       | JWT (1-day expiry), bcrypt (12 rounds)           |
| Logging    | Pino                                             |
| Email      | Nodemailer (Gmail SMTP)                          |

## Quick Start

### Prerequisites

- Node.js 20+
- MySQL 8+

### Setup

```bash
# 1. Clone repo
git clone https://github.com/yourusername/vaultzero.git
cd vaultzero

# 2. Create environment file
cp .env.example server/.env
# Edit server/.env with your values

# 3. Initialize database
mysql -u root -p < server/migrations/003_full_schema.sql

# 4. Start server
cd server
npm install
npm run dev

# 5. Start client (new terminal)
cd client
cp .env.example .env
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000).

### Docker

```bash
# Configure environment
cp .env.example server/.env  # Fill in your values

# Build and run
docker compose up --build
```

## Project Structure

```
server/
  app.js                   # Express entry point
  config/db.js             # MySQL pool
  controllers/             # Route handlers
  middleware/               # JWT auth middleware
  routes/                  # API route definitions
  utils/                   # Logger, mailer, trigger engine, geolocation
  migrations/              # SQL schema & migrations

client/
  src/
    pages/                 # React page components
    components/            # Reusable UI components
    utils/crypto.js        # Client-side encryption
    api/axios.js           # API client
```

## API Endpoints

| Method | Path                             | Auth | Description                  |
|--------|----------------------------------|------|------------------------------|
| POST   | /api/auth/register               | No   | Register new account         |
| POST   | /api/auth/login                  | No   | Sign in                      |
| GET    | /api/auth/verify-email           | No   | Verify email token           |
| POST   | /api/auth/resend-verification    | No   | Resend verification email    |
| GET    | /api/user/profile                | Yes  | Get user profile             |
| GET    | /api/user/activity               | Yes  | Get activity log             |
| PUT    | /api/user/change-password        | Yes  | Change password              |
| DELETE | /api/user/account                | Yes  | Delete account               |
| POST   | /api/vault/create                | Yes  | Create encrypted vault       |
| GET    | /api/vault/my-vaults             | Yes  | List user vaults             |
| POST   | /api/vault/open/:id              | Yes  | Open/decrypt vault           |
| DELETE | /api/vault/:id                   | Yes  | Delete vault                 |
| GET    | /api/vault/release/:token        | No   | Access released vault        |
| POST   | /api/vault/release/verify/:token | No   | Verify security question     |
| GET    | /health                          | No   | Health check                 |

## Deployment

| Component  | Recommended Service     |
|------------|------------------------|
| Frontend   | Cloudflare Pages       |
| Backend    | Render                 |
| Database   | PlanetScale            |

### Frontend (Cloudflare Pages)

```bash
cd client
npm run build
# Deploy the build/ folder to Cloudflare Pages
# Set REACT_APP_API_URL to your backend URL
```

### Backend (Render)

Deploy the `server/` directory as a Node.js service.

Set environment variables from `.env.example` in the Render dashboard.

### Database (PlanetScale)

Create a MySQL-compatible database and run:

```bash
mysql -h <host> -u <user> -p < server/migrations/003_full_schema.sql
```

## Environment Variables

See [.env.example](.env.example) for all required variables.

## License

Copyright (c) 2026 Apoorva Verma — All rights reserved. See [LICENSE](LICENSE).
