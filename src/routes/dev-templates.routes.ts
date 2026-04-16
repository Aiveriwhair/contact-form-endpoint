import { Router, Request, Response } from 'express';
import EmailService from '../services/email.service';
import { EmailConfig } from '../types/contact.types';
import { ITemplateEngine } from '../types/template.types';

function buildSampleData(name: string, emailConfig: EmailConfig): Record<string, unknown> {
  const isReply = name.includes('reply');
  const isConfirmation = name.includes('confirmation');

  if (isReply) {
    return {
      contactName: 'Marie Dupont',
      replyMessage:
        'Thank you for reaching out! We have availability this Saturday at 10am for a beginner session in the Bois de Vincennes. Would that work for you?',
      originalMessage:
        'Hello, I would like to book a cycling lesson for my 8 year old daughter. Are you available this weekend?',
      originalDate: new Date().toLocaleString('fr-FR'),
      companyName: emailConfig.companyName || 'My Company',
      signatureName: emailConfig.signatureName || emailConfig.companyName || 'My Company',
      companyEmail: emailConfig.from || 'contact@example.com',
      year: new Date().getFullYear(),
    };
  }

  return {
    name: 'Marie Dupont',
    email: 'marie.dupont@example.com',
    subject: isConfirmation ? 'Cycling lesson booking' : 'New booking request',
    message:
      'Hello, I would like to book a cycling lesson for my 8 year old daughter in the Bois de Vincennes. Are you available next Saturday morning?',
    timestamp: new Date().toLocaleString('fr-FR'),
    companyName: emailConfig.companyName || 'My Company',
    signatureName: emailConfig.signatureName || emailConfig.companyName || 'My Company',
    year: new Date().getFullYear(),
    context: isConfirmation
      ? undefined
      : { source: 'website', page: '/contact', age_group: '6-12 years' },
  };
}

export function createDevTemplateRouter(
  emailService: EmailService,
  emailConfig: EmailConfig,
  templateEngine: ITemplateEngine,
  baseUrl: string
): Router {
  const router = Router();

  router.get('/', (req: Request, res: Response) => {
    const templates = emailService.getTemplateNames();
    const cards = templates
      .sort()
      .map(
        (t) =>
          '<div class="card"><span>' +
          t +
          '</span><a href="' +
          baseUrl +
          '/templates/' +
          t +
          '">Preview →</a></div>'
      )
      .join('\n');

    res.send(
      '<!DOCTYPE html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Template Preview</title>' +
        '<style>' +
        '*, *::before, *::after { box-sizing: border-box; }' +
        'body { font-family: system-ui, sans-serif; margin: 0; padding: 24px 16px; color: #2d3436; background: #f0f4f0; }' +
        '.container { max-width: 960px; margin: 0 auto; }' +
        'h1 { color: #2d6a4f; font-size: clamp(1.4rem, 4vw, 2rem); margin: 0 0 4px; }' +
        '.badge { background: #52b788; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; vertical-align: middle; }' +
        '.info { color: #888; font-size: 13px; margin: 0 0 20px; }' +
        '.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }' +
        '.card { background: white; border-radius: 10px; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 4px rgba(0,0,0,0.07); transition: box-shadow .15s, transform .15s; }' +
        '.card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.12); transform: translateY(-1px); }' +
        '.card span { font-size: 14px; font-weight: 500; word-break: break-all; margin-right: 12px; }' +
        '.card a { color: #e76f51; text-decoration: none; font-weight: 600; white-space: nowrap; font-size: 14px; }' +
        '.card a:hover { text-decoration: underline; }' +
        '@media (max-width: 480px) { .grid { grid-template-columns: 1fr; } .card { padding: 14px 16px; } }' +
        '</style></head><body>' +
        '<div class="container">' +
        '<h1>Template Preview</h1>' +
        '<p class="info">Engine: <span class="badge">' +
        templateEngine.name +
        '</span> &mdash; ' +
        templates.length +
        ' templates loaded</p>' +
        '<div class="grid">' +
        cards +
        '</div></div>' +
        '</body></html>'
    );
  });

  router.get('/:name', (req: Request, res: Response) => {
    const { name } = req.params;
    const sampleData = buildSampleData(name, emailConfig);

    const rendered = emailService.renderTemplate(name, sampleData);
    if (!rendered) {
      res.status(404).json({ success: false, message: 'Template "' + name + '" not found' });
      return;
    }

    if (req.query.raw === 'true') {
      res.setHeader('Content-Type', 'text/plain');
      res.send(rendered);
      return;
    }

    res.send(
      '<!DOCTYPE html><html><head><meta charset="utf-8" />' +
        '<title>Preview: ' +
        name +
        '</title>' +
        '<style>' +
        'body { margin: 0; font-family: system-ui, sans-serif; background: #e8e8e8; }' +
        '.toolbar { background: #1b4332; color: white; padding: 12px 24px; display: flex; justify-content: space-between; align-items: center; font-size: 14px; }' +
        '.toolbar a { color: #95d5b2; text-decoration: none; }' +
        '.toolbar a:hover { text-decoration: underline; }' +
        '.toolbar .name { font-weight: 700; color: #52b788; }' +
        '.email-wrapper { max-width: 660px; margin: 24px auto; background: white; box-shadow: 0 4px 24px rgba(0,0,0,0.12); border-radius: 8px; overflow: hidden; }' +
        '</style></head><body>' +
        '<div class="toolbar">' +
        '<span>Template: <span class="name">' +
        name +
        '</span></span>' +
        '<span><a href="' +
        baseUrl +
        '/templates">← All templates</a> · <a href="' +
        baseUrl +
        '/templates/' +
        name +
        '?raw=true">Raw HTML</a></span>' +
        '</div>' +
        '<div class="email-wrapper">' +
        rendered +
        '</div>' +
        '</body></html>'
    );
  });

  return router;
}
