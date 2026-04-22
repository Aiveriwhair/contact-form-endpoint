import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import EmailService from './services/email.service';
import { NodemailerMailSender } from './services/mail-sender.service';
import { HandlebarsEngine, EjsEngine } from './services/template-engines';
import ContactController from './controllers/contact.controller';
import createContactRouter from './routes/contact.routes';
import loggerService from './services/logger.service';
import { EmailConfig } from './types/contact.types';
import { MailTransportConfig } from './types/mail.types';
import { ITemplateEngine } from './types/template.types';
import { generalRateLimiter } from './middleware/rate-limiter.middleware';
import { requestLoggerMiddleware } from './middleware/request-logger.middleware';
import { createDevTemplateRouter } from './routes/dev-templates.routes';

dotenv.config();

const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}
const app: Application = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || '/api/contact';

app.set('trust proxy', 2);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdnjs.cloudflare.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://cdnjs.cloudflare.com'],
        fontSrc: ["'self'", 'https://cdnjs.cloudflare.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
      },
    },
  })
);

app.use(generalRateLimiter);

app.use(requestLoggerMiddleware);

app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',').map((origin) => origin.trim()) || '*',
    methods: ['GET', 'POST'],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const transportConfig: MailTransportConfig = {
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true',
  user: process.env.EMAIL_USER || '',
  password: process.env.EMAIL_PASSWORD || '',
};

const emailConfig: EmailConfig = {
  from: process.env.EMAIL_FROM || '',
  to: process.env.EMAIL_TO ? process.env.EMAIL_TO.split(',').map((email) => email.trim()) : [],
  sendConfirmation: process.env.SEND_CONFIRMATION_EMAIL === 'true',
  companyName: process.env.COMPANY_NAME || '',
  signatureName: process.env.SIGNATURE_NAME || process.env.COMPANY_NAME || '',
  defaultLanguage: process.env.DEFAULT_LANGUAGE || 'fr',
  internalEmailLanguage: process.env.INTERNAL_EMAIL_LANGUAGE || 'fr',
  templatesDir: process.env.TEMPLATES_DIR || undefined,
  defaultTemplate: process.env.DEFAULT_TEMPLATE || undefined,
};

const mailSender = new NodemailerMailSender(transportConfig);

const templateEngines: Record<string, () => ITemplateEngine> = {
  handlebars: () => new HandlebarsEngine(),
  ejs: () => new EjsEngine(),
};
const engineName = process.env.TEMPLATE_ENGINE || 'handlebars';
const engineFactory = templateEngines[engineName];
if (!engineFactory) {
  throw new Error(
    `Unknown template engine: ${engineName}. Available: ${Object.keys(templateEngines).join(', ')}`
  );
}
const templateEngine = engineFactory();

const emailService = new EmailService(emailConfig, mailSender, templateEngine);
const contactController = new ContactController(emailService);

// Contact form routes (public)
app.use(BASE_URL, createContactRouter(contactController));

// Dev-only template preview
if (process.env.NODE_ENV !== 'production') {
  // Root endpoint
  app.get(BASE_URL, (req: Request, res: Response) => {
    res.json({
      success: true,
      message: 'Contact API is running',
      endpoints: {
        submit: `POST ${BASE_URL}/submit`,
        health: `GET ${BASE_URL}/health`,
        templates: `GET ${BASE_URL}/templates`,
      },
    });
  });
  app.use(
    `${BASE_URL}/templates`,
    createDevTemplateRouter(emailService, emailConfig, templateEngine, BASE_URL)
  );
}

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
  });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  loggerService.logError(err, `${req.method} ${req.path}`);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
});

app.listen(PORT, () => {
  loggerService.logInfo(`Server is running on port ${PORT}`);

  void emailService.verifyConnection().then((emailHealthy) => {
    if (emailHealthy) {
      loggerService.logInfo('Email service connected successfully');
    } else {
      loggerService.logError(new Error('Email service connection failed'), 'Application startup');
    }
  });
});

export default app;
