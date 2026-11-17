# Tenurage redesign: handoff

Status: **waiting for the user to pick a visual direction.** Do not build the full app until they choose.

## Brief (summary)
Redesign the Tenurage interface (Next.js 15 App Router, Prisma/Postgres, Tailwind). Tenurage is a standalone product for UK estate and letting agencies: properties, applicants, viewings, Linkbot (texts matched applicants, books viewings, reminders, feedback, takes office jobs by text) and Bot (office AI chat that proposes changes for approval). It is not part of the Aultrum care family (Pleasant, Elements); do not reuse that design system.

Rebuild plan once a direction is chosen, keeping all existing behaviour, data and server actions:
- Launchpad becomes "Today": today's viewings first (photo, applicant, time, call/text/directions), then what the AI did recently, then what needs a person.
- Properties as photo cards (status, price, viewings booked/open, "Fill with Linkbot"); detail page led by the photo. Add photos (and video tour) to the data model with an additive, idempotent migration marked `-- idempotent: safe to re-run`. Tasteful placeholders when there's no photo; never fake listings.
- Applicants as a pipeline (new → viewing booked → viewed → offer → let/sold) with interest and feedback on cards.
- AI visible throughout: Ask Bot bar on every page; Linkbot conversations on each property and applicant.
- Phone-first: bottom tab bar (Today, Properties, Applicants, Bot) under 760px; call/text on every person; no horizontal scroll at 390px.
- Keep every test passing (`npm test`, `npm run test:contract`, CI); add tests where behaviour changes.

Working setup: start Postgres, `npx prisma migrate deploy`, `npx prisma db seed`, `npx next dev`. Demo login admin@tenurage.demo / tenurage123 (Demo Lettings, Bristol). Screenshots with the preinstalled Playwright at 1440×900 and iPhone 14, sent to the user at each milestone. Work on this branch, open a PR into main, merge only when the user says "deploy" and CI is green. Plain UK English, no invented claims, stats or customers. Vercel production branch is main.

## Brand input from the user
No existing brand. References: **altitude.xyz** and **summation.com**, and "lots of video".
- Altitude: white canvas, near-black type, black pill buttons, one large geometric sans, product UI cards floating over sky/cloud imagery, colour used only as small accents.
- Summation: near-monochrome, soft grey panels, two-tone headlines (black then grey), video in rounded frames.
- Video read as: moving imagery plus agency-uploaded property video tours playing muted on Today, property cards and property detail.

## The three directions (files in this folder)
- **A · Open Sky** (`sky.*`): white, Inter Tight, drifting sky behind the hero, brick-orange `#e5582a` for AI.
- **B · Quiet Studio** (`studio.*`): greyscale panels, Geist, cobalt `#2f4bff` for AI.
- **C · After Hours** (`night.*`): dark `#0c0c0b`, Instrument Serif headlines + Inter, dusk backdrop, lime `#d7f25a` for AI.

`build.js` generates the three HTML files from shared markup; `snap.js` takes the screenshots (run both with node from this folder). Content uses the seed data only. The roof-over-T logo is a placeholder.
