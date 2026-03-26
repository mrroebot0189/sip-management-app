import { Sequelize } from 'sequelize';
import { Options } from 'sequelize';
import { isLikelyTransientSqlError, retry } from '../utils/retry';

const isProduction = process.env.NODE_ENV === 'production';

// Azure SQL connection via environment variables
// Set these in Azure App Service Application Settings
const dbConfig: Options = {
  dialect: 'mssql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '1433'),
  database: process.env.DB_NAME || 'WorkProgrammeDB',
  username: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  logging: isProduction ? false : console.log,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  dialectOptions: {
    options: {
      encrypt: isProduction, // Required for Azure SQL
      trustServerCertificate: !isProduction,
      enableArithAbort: true,
      connectTimeout: 30000,
      requestTimeout: 30000,
    },
  },
};

const sequelize = new Sequelize(dbConfig);

const classifyConnectionError = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error);

  if (/deadlock/i.test(message)) return 'deadlock';
  if (/timeout|timed out|ETIMEOUT/i.test(message)) return 'timeout';
  if (/login failed|ELOGIN|authentication failed|Access denied/i.test(message)) return 'login_failed';

  return 'connection_error';
};

export const connectDatabase = async (): Promise<void> => {
  const attempts = parseInt(process.env.DB_CONNECT_RETRIES || '5', 10);
  const initialDelayMs = parseInt(process.env.DB_CONNECT_RETRY_DELAY_MS || '1000', 10);
  const maxDelayMs = parseInt(process.env.DB_CONNECT_RETRY_MAX_DELAY_MS || '10000', 10);

  try {
    await retry(
      async () => {
        await sequelize.authenticate();
      },
      {
        attempts,
        initialDelayMs,
        maxDelayMs,
        backoffMultiplier: 2,
        jitterRatio: 0.2,
        shouldRetry: isLikelyTransientSqlError,
        onRetry: ({ attempt, delayMs, error }) => {
          console.warn(
            `[DB] Connection attempt ${attempt} failed. Retrying in ${delayMs}ms...`,
            (error as { message?: string })?.message || error
          );
        },
      }
    );

    console.log('[DB] Connection to Azure SQL established successfully.');
  } catch (error) {
    console.error('[DB] Unable to connect to the database after retries:', error);
    console.error('[DB] Unable to connect to the database:', {
      category: classifyConnectionError(error),
      message: error instanceof Error ? error.message : String(error),
      raw: error,
    });
    throw error;
  }
};

export default sequelize;
