import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { validateJwtSecret } from './config/jwt.js';

// Enforce environment validation on application startup (avoid hard process.exit in serverless environments)
validateJwtSecret({ exitOnError: !process.env.VERCEL });

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

// Enterprise Security Headers
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(cors({
  origin: (origin, callback) => {
    // In local development or testing, or when origin is missing (server-to-server / curl), allow all
    if (!origin || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    // In production, validate against allowed domains, Vercel deployments, and loopback origins
    const allowed = ['http://localhost:5173', 'http://127.0.0.1:5173', process.env.FRONTEND_URL].filter(Boolean);
    const isVercel = origin && (origin.endsWith('.vercel.app') || origin.includes('vercel.app'));
    if (allowed.includes(origin) || isVercel || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true
}));

// Ensure compatibility with Vercel serverless function rewrites where /api may be stripped
app.use((req, res, next) => {
  if (req.url && !req.url.startsWith('/api') && !req.url.startsWith('/health')) {
    req.url = '/api' + req.url;
  }
  next();
});

app.use(express.json({ limit: '10mb' }));

// Routes will be added here
import authRoutes from './routes/auth.js';
import interviewRoutes from './routes/interviews.js';
import codeRoutes from './routes/code.js';
import aptitudeRoutes from './routes/aptitude.js';
import campusRoutes from './routes/campus.js';
import campusRegistrarRoutes from './routes/campusRegistrar.js';
import campusAdminRoutes from './routes/campusAdmin.js';
import campusAdminAnalyticsRoutes from './routes/campusAdminAnalytics.js';
import campusTutorRoutes from './routes/campusTutor.js';
import campusTutorAnalyticsRoutes from './routes/campusTutorAnalytics.js';
import campusHRRoutes from './routes/campusHR.js';
import privacyRoutes from './routes/privacy.js';
import { authRateLimiter, codeExecutionRateLimiter } from './middleware/rateLimiter.js';
import db from './db.js';

// Apply targeted rate limiters to prevent brute-force and resource exhaustion
app.use('/api/auth/login', authRateLimiter);
app.use('/api/auth/register', authRateLimiter);
app.use('/api/code/run', codeExecutionRateLimiter);
app.use('/api/code/submit', codeExecutionRateLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/code', codeRoutes);
app.use('/api/aptitude', aptitudeRoutes);
app.use('/api/campus/registrar', campusRegistrarRoutes);
app.use('/api/campus/admin', campusAdminRoutes);
app.use('/api/campus/admin/analytics', campusAdminAnalyticsRoutes);
app.use('/api/campus/tutor', campusTutorRoutes);
app.use('/api/campus/tutor/analytics', campusTutorAnalyticsRoutes);
app.use('/api/campus/hr', campusHRRoutes);
app.use('/api/campus', campusRoutes);
app.use('/api/privacy', privacyRoutes);

app.get('/api/health', async (req, res) => {
  let dbStatus = 'unconfigured';
  if (db.pool) {
    try {
      await db.query('SELECT 1');
      dbStatus = 'healthy';
    } catch (e) {
      dbStatus = `unreachable: ${e.message}`;
    }
  }

  res.json({
    status: dbStatus === 'healthy' ? 'healthy' : 'degraded',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    services: {
      api: 'healthy',
      database: dbStatus,
      piston: process.env.PISTON_URL || process.env.PISTON_API_URL || 'http://localhost:2000/api/v2'
    }
  });
});

// Global JSON error handler to ensure clean JSON responses on unhandled errors (never HTML error pages)
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Error]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// Serve production SPA frontend if compiled dist directory exists on disk (Docker / Standalone node)
const distPath = path.resolve(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  // Express 5 compatible catch-all for SPA client-side routing
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.url.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Standalone server execution (Docker, Railway, VPS, Local Dev)
// In Vercel serverless environments, Vercel directly invokes the exported app.
if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  app.listen(PORT, HOST, () => {
    console.log(`[JobDM] Server listening on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  });
}

export default app;
