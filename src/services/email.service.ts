import fs from 'fs';
import path from 'path';
import { ContactMessage, EmailConfig } from '../types/contact.types';
import { IMailSender, MailMessage } from '../types/mail.types';
import { ITemplateEngine, CompiledTemplate } from '../types/template.types';
import loggerService from './logger.service';
import emailI18n from '../config/email-i18n.json';

interface EmailTranslations {
  subjects: {
    [template: string]: {
      [type: string]: {
        [locale: string]: string;
      };
    };
  };
  text: {
    [type: string]: {
      [locale: string]: {
        [key: string]: string;
      };
    };
  };
}

class EmailService {
  private mailSender: IMailSender;
  private templateEngine: ITemplateEngine;
  private config: EmailConfig;
  private templates: Map<string, CompiledTemplate>;
  private translations: EmailTranslations;

  constructor(config: EmailConfig, mailSender: IMailSender, templateEngine: ITemplateEngine) {
    this.config = config;
    this.mailSender = mailSender;
    this.templateEngine = templateEngine;
    this.templates = new Map();
    this.translations = emailI18n;
    this.loadTemplates();
  }

  private loadTemplates(): void {
    const templatesDir = this.config.templatesDir || path.join(__dirname, '..', 'templates');

    if (!fs.existsSync(templatesDir)) {
      loggerService.logWarn(`Templates directory not found: ${templatesDir}`);
      return;
    }

    const ext = this.templateEngine.fileExtension;
    const files = fs.readdirSync(templatesDir);
    const templateFiles = files.filter((file) => file.endsWith(ext));

    templateFiles.forEach((file) => {
      const templatePath = path.join(templatesDir, file);
      const templateContent = fs.readFileSync(templatePath, 'utf-8');
      const templateName = file.replace(ext, '');
      this.templates.set(templateName, this.templateEngine.compile(templateContent));
      loggerService.logInfo(`Loaded template: ${templateName} (${this.templateEngine.name})`);
    });
  }

  getTemplateNames(): string[] {
    return Array.from(this.templates.keys());
  }

  renderTemplate(templateName: string, data: Record<string, unknown>): string | undefined {
    const template = this.templates.get(templateName);
    return template ? template(data) : undefined;
  }

  private sanitizeLocale(locale?: string): string | undefined {
    if (!locale) {
      return undefined;
    }

    const localeRegex = /^[a-z]{2}(-[A-Z]{2})?$/;

    if (!localeRegex.test(locale)) {
      loggerService.logWarn(`Invalid locale format: ${locale}. Ignoring locale.`);
      return undefined;
    }

    return locale;
  }

  private resolveLocale(locale?: string): string {
    const sanitized = this.sanitizeLocale(locale);
    return sanitized || this.config.defaultLanguage;
  }

  private getTranslatedSubject(
    templateName: string,
    type: 'contact' | 'confirmation' | 'reply',
    locale?: string,
    variables?: Record<string, string>
  ): string {
    const effectiveLocale = this.resolveLocale(locale);
    const baseLocale = effectiveLocale.split('-')[0];

    const templateTranslations = this.translations.subjects[templateName];
    if (!templateTranslations) {
      loggerService.logWarn(`Template translations not found: ${templateName}, using default`);
      return this.getTranslatedSubject('default', type, locale, variables);
    }

    const subjectTranslations = templateTranslations[type];
    if (!subjectTranslations) {
      loggerService.logWarn(`Type translations not found: ${type} for template ${templateName}`);
      return type;
    }

    let template =
      subjectTranslations[effectiveLocale] ||
      subjectTranslations[baseLocale] ||
      subjectTranslations[this.config.defaultLanguage] ||
      type;

    if (variables) {
      Object.entries(variables).forEach(([varKey, value]) => {
        template = template.replace(`{{${varKey}}}`, value);
      });
    }

    return template;
  }

  private getTextTranslation(
    type: 'contact' | 'confirmation' | 'reply',
    locale: string
  ): Record<string, string> {
    const baseLocale = locale.split('-')[0];
    const typeTranslations = this.translations.text[type];

    if (!typeTranslations) {
      loggerService.logWarn(`Text translations not found for type: ${type}`);
      return {};
    }

    return (
      typeTranslations[locale] ||
      typeTranslations[baseLocale] ||
      typeTranslations[this.config.defaultLanguage] ||
      {}
    );
  }

  private interpolate(template: string, variables: Record<string, string>): string {
    let result = template;
    Object.entries(variables).forEach(([key, value]) => {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    });
    return result;
  }

  private getTemplate(
    templateName: string,
    locale?: string,
    fallbackTemplate?: string
  ): CompiledTemplate | undefined {
    const effectiveLocale = this.resolveLocale(locale);
    const baseLocale = effectiveLocale.split('-')[0];

    // Try full locale, then base locale, then default language
    for (const loc of [effectiveLocale, baseLocale, this.config.defaultLanguage]) {
      const localizedTemplate = this.templates.get(`${templateName}-${loc}`);
      if (localizedTemplate) {
        loggerService.logInfo(`Using template: ${templateName}-${loc}`);
        return localizedTemplate;
      }
    }

    if (fallbackTemplate) {
      return this.getTemplate(fallbackTemplate, locale);
    }

    return undefined;
  }

  private buildContactText(contactMessage: ContactMessage, locale: string): string {
    const t = this.getTextTranslation('contact', locale);

    const contextBlock = contactMessage.context
      ? `\n${t.additionalInfo || 'Additional information'}:\n${Object.entries(
          contactMessage.context
        )
          .map(([key, value]) => `${key}: ${String(value)}`)
          .join('\n')}`
      : '';

    return [
      t.header,
      '',
      `${t.name}: ${contactMessage.name}`,
      `${t.email}: ${contactMessage.email}`,
      `${t.subject}: ${contactMessage.subject}`,
      '',
      `${t.message}:`,
      contactMessage.message,
      contextBlock,
      '',
      `${t.receivedAt}: ${new Date().toLocaleString(locale)}`,
    ].join('\n');
  }

  private buildConfirmationText(contactMessage: ContactMessage, locale: string): string {
    const t = this.getTextTranslation('confirmation', locale);
    const companyName = this.config.companyName || t.closing;

    return [
      this.interpolate(t.greeting || '', { name: contactMessage.name }),
      '',
      t.body,
      '',
      t.summary,
      `${t.subject}: ${contactMessage.subject}`,
      `${t.date}: ${new Date().toLocaleString(locale)}`,
      '',
      `${t.message}:`,
      contactMessage.message,
      '',
      t.urgent,
      '',
      `${t.closing}`,
      companyName,
      '',
      '---',
      t.autoEmail,
    ].join('\n');
  }

  private buildReplyText(
    options: {
      contactName: string;
      replyMessage: string;
      originalMessage?: string;
      originalDate?: string;
    },
    locale: string
  ): string {
    const t = this.getTextTranslation('reply', locale);
    const companyName = this.config.companyName || '';

    const lines = [
      this.interpolate(t.greeting || '', { contactName: options.contactName }),
      '',
      options.replyMessage,
    ];

    if (options.originalMessage) {
      lines.push(
        '',
        t.separator || '---',
        this.interpolate(t.originalMessageHeader || '', {
          originalDate: options.originalDate || new Date().toLocaleString(locale),
        }),
        options.originalMessage
      );
    }

    lines.push('', '---', companyName, this.config.from);

    return lines.join('\n');
  }

  async sendContactEmail(contactMessage: ContactMessage): Promise<void> {
    const templateName = contactMessage.template || 'default';
    const internalLang = this.config.internalEmailLanguage;
    const template = this.getTemplate(templateName, internalLang, 'default');

    if (!template) {
      throw new Error('Template not found');
    }

    const templateData = {
      name: contactMessage.name,
      email: contactMessage.email,
      subject: contactMessage.subject,
      message: contactMessage.message,
      context: contactMessage.context,
      timestamp: new Date().toLocaleString(internalLang),
    };

    const html = template(templateData);
    const text = this.buildContactText(contactMessage, internalLang);

    const mailMessage: MailMessage = {
      from: this.config.from,
      to: this.config.to,
      subject: this.getTranslatedSubject(templateName, 'contact', internalLang, {
        subject: contactMessage.subject,
      }),
      html,
      text,
    };

    await this.mailSender.send(mailMessage);

    if (this.config.sendConfirmation) {
      await this.sendConfirmationEmail(contactMessage);
    }
  }

  async sendConfirmationEmail(contactMessage: ContactMessage): Promise<void> {
    const templateName = contactMessage.template || 'default';
    const locale = contactMessage.locale;
    const effectiveLocale = this.resolveLocale(locale);
    const confirmationTemplateName = `${templateName}-confirmation`;

    const confirmationTemplate = this.getTemplate(
      confirmationTemplateName,
      locale,
      'default-confirmation'
    );

    if (!confirmationTemplate) {
      loggerService.logWarn('Confirmation template not found, skipping confirmation email');
      return;
    }

    const templateData = {
      name: contactMessage.name,
      subject: contactMessage.subject,
      message: contactMessage.message,
      timestamp: new Date().toLocaleString(effectiveLocale),
      companyName: this.config.companyName || '',
      year: new Date().getFullYear(),
    };

    const html = confirmationTemplate(templateData);
    const text = this.buildConfirmationText(contactMessage, effectiveLocale);

    const mailMessage: MailMessage = {
      from: this.config.from,
      to: contactMessage.email,
      subject: this.getTranslatedSubject(templateName, 'confirmation', locale, {
        subject: contactMessage.subject,
      }),
      html,
      text,
    };

    await this.mailSender.send(mailMessage);
  }

  async sendReplyEmail(options: {
    to: string;
    contactName: string;
    subject: string;
    replyMessage: string;
    originalMessage?: string;
    originalDate?: string;
    locale?: string;
  }): Promise<void> {
    const { to, contactName, subject, replyMessage, originalMessage, originalDate, locale } =
      options;

    const effectiveLocale = this.resolveLocale(locale);
    const templateName = 'reply';

    const replyTemplate = this.getTemplate(templateName, effectiveLocale);

    if (!replyTemplate) {
      throw new Error('Reply template not found');
    }

    const templateData = {
      contactName,
      replyMessage,
      originalMessage,
      originalDate: originalDate || new Date().toLocaleString(effectiveLocale),
      companyName: this.config.companyName || '',
      companyEmail: this.config.from,
      year: new Date().getFullYear(),
    };

    const html = replyTemplate(templateData);
    const text = this.buildReplyText(
      { contactName, replyMessage, originalMessage, originalDate },
      effectiveLocale
    );

    const mailMessage: MailMessage = {
      from: this.config.from,
      to,
      subject: this.getTranslatedSubject(templateName, 'reply', effectiveLocale, { subject }),
      html,
      text,
    };

    await this.mailSender.send(mailMessage);
  }

  async verifyConnection(): Promise<boolean> {
    return this.mailSender.verify();
  }
}

export default EmailService;
