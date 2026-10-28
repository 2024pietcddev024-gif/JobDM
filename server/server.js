import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { validateJwtSecret } from './config/jwt.js';

// Enforce environment validation on application startup
validateJwtSecret();

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

app.use(cors({
  origin: (origin, callback) => {
    // In local development or testing, or when origin is missing (server-to-server / curl), allow all
    if (!origin || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    // In production, validate against allowed domains and loopback origins
    const allowed = ['http://localhost:5173', 'http://127.0.0.1:5173'];
    if (allowed.includes(origin) || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true
}));
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

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date() });
});

// Global JSON error handler to ensure clean JSON responses on unhandled errors (never HTML error pages)
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Error]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, HOST, () => {
    console.log(`Server listening on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  });
}

export default app;
