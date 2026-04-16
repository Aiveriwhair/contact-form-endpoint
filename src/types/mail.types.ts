export interface MailMessage {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  text: string;
}

export interface IMailSender {
  send(message: MailMessage): Promise<void>;
  verify(): Promise<boolean>;
}

export interface MailTransportConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
}
