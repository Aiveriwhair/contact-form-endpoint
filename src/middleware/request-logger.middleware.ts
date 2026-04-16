import { Request, Response, NextFunction } from 'express';
import winston from 'winston';
import path from 'path';

// Logger dédié aux requêtes HTTP
const requestLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    winston.format.json()
  ),
  defaultMeta: { service: 'http-requests' },
  transports: [
    new winston.transports.File({
      filename: path.join('logs', 'requests.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  requestLogger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
        })
      ),
    })
  );
}

export const requestLoggerMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();

  // Capturer l'IP de la requête
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown';

  // Logger la requête entrante
  const requestInfo = {
    method: req.method,
    url: req.url,
    ip,
    userAgent: req.headers['user-agent'] || 'unknown',
    body: req.method === 'POST' ? sanitizeBody(req.body) : undefined,
  };

  // Intercepter la réponse
  const originalSend = res.send;
  res.send = function (data: any): Response {
    const duration = Date.now() - startTime;

    // Logger la réponse
    requestLogger.info('HTTP Request', {
      ...requestInfo,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    });

    return originalSend.call(this, data);
  };

  next();
};

// Fonction pour nettoyer le body (masquer les données sensibles)
function sanitizeBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sanitized = { ...body };
  const sensitiveFields = ['password', 'token', 'apiKey', 'secret'];

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '***MASKED***';
    }
  }

  return sanitized;
}

export default requestLogger;
