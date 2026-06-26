import app from './app';
import { env } from './config/env';
import { disconnectPrisma, prisma } from './prisma/client';
import { initJobs } from './jobs/reminder.job';

async function startServer(): Promise<void> {
  const MAX_RETRIES = 5;
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      await prisma.$connect();
      console.log('Successfully connected to the database.');
      break;
    } catch (error) {
      console.error(`Database connection failed (attempt ${i + 1}/${MAX_RETRIES}).`);
      if (i === MAX_RETRIES - 1) {
        throw error;
      }
      await new Promise(res => setTimeout(res, 2000 * (i + 1))); // Exponential backoff
    }
  }
  
  // Initialize background jobs (e.g., appointment reminders)
  initJobs();

  const server = app.listen(env.PORT, () => {
    console.log(`Server running on port ${env.PORT} (${env.NODE_ENV})`);
  });

  const shutdown = async (signal: string) => {
    console.log(`${signal} received. Shutting down gracefully...`);
    server.close(async () => {
      await disconnectPrisma();
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
