const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const logger = require('../utils/logger');
const { sendVerificationEmail } = require('../utils/mailer');
const { sendLoginAlert } = require('../utils/securityAlerts');
const { getLocation } = require('../utils/geolocate');


// ================= REGISTER =================
exports.register = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    console.log("REGISTER HIT", req.body);

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'Full name, email and password required' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      return res.status(400).json({
        message: "Password must contain at least 8 characters, one uppercase letter, and one number."
      });
    }

    const { rows: existing } = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.query(
      `INSERT INTO users 
      (full_name, email, password_hash, terms_accepted, onboarding_completed, email_verified, verification_token, verification_token_expires) 
      VALUES ($1, $2, $3, FALSE, FALSE, FALSE, $4, $5)`,
      [fullName, email, hashedPassword, verificationToken, tokenExpires]
    );

    // ✅ NON-BLOCKING EMAIL
    (async () => {
      try {
        const ip = req.headers['x-forwarded-for'] || req.ip;
        let location = "Unknown";

        try {
          location = await getLocation(ip);
        } catch {
          location = "Unavailable";
        }

        const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

        await sendVerificationEmail(email, fullName, verificationLink, {
          ip,
          location,
          time: new Date()
        });

      } catch (err) {
        logger.error(err, "Email send failed");
      }
    })();

    res.status(201).json({
      message: 'Verification email sent. Check your inbox.',
      requiresVerification: true
    });

  } catch (error) {
    console.error("REGISTER ERROR:", error);
    logger.error(error, "Registration error");
    res.status(500).json({ message: error.message });
  }
};


// ================= VERIFY EMAIL =================
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
      return res.status(200).json({ message: 'Email already verified.' });
    }

    if (new Date() > new Date(user.verification_token_expires)) {
      return res.status(400).json({ message: 'Verification link expired.' });
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


// ================= RESEND VERIFICATION =================
exports.resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email required.' });
    }

    const { rows: users } = await db.query(
      'SELECT id, full_name, email_verified FROM users WHERE email = $1',
      [email]
    );

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

    // ✅ NON-BLOCKING EMAIL
    (async () => {
      try {
        const ip = req.headers['x-forwarded-for'] || req.ip;
        let location = "Unknown";

        try {
          location = await getLocation(ip);
        } catch {
          location = "Unavailable";
        }

        const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
        console.log("Sending verification email to:", email);

        await sendVerificationEmail(
          email,
          users[0].full_name,
          verificationLink,
          {
            ip,
            location,
            time: new Date()
          }
        );

      } catch (err) {
        logger.error(err, "Resend verification email failed");
      }
    })();

    res.json({ message: 'Verification email sent. Check your inbox.' });

  } catch (error) {
    logger.error(error, "Resend verification error");
    res.status(500).json({ message: 'Server error' });
  }
};


// ================= LOGIN =================
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

    if (!user.email_verified) {
      return res.status(403).json({
        message: 'Please verify your email before signing in.',
        requiresVerification: true,
        email: user.email
      });
    }

    await db.query(
      "UPDATE users SET last_login = NOW() WHERE id = $1",
      [user.id]
    );

    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // ✅ NON-BLOCKING LOGIN ALERT
    (async () => {
      try {
        const ip = req.headers['x-forwarded-for'] || req.ip;
        const ua = req.headers['user-agent'] || 'Unknown device';

        let location = "Unknown";
        try {
          location = await getLocation(ip);
        } catch {
          location = "Unavailable";
        }

        await sendLoginAlert(user.email, ip, ua, new Date(), location);

      } catch (err) {
        logger.error(err, 'Login alert failed');
      }
    })();

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