const isProduction = process.env.NODE_ENV === 'production';

/**
 * Standardized logger utility to replace direct console usage.
 * This allows for better control over logging in different environments.
 */
export const logger = {
  info: (message: string, ...args: unknown[]) => {
    if (!isProduction) {
      console.log(`[INFO] ${message}`, ...args);
    }
  },
  warn: (message: string, ...args: unknown[]) => {
    console.warn(`[WARN] ${message}`, ...args);
  },
  error: (message: string, ...args: unknown[]) => {
    // In a real-world scenario, this could also send logs to a monitoring service like Sentry
    console.error(`[ERROR] ${message}`, ...args);
  },
};
