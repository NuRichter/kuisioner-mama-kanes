# Kuisioner Mama Kanes

Web questionnaire for the research instrument *Kredibilitas Sumber Manusia dan Sistem Cerdas dalam Ekosistem Investasi Digital* (Versi 3 final). Respondents read the study information, give consent, pass the eligibility screen, and answer 53 five-point Likert statements. Completed responses are stored privately and exported by the researcher as CSV.

## Features

- **Faithful instrument.** Every respondent-facing string comes verbatim from the source document. Internal material (colour legend, D/A/S codes, the "Dipakai" column, the researcher notes) is never shown, as the source requires.
- **Branching from the source.** Declining consent, A1 to A8 not all "Ya", A9 = "Ya", or A11 = "Tidak" ends the session with nothing sent.
- **Counterbalancing.** Each respondent is randomly assigned version `CD` or `DC`, which swaps Bagian C and D. The version is stored with the response.
- **Section-based flow** with inline validation, focus on the first missing answer, a segmented progress strip, a statement counter, and a route rail on wide screens.
- **Resumable.** Answers autosave to `localStorage` after every change and restore on reload. Browser back moves between sections. "Mulai ulang" asks for confirmation. After submission the answers are removed from the device.
- **Private storage.** Responses are validated again on the server and written as private JSON objects to Vercel Blob.
- **Researcher export.** `/peneliti` downloads all responses as CSV (password protected, not indexed). The export includes attention-check results (AC1 = 2, AC2 = 4, AC3 = 1) and a longstring indicator, following the researcher notes. Respondents never see these.
- **Accessible.** Native radio groups in `fieldset`/`legend`, visible focus, skip link, WCAG AA contrast in light and dark modes, reduced-motion support.

## Questionnaire architecture

```
src/data/questionnaire.ts      Instrument content (single source of truth in code)
        │
src/lib/questionnaire/flow.ts  Step order, C/D counterbalancing, eligibility and stop rules
src/lib/questionnaire/state.ts Pure reducer for navigation and answers
src/lib/validation/            Per-section validation (client) and full submission check (server, Zod)
src/lib/scoring/screening.ts   Attention-check and longstring indicators (researcher only)
src/lib/export/csv.ts          CSV columns and encoding
src/lib/storage/responses.ts   Vercel Blob (production) or .data/ (local)
        │
src/components/questionnaire/  UI: steps, form questions, Likert scale ruler, shell
src/app/                       Page, /peneliti, /api/responses, /api/export
```

## Technology stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Zod, Vercel Blob, Lucide icons, Vitest, Playwright, axe-core.

## Local setup

Requires Node.js 20 or newer.

```bash
npm install
cp .env.example .env.local   # optional for local development
npm run dev                  # http://localhost:3000
```

Without `BLOB_READ_WRITE_TOKEN`, development mode stores responses in `.data/responses/` (git-ignored).

## Testing

```bash
npm run typecheck
npm run lint
npm test                 # unit tests: flow, eligibility, validation, scoring, CSV
npm run build
npm run test:e2e         # Playwright on desktop and mobile against the production build (port 3100)
BASE_URL=https://your-deployment.example npm run test:e2e   # smoke test a deployment
```

When `BASE_URL` is set, the E2E suite intercepts the final submission so test data never enters the research dataset.

## Deployment

The app is deployed on Vercel.

1. Create or link the project: `vercel link`.
2. Create a Blob store and connect it to the project (this provides `BLOB_READ_WRITE_TOKEN`).
3. Set `EXPORT_PASSWORD` (12 or more characters) and, optionally, `CONTACT_EMAIL`.
4. Deploy: `vercel deploy --prod`.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `BLOB_READ_WRITE_TOKEN` | Production | Private Vercel Blob store for responses |
| `EXPORT_PASSWORD` | Production | Password for the CSV export at `/peneliti` |
| `CONTACT_EMAIL` | No | Researcher contact address shown on the information page |
| `LOCAL_RESPONSE_STORE` | No | Set to `1` to use `.data/` with `next start` locally |

## Project structure

```
DESIGN.md        Visual language and interaction rules
src/             Application code (see architecture above)
tests/unit/      Vitest unit tests
tests/e2e/       Playwright end-to-end tests
```

## Data codes

Yes/no answers are stored as `1` = Ya and `0` = Tidak. Single-choice answers use the option's position in the instrument (`1`, `2`, ...). A10 is exported as dummy columns `A10_1` to `A10_5`. Likert answers are `1` (Sangat Tidak Setuju) to `5` (Sangat Setuju), with columns named by the instrument item codes.

© 2026 Irma Dwi Kusuma. All Rights Reserved.
