# Contact API

REST API for contact forms with email sending, i18n, and customizable templates.

## Quick Start

```bash
npm install
cp .env.example .env  # edit with your SMTP credentials
npm run dev
```

## API

### `POST /api/contact/submit`

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "subject": "Question",
  "message": "Your message here...",
  "template": "default",
  "locale": "en",
  "context": { "source": "homepage" }
}
```

All fields except `template`, `locale`, and `context` are required. Rate limited to 5 requests / 15 min per IP.

### `GET /api/contact/health`

Returns SMTP connection status.

### `GET /dev/templates` (dev only)

Visual template preview with sample data. Not available in production.

## Templates

Three built-in styles: `default`, `detailed`, `minimal`. Each has EN/FR variants for contact notifications, confirmations, and replies.

Override with custom templates via `TEMPLATES_DIR` env variable.

### Template Engine

Set `TEMPLATE_ENGINE` to `handlebars` (default) or `ejs`. Templates must use the matching file extension (`.hbs` or `.ejs`).

## Environment Variables

See [.env.example](.env.example) for all available options. Key settings:

| Variable                                                      | Description                         |
| ------------------------------------------------------------- | ----------------------------------- |
| `EMAIL_HOST` / `EMAIL_PORT` / `EMAIL_USER` / `EMAIL_PASSWORD` | SMTP transport                      |
| `EMAIL_FROM` / `EMAIL_TO`                                     | Sender and recipient(s)             |
| `SEND_EMAILS`                                                 | Global kill-switch (`true`/`false`) |
| `SEND_CONFIRMATION_EMAIL`                                     | Auto-confirm to submitter           |
| `DEFAULT_LANGUAGE`                                            | Fallback locale (default: `fr`)     |
| `TEMPLATE_ENGINE`                                             | `handlebars` or `ejs`               |
| `TEMPLATES_DIR`                                               | Custom templates directory          |

## Docker

```bash
docker build -t contact-api .
docker run -p 3000:3000 --env-file .env contact-api
```
