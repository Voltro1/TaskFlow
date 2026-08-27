import { app } from './app.js';
import { closeDatabase, connectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

async function start() {
  await connectDatabase();
  const server = app.listen(env.port, () => logger.info(`TaskFlow API listening on port ${env.port}`));
  server.on('error', (error) => { logger.error('HTTP server error', { error: error.message }); process.exit(1); });
  let shuttingDown = false;
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`${signal} received; closing HTTP server`);
    const forceExit = setTimeout(() => process.exit(1), 10_000);
    forceExit.unref();
    server.close(async () => { await closeDatabase(); logger.info('TaskFlow API shut down cleanly'); process.exit(0); });
  };
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
}

process.on('unhandledRejection', (error) => { logger.error('Unhandled rejection', { error: error?.message, stack: error?.stack }); process.exit(1); });
process.on('uncaughtException', (error) => { logger.error('Uncaught exception', { error: error.message, stack: error.stack }); process.exit(1); });
start().catch((error) => { logger.error('Failed to start API', { error: error.message, stack: error.stack }); process.exit(1); });
