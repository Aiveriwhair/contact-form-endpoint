import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import EmailService from '../services/email.service';
import loggerService from '../services/logger.service';
import { ContactMessage, ContactRequestBody } from '../types/contact.types';

class ContactController {
  private emailService: EmailService;

  constructor(emailService: EmailService) {
    this.emailService = emailService;
  }

  async submitContact(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          errors: errors.array(),
        });
        return;
      }

      const body = req.body as ContactRequestBody;
      const contactMessage: ContactMessage = {
        ...body,
        timestamp: new Date(),
      };

      loggerService.logContactMessage(contactMessage);

      await this.emailService.sendContactEmail(contactMessage);

      loggerService.logInfo('Contact message sent successfully', {
        email: contactMessage.email,
      });

      res.status(200).json({
        success: true,
        message: 'Contact message sent successfully',
      });
    } catch (error) {
      loggerService.logError(error as Error, 'ContactController.submitContact');

      res.status(500).json({
        success: false,
        message: 'Error sending contact message',
      });
    }
  }

  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const emailHealthy = await this.emailService.verifyConnection();

      res.status(emailHealthy ? 200 : 503).json({
        status: emailHealthy ? 'healthy' : 'unhealthy',
        emailService: emailHealthy ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      loggerService.logError(error as Error, 'ContactController.healthCheck');

      res.status(503).json({
        status: 'unhealthy',
        error: 'Service unavailable',
      });
    }
  }
}

export default ContactController;
