export interface ContactRequestBody {
  name: string;
  email: string;
  subject: string;
  message: string;
  template?: string;
  locale?: string;
  context?: Record<string, unknown>;
}

export interface ContactMessage extends ContactRequestBody {
  timestamp?: Date;
}

export interface EmailConfig {
  from: string;
  to: string | string[];
  sendConfirmation: boolean;
  companyName?: string;
  signatureName?: string;
  defaultLanguage: string;
  internalEmailLanguage: string;
  templatesDir?: string;
  defaultTemplate?: string;
}
