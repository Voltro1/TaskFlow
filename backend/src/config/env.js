import 'dotenv/config';

const required = ['MYSQL_HOST', 'MYSQL_USER', 'MYSQL_PASSWORD', 'MYSQL_DATABASE', 'JWT_SECRET'];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

if (process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must contain at least 32 characters');
}

const port = Number(process.env.PORT || 4000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be a valid TCP port');

const nodeEnv = process.env.NODE_ENV || 'development';
const mysqlPort = Number(process.env.MYSQL_PORT || 3306);
if (!Number.isInteger(mysqlPort) || mysqlPort < 1 || mysqlPort > 65535) throw new Error('MYSQL_PORT must be a valid TCP port');
const mysqlConnectionLimit = Number(process.env.MYSQL_CONNECTION_LIMIT || 10);
if (!Number.isInteger(mysqlConnectionLimit) || mysqlConnectionLimit < 1 || mysqlConnectionLimit > 100) {
  throw new Error('MYSQL_CONNECTION_LIMIT must be between 1 and 100');
}
const corsOrigins = (process.env.CORS_ORIGIN || '').split(',').map((origin) => origin.trim()).filter(Boolean);
if (nodeEnv === 'production' && corsOrigins.length === 0) throw new Error('CORS_ORIGIN is required in production');
if (corsOrigins.includes('*')) throw new Error('CORS_ORIGIN cannot use wildcard origins when credentials are enabled');

export const env = {
  nodeEnv,
  port,
  mysql: {
    host: process.env.MYSQL_HOST,
    port: mysqlPort,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    connectionLimit: mysqlConnectionLimit,
    timezone: process.env.MYSQL_TIMEZONE || 'Z'
  },
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  corsOrigins,
  trustProxy: Number(process.env.TRUST_PROXY || 0),
  logLevel: process.env.LOG_LEVEL || 'info'
};
