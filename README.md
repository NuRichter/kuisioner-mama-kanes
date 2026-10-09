# Kuisioner Mama Kanes

Web questionnaire for the research instrument *Kredibilitas Sumber Manusia dan Sistem Cerdas dalam Ekosistem Investasi Digital* (Versi 3 final). Respondents read the study information, give consent, pass the eligibility screen, and answer 53 five-point Likert statements. Completed responses are stored privately and exported by the researcher as CSV.

## Features

- **Faithful instrument.** Every respondent-facing string comes verbatim from the source document. Internal material (colour legend, D/A/S codes, the "Dipakai" column, the researcher notes) is never shown, as the source requires.
- **Branching from the source.** Declining consent, A1 to A8 not all "Ya", A9 = "Ya", or A11 = "Tidak" ends the session with nothing sent.
- **Counterbalancing.** Each respondent is randomly assigned version `CD` or `DC`, which swaps Bagian C and D. The version is stored with the response.
- **Section-based flow** with inline validation, focus on the first missing answer, a segmented progress strip, a statement counter, and a route rail on wide screens.
- **Resumable.** Answers autosave to `localStorage` after every change and restore on reload. Browser back moves between sections. "Mulai ulang" asks for confirmation. After submission the answers are removed from the device.
- **Private storage.** Responses are validated again on the server and written as private JSON objects to Vercel Blob.
- **Researcher dashboard.** `/peneliti` (password login, signed session cookie, not indexed) analyzes all responses: collection progress against the sample targets in the researcher notes, data screening (AC1 = 2, AC2 = 4, AC3 = 1 plus an adjustable longstring threshold), respondent profile, construct means, Cronbach's alpha, corrected item-total correlations, correlation and HTMT matrices, the TRA–TIP discriminant check (r < 0.78), redundancy analysis, human-vs-machine credibility (paired t-test), the trust × risk map, and the C/D order effect (Welch t-test). Deterministic insights state their basis. Respondents never see any of this.
- **Reports.** CSV (raw or clean), an Excel workbook with codebook, a PDF report, and a PowerPoint deck with native editable charts, all following the active dashboard filters.
- **Accessible.** Native radio groups in `fieldset`/`legend`, visible focus, skip link, WCAG AA contrast in light and dark modes, reduced-motion support.

## Questionnaire architecture

```
src/data/questionnaire.ts      Instrument content (single source of truth in code)
        │
src/lib/questionnaire/flow.ts  Step order, C/D counterbalancing, eligibility and stop rules
src/lib/questionnaire/state.ts Pure reducer for navigation and answers
src/lib/validation/            Per-section validation (client) and full submission check (server, Zod)
src/lib/scoring/screening.ts   Attention-check and longstring indicators (researcher only)
src/data/research-map.ts       Construct map, sample targets, thresholds (researcher notes, server only)
src/lib/analytics/             Statistics, analysis model, insights, dashboard filters
src/lib/auth/session.ts        scrypt password check, signed sessions and download tokens
src/lib/security/              Key derivation, encryption, form tokens, rate limits, request checks, audit
src/lib/export/                CSV, codebook, Excel, PDF and PowerPoint builders
src/lib/storage/responses.ts   Vercel Blob (production) or .data/ (local)
        │
src/components/questionnaire/  UI: steps, form questions, Likert scale ruler, shell
src/components/research/       Researcher dashboard
src/components/charts/         Server-rendered SVG/HTML charts
src/app/                       Page, /peneliti, /api/responses, /api/laporan/[format]
```

## Technology stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Zod, Vercel Blob, ExcelJS, React-PDF, PptxGenJS, Lucide icons, Vitest, Playwright, axe-core.

## Local setup

Requires Node.js 20 or newer.

```bash
npm install
cp .env.example .env.local   # optional for local development
npm run dev                  # http://localhost:3000
```

Without `BLOB_READ_WRITE_TOKEN`, development mode stores responses in `.data/responses/` (git-ignored).

To try the dashboard locally with realistic volume, generate synthetic responses. Their IDs start with `contoh-` and they are written only to `.data/`:

```bash
node scripts/seed-local-responses.mts 240
RESEARCHER_PASSWORD=your-local-password npm run dev   # then open /peneliti
```

## Testing

```bash
npm run typecheck
npm run lint
npm test                 # unit tests: flow, eligibility, validation, scoring, CSV
npm run build
npm run test:e2e         # Playwright on desktop and mobile against the production build (port 3100)
BASE_URL=https://your-deployment.example npm run test:e2e   # smoke test a deployment
```

When `BASE_URL` is set, the E2E suite intercepts the final submission so test data never enters the research dataset. Set `E2E_RESEARCHER_PASSWORD` to include the researcher dashboard in a production smoke test.

## Deployment

The app is deployed on Vercel.

1. Create or link the project: `vercel link`.
2. Create a Blob store and connect it to the project (this provides `BLOB_READ_WRITE_TOKEN`).
3. Set `RESEARCHER_PASSWORD_HASH` (from `scripts/hash-password.mts`), `SESSION_SECRET` (32 or more random characters), `DATA_ENCRYPTION_KEY` (32 random bytes, base64) and, optionally, `CONTACT_EMAIL`.
4. Deploy: `vercel deploy --prod`.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `BLOB_READ_WRITE_TOKEN` | Production | Private Vercel Blob store for responses |
| `RESEARCHER_PASSWORD_HASH` | Production | scrypt hash of the researcher password (`scripts/hash-password.mts`) |
| `DATA_ENCRYPTION_KEY` | Production | 32-byte base64 key that encrypts every stored response (AES-256-GCM) |
| `DATA_ENCRYPTION_KEY_PREVIOUS` | No | Previous key, kept only while rotating |
| `RESEARCHER_PASSWORD` | Local only | Plain-text password for local development (ignored in production) |
| `SESSION_SECRET` | Production | Key that signs the researcher session cookie (32+ characters) |
| `CONTACT_EMAIL` | No | Researcher contact address shown on the information page |
| `LOCAL_RESPONSE_STORE` | No | Set to `1` to use `.data/` with `next start` locally |

## Security

The interface and flow are unchanged; the protections below run on the server.

| Layer | Protection |
|---|---|
| Data at rest | Every response is encrypted with AES-256-GCM (`DATA_ENCRYPTION_KEY`) before it is written to the private Blob store. Production refuses to store a response without encryption. `DATA_ENCRYPTION_KEY_PREVIOUS` allows key rotation. |
| Submission integrity | A server-signed form token is issued when the respondent consents. The server takes the start time from the token (duration cannot be forged), rejects submissions less than 60 seconds after consent, and uses the token ID as the storage key, so a token yields exactly one response (resubmissions are idempotent). |
| Request checks | Write endpoints accept only same-origin `application/json` requests (Origin and Sec-Fetch-Site), with body size and field-count limits and strict Zod validation. |
| Rate limits | Per hashed IP: 120 form tokens and 40 submissions per hour (generous for campus NAT), 120 report downloads per hour. Counters live in the private Blob store so they hold across serverless instances. |
| Researcher login | Password stored only as a scrypt hash (`RESEARCHER_PASSWORD_HASH`). 5 failed attempts per IP or 30 globally within 15 minutes lock login for the rest of the window; locked attempts never check the password. |
| Sessions | HMAC-signed tokens with random ID, issue and expiry times, and a password fingerprint, so changing the password ends every session. `__Host-` cookie, `HttpOnly`, `Secure`, `SameSite=Strict`, 8 hours. Keys for sessions, downloads, form tokens and IP hashing are derived separately from `SESSION_SECRET` with HKDF. |
| Downloads | Report links carry a 30-minute token bound to one format, so download managers work without cookies; invalid links get a plain 403 (no browser login prompt). |
| Headers | Strict CSP (no eval, no external sources, no plugins, no framing), HSTS with preload, COOP and CORP same-origin, `nosniff`, Permissions-Policy, no `X-Powered-By`. Researcher and API routes add `no-store`, `noindex` and `no-referrer`. |
| Audit | Logins (success, failure, lockout), logouts, downloads and rejected submissions are written to the server log and to `sistem/audit/` in the private store, with IPs only as keyed hashes. |
| Dependencies | `npm audit --omit=dev` reports 0 vulnerabilities (patched `uuid` and `image-size` through `overrides`). |

To change the researcher password:

```bash
node scripts/hash-password.mts "new password"   # prints RESEARCHER_PASSWORD_HASH
```

Set the printed value as `RESEARCHER_PASSWORD_HASH` and redeploy. Every existing session ends automatically.

Keep a copy of `DATA_ENCRYPTION_KEY` in a password manager. Without it, stored responses cannot be decrypted.

## Project structure

```
DESIGN.md        Visual language, data visualization and report rules
assets/fonts/    Geist TTF (SIL OFL) embedded in the PDF report
scripts/         Local synthetic data generator
src/             Application code (see architecture above)
tests/unit/      Vitest unit tests
tests/e2e/       Playwright end-to-end tests
```

## Data codes

Yes/no answers are stored as `1` = Ya and `0` = Tidak. Single-choice answers use the option's position in the instrument (`1`, `2`, ...). A10 is exported as dummy columns `A10_1` to `A10_5`. Likert answers are `1` (Sangat Tidak Setuju) to `5` (Sangat Setuju), with columns named by the instrument item codes.

© 2026 Irma Dwi Kusuma. All Rights Reserved.
