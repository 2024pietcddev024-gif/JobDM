import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
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

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

export default app;
