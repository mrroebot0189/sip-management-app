import { Request, Response, NextFunction } from 'express';
import {
  ValidationError,
  DatabaseError,
  ConnectionError,
  ConnectionTimedOutError,
  TimeoutError,
} from 'sequelize';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

const getSqlErrorDetails = (err: Error): Record<string, unknown> | null => {
  if (
    !(err instanceof DatabaseError) &&
    !(err instanceof ConnectionError) &&
    !(err instanceof ConnectionTimedOutError) &&
    !(err instanceof TimeoutError)
  ) {
    return null;
  }

  const originalError = (err as DatabaseError).original as
    | (Error & { number?: number; code?: string; state?: string; procName?: string; lineNumber?: number })
    | undefined;
  const parentError = (err as DatabaseError).parent as
    | (Error & { number?: number; code?: string; state?: string; procName?: string; lineNumber?: number })
    | undefined;
  const sourceError = originalError || parentError;
  const sqlMessage = sourceError?.message || err.message || '';
  const sqlNumber = sourceError?.number;
  const sqlCode = sourceError?.code;
  const isDeadlock = sqlNumber === 1205 || /deadlock/i.test(sqlMessage);
  const isTimeout =
    err instanceof TimeoutError ||
    err instanceof ConnectionTimedOutError ||
    /timeout|timed out|ETIMEOUT/i.test(sqlMessage) ||
    sqlCode === 'ETIMEOUT';
  const isLoginFailed =
    sqlNumber === 18456 ||
    /login failed|ELOGIN|authentication failed|Access denied/i.test(sqlMessage) ||
    sqlCode === 'ELOGIN';

  return {
    category: isDeadlock ? 'deadlock' : isTimeout ? 'timeout' : isLoginFailed ? 'login_failed' : 'sql_error',
    message: sqlMessage,
    number: sqlNumber,
    code: sqlCode,
    state: sourceError?.state,
    procedure: sourceError?.procName,
    lineNumber: sourceError?.lineNumber,
    sql: (err as DatabaseError).sql,
  };
};

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const sqlDetails = getSqlErrorDetails(err);
  if (sqlDetails) {
    console.error('[SQL Error]', {
      path: req.originalUrl,
      method: req.method,
      ...sqlDetails,
    });
  } else {
    console.error('[Error]', err.message, err.stack);
  }

  if (err instanceof ValidationError) {
    res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: err.errors.map((e) => ({ field: e.path, message: e.message })),
    });
    return;
  }

  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Internal server error';

  res.status(statusCode).json({ success: false, message });
};

export const notFound = (req: Request, res: Response): void => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
};

export const createError = (message: string, statusCode: number): AppError => {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};
