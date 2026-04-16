import nodemailer from 'nodemailer';
import { IMailSender, MailMessage, MailTransportConfig } from '../types/mail.types';
import loggerService from './logger.service';

export abstract class AbstractMailSender implements IMailSender {
  abstract send(message: MailMessage): Promise<void>;
  abstract verify(): Promise<boolean>;

  protected logSending(to: string | string[], subject: string): void {
    loggerService.logInfo('Sending email', { to, subject });
  }

  protected logSuccess(to: string | string[], subject: string): void {
    loggerService.logInfo('Email sent successfully', { to, subject });
  }

  protected logFailure(error: Error, to: string | string[], subject: string): void {
    loggerService.logError(error, `Failed to send email to ${String(to)} — subject: ${subject}`);
  }
}

export class NodemailerMailSender extends AbstractMailSender {
  private transporter: nodemailer.Transporter;

  constructor(config: MailTransportConfig) {
    super();
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.password,
      },
    });
  }

  async send(message: MailMessage): Promise<void> {
    this.logSending(message.to, message.subject);
    try {
      await this.transporter.sendMail(message);
      this.logSuccess(message.to, message.subject);
    } catch (error) {
      this.logFailure(error as Error, message.to, message.subject);
      throw error;
    }
  }

  async verify(): Promise<boolean> {
    try {
      await this.transporter.verify();
      loggerService.logInfo('Mail transport connection verified');
      return true;
    } catch (error) {
      loggerService.logError(error as Error, 'Mail transport connection verification failed');
      return false;
    }
  }
}
