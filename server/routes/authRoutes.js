const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Try again later.' }
});

router.post('/register', authController.register);
router.post('/login', loginLimiter, authController.login);
router.get('/verify-email', authController.verifyEmail);
router.post('/resend-verification', authController.resendVerification);

module.exports = router;