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

app.use(cors());
app.use(express.json());

// Routes will be added here
import authRoutes from './routes/auth.js';
import interviewRoutes from './routes/interviews.js';

app.use('/api/auth', authRoutes);
app.use('/api/interviews', interviewRoutes);

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
