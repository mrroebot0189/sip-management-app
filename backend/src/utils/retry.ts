export type RetryOptions = {
  attempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterRatio: number;
  shouldRetry?: (error: unknown) => boolean;
  onRetry?: (ctx: { attempt: number; delayMs: number; error: unknown }) => void;
};

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const applyJitter = (baseDelayMs: number, jitterRatio: number): number => {
  if (jitterRatio <= 0) return baseDelayMs;
  const variance = baseDelayMs * jitterRatio;
  const min = Math.max(0, baseDelayMs - variance);
  const max = baseDelayMs + variance;
  return Math.round(min + Math.random() * (max - min));
};

export const retry = async <T>(operation: () => Promise<T>, options: RetryOptions): Promise<T> => {
  const {
    attempts,
    initialDelayMs,
    maxDelayMs,
    backoffMultiplier,
    jitterRatio,
    shouldRetry,
    onRetry,
  } = options;

  let delayMs = initialDelayMs;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      const isFinalAttempt = attempt >= attempts;
      const retryAllowed = shouldRetry ? shouldRetry(error) : true;

      if (isFinalAttempt || !retryAllowed) {
        throw error;
      }

      const jitteredDelay = applyJitter(delayMs, jitterRatio);
      onRetry?.({ attempt, delayMs: jitteredDelay, error });
      await sleep(jitteredDelay);
      delayMs = Math.min(Math.round(delayMs * backoffMultiplier), maxDelayMs);
    }
  }

  throw new Error('Retry loop exited unexpectedly.');
};

export const isLikelyTransientSqlError = (error: unknown): boolean => {
  const message = (error as { message?: string })?.message?.toLowerCase() || '';
  return [
    'etimedout',
    'econnreset',
    'econnrefused',
    'socket hang up',
    'deadlock',
    'throttl',
    'timeout',
    'temporar',
    'could not connect',
    'connection lost',
  ].some((token) => message.includes(token));
};
