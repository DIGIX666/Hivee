import express, { Application } from 'express';
import cors from 'cors';
import { logger } from './utils/logger';
import config from './config';
import agentRoutes from './routes/agent.routes';
import taskRoutes from './routes/task.routes';
import { errorHandler } from './middleware/errorHandler';
import { prisma } from './services/prisma.service';

const app: Application = express();

// CORS Configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'agent-upload-service',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/agents', agentRoutes);
app.use('/api/tasks', taskRoutes);

// Error handling
app.use(errorHandler);

// Start server
const PORT = config.server.port;

const server = app.listen(PORT, () => {
  logger.info(`🚀 Agent Upload Service running on port ${PORT}`);
  logger.info(`📝 Environment: ${config.server.nodeEnv}`);
  logger.info(`🔗 API URL: ${config.server.apiUrl}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');

  server.close(async () => {
    logger.info('HTTP server closed');

    // Disconnect Prisma
    await prisma.$disconnect();
    logger.info('Database connection closed');

    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');

  server.close(async () => {
    logger.info('HTTP server closed');

    // Disconnect Prisma
    await prisma.$disconnect();
    logger.info('Database connection closed');

    process.exit(0);
  });
});

export default app;
