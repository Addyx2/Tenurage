# Tenurage

The AI-run estate and letting agency, part of Aultrum.

- **Launchpad**: the day at a glance, and what needs you.
- **Properties, Applicants, Viewings**: the agency's books.
- **Linkbot**: texts matched applicants about viewings in waves, books the first to reply YES, sends reminders and asks how it went. The office can text it too; anything that changes something waits for YES and a code.
- **Bot**: ask about the agency in plain English; changes it proposes wait for your approval.
- **Docs**: drafts particulars, viewing confirmations and letters. What Tenurage doesn't hold is left as `[add …]`, never guessed. No tenancy agreements or legal notices.
- **Integrations**: Reapit (imports properties and applicants), Gateway in Aultrum Elements, Aultrum ID (next).

## Run it locally

```bash
npm install
cp .env.example .env    # DATABASE_URL for a local Postgres
npx prisma migrate deploy && npm run db:seed
npm run dev             # sign in as admin@tenurage.demo / tenurage123
```

Checks: `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:contract` (needs the database), `npm run db:check-migrations`.

## Settings (Vercel)

| Setting | Needed for |
| --- | --- |
| `DATABASE_URL` | Everything. Migrations run on each deploy. |
| `AUTH_SECRET` | Sign-in sessions and sealing integration secrets. 32+ random characters. |
| `APP_URL` | Links and Twilio webhooks, e.g. `https://app.tenurage.com`. When it starts with `app.`, the same domain without it (tenurage.com, www.tenurage.com) serves the landing page and sends sign-in and the app to APP_URL. |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` | Linkbot texting. Tenurage buys each agency's UK mobile number itself, under the account's approved UK mobile regulatory bundle, which it finds through Twilio's API. |
| `TWILIO_API_KEY_SID`, `TWILIO_API_KEY_SECRET` | Recommended: a Twilio API key (Console → Account → API keys & tokens → Create API key, Standard). Requests to Twilio use it instead of the auth token, which then only checks incoming texts. |
| `TWILIO_FROM` | Optional: a shared number to text from until an agency's own number is bought. |
| `ANTHROPIC_API_KEY` | Bot, Linkbot's replies, and AI-written Docs. Without it, the rest still works. |
| `CRON_SECRET` | Optional: `/api/cron/linkbot` on a schedule. Linkbot also moves on whenever the office uses Tenurage or a text arrives. |
| `RESEND_API_KEY`, `EMAIL_FROM` | Optional: emailing the office when an applicant asks for them. |

Reapit credentials are per agency, entered by an admin under Integrations, and stored encrypted.
