import process from 'node:process';
import { initializeSchema, closeDatabase } from '../src/config/database.js';
import { logger } from '../src/utils/logger.js';

try {
    await initializeSchema();
    logger.info('Database schema initialized successfully.');
} catch (error) {
    logger.error('Failed to initialize database', { error: error?.message });
    process.exitCode = 1;
} finally {
    await closeDatabase();
}
