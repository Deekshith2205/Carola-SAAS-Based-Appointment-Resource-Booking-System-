import app from './app';
import { env } from './config/env';
import { disconnectPrisma, prisma } from './prisma/client';
import { initJobs } from './jobs/reminder.job';

async function startServer(): Promise<void> {
  await prisma.$connect();
  
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
