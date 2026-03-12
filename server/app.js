require('dotenv').config();
const requiredEnv = [
  "JWT_SECRET",
  "HMAC_SECRET",
  "EMAIL_USER",
  "EMAIL_PASS",
  "FRONTEND_URL",
  "DB_HOST",
  "DB_USER",
  "DB_PASSWORD",
  "DB_NAME"
];

requiredEnv.forEach((key) => {
  if (!process.env[key]) {
    console.error(`❌ Missing environment variable: ${key}`);
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

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(morgan('dev'));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

// Test route
app.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT 1');
    res.json({ message: 'VaultZero Backend Running', db: 'Connected' });
  } catch (error) {
    logger.error(error, 'Database connection check failed');
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// Health monitoring
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

const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

const userRoutes = require('./routes/userRoutes');
app.use('/api/user', userRoutes);

const vaultRoutes = require('./routes/vaultRoutes');
app.use('/api/vault', vaultRoutes);

const onboardingRoutes = require('./routes/onboardingRoutes');
app.use("/api/onboarding", onboardingRoutes);

const PORT = process.env.PORT || 9000;


const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  startTriggerEngine();
});


server.on('error', (err) => {
  logger.error(err, "Server error");
});

// Graceful shutdown
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