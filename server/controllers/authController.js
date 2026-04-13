const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const logger = require('../utils/logger');
const { sendVerificationEmail } = require('../utils/mailer');
const { sendLoginAlert } = require('../utils/securityAlerts');
const { getLocation } = require('../utils/geolocate');

// Registration controller
exports.register = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'Full name, email and password required' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Password strength policy
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      return res.status(400).json({
        message: "Password must contain at least 8 characters, one uppercase letter, and one number."
      });
    }

    // Check if user exists
    const { rows: existing } = await db.query(
      'SELECT id, email_verified FROM users WHERE email = $1',
      [email]
    );

    if (existing.length > 0) {
      if (!existing[0].email_verified) {
        // Re-send verification for unverified accounts
        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await db.query(
          'UPDATE users SET verification_token = $1, verification_token_expires = $2 WHERE id = $3',
          [token, expires, existing[0].id]
        );
        const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
        const location = await getLocation(req.ip);
        await sendVerificationEmail(email, fullName, verificationLink, { ip: req.ip, location, time: new Date() });
        return res.status(200).json({ message: 'Verification email resent. Check your inbox.', requiresVerification: true });
      }
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Insert user with verification token
    await db.query(
      'INSERT INTO users (full_name, email, password_hash, terms_accepted, onboarding_completed, email_verified, verification_token, verification_token_expires) VALUES ($1, $2, $3, FALSE, FALSE, FALSE, $4, $5)',
      [fullName, email, hashedPassword, verificationToken, tokenExpires]
    );

    // Send verification email
    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    const location = await getLocation(req.ip);
    await sendVerificationEmail(email, fullName, verificationLink, { ip: req.ip, location, time: new Date() });

    res.status(201).json({ message: 'Verification email sent. Check your inbox.', requiresVerification: true });

  } catch (error) {
    logger.error(error, "Registration error");
    res.status(500).json({ message: 'Server error' });
  }
};

// Email verification
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ message: 'Verification token required.' });
    }

    const { rows: users } = await db.query(
      'SELECT id, email_verified, verification_token_expires FROM users WHERE verification_token = $1',
      [token]
    );

    if (users.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired verification link.' });
    }

    const user = users[0];

    if (user.email_verified) {
      return res.status(200).json({ message: 'Email already verified.', alreadyVerified: true });
    }

    if (new Date() > new Date(user.verification_token_expires)) {
      return res.status(400).json({ message: 'Verification link has expired. Please register again.' });
    }

    await db.query(
      'UPDATE users SET email_verified = TRUE, verification_token = NULL, verification_token_expires = NULL WHERE id = $1',
      [user.id]
    );

    res.json({ message: 'Email verified successfully. You can now sign in.' });

  } catch (error) {
    logger.error(error, "Email verification error");
    res.status(500).json({ message: 'Server error' });
  }
};

// Resend verification
exports.resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email required.' });
    }

    const { rows: users } = await db.query('SELECT id, full_name, email_verified FROM users WHERE email = $1', [email]);

    if (users.length === 0) {
      return res.status(200).json({ message: 'If the email exists, a verification link has been sent.' });
    }

    if (users[0].email_verified) {
      return res.status(400).json({ message: 'Email is already verified.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.query(
      'UPDATE users SET verification_token = $1, verification_token_expires = $2 WHERE id = $3',
      [token, expires, users[0].id]
    );

    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    const location = await getLocation(req.ip);
    await sendVerificationEmail(email, users[0].full_name, verificationLink, { ip: req.ip, location, time: new Date() });

    res.json({ message: 'Verification email sent. Check your inbox.' });

  } catch (error) {
    logger.error(error, "Resend verification error");
    res.status(500).json({ message: 'Server error' });
  }
};
//login controller
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const { rows: users } = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (users.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const user = users[0];

    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check email verification
    if (!user.email_verified) {
      return res.status(403).json({ message: 'Please verify your email before signing in.', requiresVerification: true, email: user.email });
    }

    // Update last login
    await db.query(
      "UPDATE users SET last_login = NOW() WHERE id = $1",
      [user.id]
    );

    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Send login alert email (fire-and-forget)
    const loginIp = req.ip;
    const loginUA = req.headers['user-agent'] || 'Unknown device';
    const loginTime = new Date();
    getLocation(loginIp).then(location => {
      sendLoginAlert(user.email, loginIp, loginUA, loginTime, location);
    }).catch((err) => {
      logger.error(err, 'Login alert email failed');
    });

    res.json({
      token,
      termsAccepted: user.terms_accepted,
      onboardingCompleted: user.onboarding_completed,
      fullName: user.full_name
    });

  } catch (error) {
    logger.error(error, 'Login error');
    res.status(500).json({ message: 'Server error' });
  }
};