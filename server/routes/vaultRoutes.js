const express = require('express');
const router = express.Router();
const vaultController = require('../controllers/vaultController');
const authMiddleware = require('../middleware/authMiddleware');
const rateLimit = require("express-rate-limit");

/* ===========================
   🔐 Release Verification Rate Limiter
   Protects against brute force attempts
=========================== */

const releaseLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // max 10 attempts per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many verification attempts. Try again later." }
});

/* ===========================
   🔒 AUTHENTICATED VAULT ROUTES
=========================== */

// Create Vault
router.post('/create', authMiddleware, vaultController.createVault);

// Get User Vaults
router.get('/my-vaults', authMiddleware, vaultController.getMyVaults);

// Open Vault
router.post('/open/:id', authMiddleware, vaultController.openVault);

// Soft Delete Vault
router.delete('/:id', authMiddleware, vaultController.deleteVault);


/* ===========================
   🌍 PUBLIC RELEASE ROUTES
   (NO AUTH REQUIRED)
=========================== */

// 1️⃣ Load release page / check token
router.get(
  '/release/:token',
  vaultController.accessReleaseVault
);

// 2️⃣ Verify security question (Protected with rate limit)
router.post(
  '/release/verify/:token',
  releaseLimiter,
  vaultController.verifyReleaseAnswer
);

module.exports = router;