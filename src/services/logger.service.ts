import winston from 'winston';
import path from 'path';
import { ContactMessage } from '../types/contact.types';

class LoggerService {
  private logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss',
        }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
      ),
      defaultMeta: { service: 'contact-form-api' },
      transports: [
        // Écrire tous les logs dans un fichier
        new winston.transports.File({
          filename: path.join('logs', 'contact-messages.log'),
        }),
        // Écrire les erreurs dans un fichier séparé
        new winston.transports.File({
          filename: path.join('logs', 'error.log'),
          level: 'error',
        }),
      ],
    });

    // En mode développement, aussi logger dans la console
    if (process.env.NODE_ENV !== 'production') {
      this.logger.add(
        new winston.transports.Console({
          format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
        })
      );
    }
  }

  logContactMessage(contactMessage: ContactMessage): void {
    this.logger.info('New contact message received', {
      name: contactMessage.name,
      email: contactMessage.email,
      subject: contactMessage.subject,
      message: contactMessage.message,
      timestamp: new Date().toISOString(),
    });
  }

  logError(error: Error, context?: string): void {
    this.logger.error('Error occurred', {
      error: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
    });
  }

  logInfo(message: string, meta?: Record<string, unknown>): void {
    this.logger.info(message, meta);
  }

  logWarn(message: string, meta?: Record<string, unknown>): void {
    this.logger.warn(message, meta);
  }
}

export default new LoggerService();
