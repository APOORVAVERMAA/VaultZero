require('dotenv').config();

const configuredEmailProvider = (process.env.EMAIL_PROVIDER || "").toLowerCase().trim();
const emailProvider = configuredEmailProvider || (process.env.RESEND_API_KEY ? "resend" : "smtp");

const baseRequiredEnv = [
  "JWT_SECRET",
  "HMAC_SECRET",
  "FRONTEND_URL",
  "DATABASE_URL"
];

const providerRequiredEnv = emailProvider === "resend"
  ? ["RESEND_API_KEY", "EMAIL_FROM"]
  : ["EMAIL_USER", "EMAIL_PASS"];

const requiredEnv = [...baseRequiredEnv, ...providerRequiredEnv];

requiredEnv.forEach((key) => {
  if (!process.env[key]) {
    // logger is not initialized yet at this stage.
    console.error(`Missing environment variable: ${key}`);
    process.exit(1);
  }
});

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const db = require('./config/db');
const startTriggerEngine = require('./utils/triggerEngine');
const logger = require('./utils/logger');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

logger.info("STARTING SERVER...");

const normalizeOrigins = (value) =>
  String(value || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const allowedOrigins = [
  ...normalizeOrigins(process.env.CORS_ALLOWED_ORIGINS),
  process.env.FRONTEND_URL,
  ...(process.env.NODE_ENV !== "production" ? ["http://localhost:3000", "http://127.0.0.1:3000"] : []),
].filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin) {
    return true;
  }

  if (allowedOrigins.includes(origin)) {
    return true;
  }

  if (process.env.NODE_ENV === "production" && /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) {
    return true;
  }

  return false;
};

const corsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }

    return callback(null, false);
  },
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
};

// ================= ✅ FINAL CORS (GLOBAL + CLEAN) =================
app.use(cors(corsOptions));


// ================= MIDDLEWARE =================
app.use(helmet());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));
app.use(morgan('dev'));


// ================= RATE LIMIT =================
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);


// ================= TEST ROUTE =================
app.get('/', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ message: 'VaultZero Backend Running', db: 'Connected' });
  } catch (error) {
    logger.error(error, 'Database connection check failed');
    res.status(500).json({ error: 'Database connection failed' });
  }
});


// ================= HEALTH =================
app.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      database: 'connected'
    });
  } catch {
    res.status(503).json({
      status: 'error',
      uptime: process.uptime(),
      database: 'disconnected'
    });
  }
});


// ================= ROUTES =================
// ================= Initialize email transport in background (non-blocking) =================
const { verifyEmailTransport } = require('./utils/emailTransport');
const shouldVerifyEmailTransportOnStart = emailProvider === "resend" || process.env.EMAIL_VERIFY_ON_START === "true";
if (shouldVerifyEmailTransportOnStart) {
  setImmediate(() => {
    verifyEmailTransport().catch(err => {
      logger.warn({ err }, "Background email transport verification failed - emails may be slower");
    });
  });
}

const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

const onboardingRoutes = require('./routes/onboardingRoutes');
app.use("/api/onboarding", onboardingRoutes);

const userRoutes = require('./routes/userRoutes');
app.use('/api/user', userRoutes);

const vaultRoutes = require('./routes/vaultRoutes');
app.use('/api/vault', vaultRoutes);

app.use((err, req, res, next) => {
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Payload too large. Maximum request size is 15MB.' });
  }

  logger.error(err, 'Unhandled application error');
  res.status(err?.status || 500).json({
    message: err?.status && err.status < 500 ? err.message : 'Server error'
  });
});

// ================= SERVER =================
const PORT = process.env.PORT || 9000;

const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  startTriggerEngine();
});

server.on('error', (err) => {
  logger.error(err, "Server error");
});


// ================= GRACEFUL SHUTDOWN =================
const shutdown = (signal) => {
  logger.info(`${signal} received. Shutting down gracefully...`);
  server.close(() => {
    logger.info('Server closed.');
    process.exit(0);
  });
  setTimeout(() => {
    logger.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));