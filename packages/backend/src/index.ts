import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config';
import authRoutes from './routes/auth';
import itemRoutes from './routes/items';
import containerRoutes from './routes/containers';
import locationRoutes from './routes/locations';
import categoryRoutes from './routes/categories';
import placementRoutes from './routes/placements';
import activityRoutes from './routes/activity';
import statsRoutes from './routes/stats';
import uploadRoutes from './routes/uploads';
import pricingRoutes from './routes/pricing';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ── Static files (photos, QR codes) ─────────────────────
// Serves DATA_PATH/images/* at /api/files/images/*
// Serves DATA_PATH/qrcodes/* at /api/files/qrcodes/*
app.use('/api/files', express.static(path.resolve(config.dataPath)));

// ── Health check (no auth required) ──────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── API Routes ───────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/containers', containerRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/placements', placementRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api', uploadRoutes);
app.use('/api', pricingRoutes);

// ── 404 handler ──────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Global error handler ─────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: config.nodeEnv === 'production' ? 'Internal server error' : err.message,
  });
});

app.listen(config.port, () => {
  console.log(`Stash backend running on port ${config.port}`);
});
