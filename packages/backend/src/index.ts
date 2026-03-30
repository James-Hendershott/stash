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
import syncRoutes from './routes/sync';
import container3dRoutes from './routes/container3d';
import exportRoutes from './routes/exports';
import importRoutes from './routes/imports';
import floorplanRoutes from './routes/floorplan';
import userRoutes from './routes/users';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ── Static files (photos, QR codes) ─────────────────────
// Serves DATA_PATH/images/* at /api/files/images/*
// Serves DATA_PATH/qrcodes/* at /api/files/qrcodes/*
app.use('/api/files', express.static(path.resolve(config.dataPath)));

// ── Public static files (3D viewer, etc.) ────────────────
app.use('/api/public', express.static(path.join(__dirname, '..', 'public')));

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
app.use('/api/sync', syncRoutes);
app.use('/api/containers', container3dRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/import', importRoutes);
app.use('/api/floorplan', floorplanRoutes);
app.use('/api/users', userRoutes);

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
