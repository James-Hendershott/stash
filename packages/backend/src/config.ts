import path from 'path';

export const config = {
  port: parseInt(process.env.BACKEND_PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  dataPath: process.env.DATA_PATH || './data',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  backendUrl: process.env.BACKEND_URL || 'http://localhost:3001',

  get imagesPath() {
    return path.join(this.dataPath, 'images');
  },
  get qrCodesPath() {
    return path.join(this.dataPath, 'qrcodes');
  },
  get exportsPath() {
    return path.join(this.dataPath, 'exports');
  },
  get floorPlansPath() {
    return path.join(this.dataPath, 'floorplans');
  },
};
