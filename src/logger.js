// ─── Logger ──────────────────────────────────────────────────────────────────
// Winston logger with console + file transports.
// ─────────────────────────────────────────────────────────────────────────────

import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, stack }) => {
      const base = `${timestamp} [${level.toUpperCase().padEnd(5)}] ${message}`;
      return stack ? `${base}\n${stack}` : base;
    })
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, stack }) => {
          const base = `${timestamp} ${level} ${message}`;
          return stack ? `${base}\n${stack}` : base;
        })
      ),
    }),
    new winston.transports.File({
      filename: 'data/bot.log',
      maxsize: 5 * 1024 * 1024, // 5 MB
      maxFiles: 3,
    }),
  ],
});

export default logger;
