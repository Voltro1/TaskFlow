import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { authRouter } from './routes/auth.routes.js';
import { projectsRouter } from './routes/projects.routes.js';
import { tasksRouter } from './routes/tasks.routes.js';
import { adminRouter } from './routes/admin.routes.js';
import { usersRouter } from './routes/users.routes.js';
import { teamsRouter } from './routes/teams.routes.js';
import { errorHandler, notFound } from './middleware/error-handler.js';

export const app = express();
app.disable('x-powered-by');
if (env.trustProxy > 0) app.set('trust proxy', env.trustProxy);
app.use(helmet());
app.use(cors({ origin(origin, callback) { if (!origin || env.corsOrigins.includes(origin)) return callback(null, true); callback(new Error('Origin is not allowed by CORS')); }, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev', { stream: { write: (message) => logger.http(message.trim()) } }));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 500, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false
}));

app.get('/health', (_req, res) => res.status(200).json({ success: true, data: { status: 'ok' } }));
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/teams', teamsRouter);
app.use('/api/projects', projectsRouter);
app.use('/api', tasksRouter);
app.use('/api/admin', adminRouter);
app.use(notFound);
app.use(errorHandler);
