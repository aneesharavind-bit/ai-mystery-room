import dotenv from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import mysteryRoutes from './routes/mysteries.js';

dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../.env') });

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '20kb' }));
app.get('/api/health', (_req, res) => res.json({ ok: true, database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' }));
app.use('/api/mysteries', mysteryRoutes);
app.use((error, _req, res, _next) => {
  console.error(error);
  const message = error.message?.includes('GEMINI_API_KEY') || error.message?.includes('generated') || error.message?.includes('incomplete') ? error.message : 'Something went wrong. Please try again.';
  res.status(500).json({ error: message });
});

const port = Number(process.env.PORT || 5000);
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => app.listen(port, () => console.log(`Mystery Room API listening on ${port}`)))
    .catch((error) => { console.error('Could not connect to MongoDB:', error.message); process.exit(1); });
} else {
  console.error('MONGODB_URI is required. Copy server/.env.example to server/.env and configure it.');
  process.exit(1);
}
