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
| `APP_URL` | Links and Twilio webhooks, e.g. `https://tenurage.aultrum.co.uk`. |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` | Linkbot texting. `TWILIO_FROM` is the shared number used until an agency's own is bought. |
| `TWILIO_BUNDLE_SID`, `TWILIO_ADDRESS_SID` | Buying each agency a UK mobile number (Ofcom regulatory bundle). |
| `ANTHROPIC_API_KEY` | Bot, Linkbot's replies, and AI-written Docs. Without it, the rest still works. |
| `CRON_SECRET` | Optional: `/api/cron/linkbot` on a schedule. Linkbot also moves on whenever the office uses Tenurage or a text arrives. |
| `RESEND_API_KEY`, `EMAIL_FROM` | Optional: emailing the office when an applicant asks for them. |

Reapit credentials are per agency, entered by an admin under Integrations, and stored encrypted.
