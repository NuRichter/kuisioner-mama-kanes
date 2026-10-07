# Kuisioner Mama Kanes — Design System

> Single source of truth for the visual language of the questionnaire web app.
> Tokens live in `src/app/globals.css`; this document explains what they are for.

**Design read:** an academic research questionnaire for Indonesian Gen Z prospective investors (born 1997 to 2012), filled mostly on phones, in one sitting of about 11 to 13 minutes. Trust-first, calm, editorial-functional language, built with Tailwind tokens, Geist, and restrained CSS motion.

**Taste dials:** `DESIGN_VARIANCE 4` · `MOTION_INTENSITY 3` · `VISUAL_DENSITY 4`.
Low variance because orientation matters more than surprise, low motion because the respondent is reading, and medium density because 53 statements must not feel endless.

## Design Philosophy

The questionnaire is the product. Everything else gets out of its way.

1. **Reading first.** Every statement is a sentence the respondent must read carefully (the instrument asks for it explicitly). Type size, line length and contrast are tuned for reading, not for scanning.
2. **One signature, used consistently.** The five-point *scale ruler* is the only visually distinctive component. It appears 53 times, so it carries the identity instead of decoration.
3. **Neutral toward the subject.** The research measures trust in Bareksa, finfluencers and a robo advisor. The UI must not look like Bareksa, a fintech app, or an advertisement, so the palette and tone stay independent and academic.
4. **Honest state.** Progress, saving and errors always reflect real state. Nothing is shown that is not true.

## User Experience Principles

- **Section-based pages.** One page per instrument section (A, konfirmasi, B, C to K). Sections are semantic units in the source and the instructions are written per section, so splitting further would separate instructions from statements. Single-statement screens would mean around 70 taps of "next".
- **Instructions stay with their statements.** Each Likert page opens with the section instruction in a quiet note block.
- **Answer anywhere, validate on leave.** Errors appear only when the respondent tries to continue, inline at the exact item, and focus moves to the first missing item.
- **Gentle guidance on Likert pages.** After the first answer on a statement, the next statement scrolls into view only if it is not already visible. Reduced-motion users get an instant jump.
- **Recoverable.** Answers save to the device after every change. Refresh restores the exact step. "Mulai ulang" asks for confirmation before erasing.
- **Browser back works.** Each step pushes a history entry (`#A`, `#E`, `#review`), so the device back button moves between sections instead of leaving the site.
- **Stopping is respectful.** Declining consent or failing eligibility ends the session with a calm explanation, nothing is sent, and the respondent may correct a mistaken answer.

## Visual Direction

Cool stone paper, ink text, a single pine-green accent. Hairlines instead of boxes. Left-aligned editorial typography. A sticky left rail on wide screens shows the full route through the questionnaire; on phones the route collapses into the segmented progress strip under the header.

## Color Tokens

| Token | Light | Dark | Use |
|---|---|---|---|
| `--paper` | `#F3F4F1` | `#101312` | Page background |
| `--surface` | `#FBFBFA` | `#171B1A` | Raised surfaces: inputs, scale ruler, dialogs |
| `--ink` | `#15191B` | `#E7ECEA` | Primary text |
| `--ink-soft` | `#454D52` | `#BCC5C1` | Body copy, instructions |
| `--muted` | `#5E676C` | `#94A09B` | Metadata, helper text (≥ 4.5:1 on paper) |
| `--line` | `#D9DDD8` | `#2A302E` | Hairlines, dividers |
| `--line-strong` | `#858D88` | `#68736E` | Control borders (≥ 3:1 against surface) |
| `--accent` | `#1F5C4E` | `#7CC7AF` | Pine. Selected state, primary button, focus ring, progress |
| `--accent-ink` | `#F5F8F6` | `#0D1A16` | Text on accent |
| `--accent-wash` | `#E2ECE7` | `#1A2B26` | Hover and selected backgrounds of option rows |

No gradients. No pure `#000` or `#fff`. One accent, locked across the whole app.

## Semantic Colors

| Token | Light | Dark | Use |
|---|---|---|---|
| `--danger` | `#A1352A` | `#F08F80` | Error text, error marker |
| `--danger-wash` | `#F6E7E4` | `#2C1A17` | Error note background |
| `--success` | `= --accent` | `= --accent` | Completion uses the accent; there is no second green |

Errors never rely on color alone: each carries an icon and a sentence.

## Typography

- **Family:** Geist (variable, via `next/font`), one family for everything. Chosen for clear Latin forms at small sizes, open apertures for Indonesian text, and real tabular figures for the scale numbers.
- **Numerals:** `font-variant-numeric: tabular-nums` on scale numbers, progress counts and item numbers.
- **Headings:** weight 600, `letter-spacing: -0.015em`, `text-wrap: balance`.
- **Body:** weight 400, `line-height: 1.65`, `text-wrap: pretty`, max 66ch.
- **Emphasis:** weight, never a second family, never gradient text.

## Type Scale

| Role | Size / line-height | Weight |
|---|---|---|
| Display (intro title) | `clamp(1.75rem, 1.2rem + 2.4vw, 2.6rem)` / 1.12 | 600 |
| Section title | `clamp(1.375rem, 1.1rem + 1.2vw, 1.75rem)` / 1.2 | 600 |
| Statement | `1.0625rem` (17px) / 1.55 | 450 |
| Body | `1rem` / 1.65 | 400 |
| Small / meta | `0.875rem` / 1.5 | 500 |
| Scale label | `0.6875rem` to `0.75rem` / 1.25 | 500 |

## Spacing

4px base. Tokens used: 4, 8, 12, 16, 20, 24, 32, 40, 56, 72, 96.
Statement to statement: 40px on mobile, 48px on desktop. Section header to first statement: 40px. Page side gutter: 20px mobile, 32px tablet.

## Layout

- **Mobile (< 1024px):** single column, sticky header (56px) with the segmented progress strip directly beneath.
- **Desktop (≥ 1024px):** two columns: a 240px sticky route rail on the left, the reading column on the right. The rail is the only asymmetry and exists for orientation.

## Container

Reading column max width `42rem` (672px). Shell max width `68rem`. Never full-bleed text.

## Grid

`grid-template-columns: 15rem minmax(0, 42rem)` with a 64px gap on desktop. The intro information list uses `9rem 1fr` term/definition columns from 640px up, stacked below.

## Radius

One documented system:
- Controls (buttons, inputs, option rows, scale ruler): **10px**.
- Overlays (dialog): **14px**.
- Progress ticks: **2px**.
No pills. No fully rounded buttons.

## Borders

1px hairlines (`--line`) separate regions. Controls use `--line-strong`. Selected controls switch the border to `--accent`. Statement lists are separated by space, not by rules.

## Elevation

Flat by default. Only the dialog has a shadow: `0 24px 48px -12px rgb(16 32 28 / 0.25)`. The sticky header uses a background plus a hairline, never a shadow.

## Buttons

| Variant | Look | Use |
|---|---|---|
| Primary | Accent fill, `--accent-ink` text, 48px tall, 20px horizontal padding | One per screen: the forward action |
| Secondary | Transparent, `--line-strong` border, ink text | "Kembali", "Ubah jawaban" |
| Quiet | Text only, underline on hover | Header "Mulai ulang", review "Ubah" links |

Labels are specific: "Lanjut ke Bagian F", "Kirim jawaban", never a bare "Next". Pressed state `translateY(1px)`. Busy state keeps the button enabled-looking with text "Mengirim…" and `aria-busy`.

## Form Controls

- **Option rows** (radio and checkbox): full-width rows, 52px minimum height, the whole row is the label (no dead zones). Selected: `--accent` border, `--accent-wash` background, filled indicator.
- **Yes/No:** two option rows side by side ("Ya", "Tidak"), each at least 48px tall.
- **Text and year inputs:** 48px tall, `--surface` fill, label above, helper text below, error below helper.
- **"Lainnya" text fields** appear directly under their option only when that option is selected, and receive focus when revealed.
- **Province:** free text as in the source, with a native `datalist` of the 38 provinces to reduce typos.

## Question Components

- **Form question:** number (`A4`) in muted tabular figures above the question text, then the controls.
- **Likert statement:** item number within the section (`01`), statement text, then the **scale ruler**: five joined segments in one 10px-radius frame, each showing the number (tabular, 1rem) above its label (0.6875rem). Under 360px wide the labels stay but wrap to up to three lines; the ruler never scrolls horizontally. Implemented as a native radio group inside `fieldset`/`legend`.
- **Item codes** (FC_EXP1 etc.) are never shown to respondents.

## Progress

- **Segmented strip:** one tick per step (intro to review, 14 ticks). Completed ticks are accent, the current tick is accent with full height, future ticks are `--line`. It encodes real position, not a percentage estimate.
- **Statement count:** on Likert steps the header shows `23/53 pernyataan`, counted from actual answers.
- **Route rail (desktop):** every step listed with its letter and title; completed steps show a check icon, the current step is ink and bold, unreachable steps are muted and not clickable.

## Navigation

Bottom of each page: secondary "Kembali" on the left, primary forward action on the right. On phones both span the width in one row (secondary 40%, primary 60%). The rail and review page allow jumping to any already-reached step.

## Validation

Validation runs on "Lanjut". Each missing or invalid field shows an inline message under the control, linked via `aria-describedby` and `aria-invalid`. A polite live region above the buttons states the count ("Ada 3 pernyataan yang belum dijawab."). Focus moves to the first invalid field.

## Error States

Inline: danger text plus `CircleAlert` icon, a 2px danger marker on the left of the affected statement. Submission errors: a danger-wash note above the submit button with the reason and a retry; answers stay on the device.

## Success States

After a successful submit: a calm completion page with the source closing sentence. Saved progress is cleared from the device.

## Loading States

The only async action is submission. The submit button shows "Mengirim…" with `aria-busy="true"`. The page shell is static HTML, so there is no page-level skeleton.

## Result States

The source instrument defines no respondent-facing score or interpretation, so there is no result screen. Attention-check and longstring indicators are computed only in the researcher CSV export.

## Motion

| Motion | Spec | Purpose |
|---|---|---|
| Step change | opacity 0 → 1, translateY 6px → 0, 220ms `cubic-bezier(0.2, 0.7, 0.2, 1)` | Signals a new page |
| Scale selection | background and color 140ms | Confirms the answer was recorded |
| Next statement scroll | smooth scroll when next statement is off-screen | Keeps rhythm on long sections |
| Dialog | opacity and scale 0.98 → 1, 160ms | Orientation |

All motion is disabled under `prefers-reduced-motion: reduce`. Only `transform`, `opacity`, `background-color`, `border-color` and `color` transition; never `all`.

## Responsive Rules

Verified at 320, 375, 390, 430, 768, 1024, 1280 and 1440px.
- No horizontal page scroll at any width.
- Touch targets ≥ 44px; scale segments ≥ 52px tall.
- `min-height: 100dvh`, safe-area padding in the header and footer.
- The route rail appears from 1024px; below that, the progress strip carries orientation.

## Accessibility

- `lang="id"`, skip link to main content, one `h1` per screen, sections use `h2`.
- Radio groups in `fieldset` with `legend`; every input has a visible `label`.
- Visible focus: 2px accent outline with 2px offset via `:focus-visible`.
- Contrast: body text ≥ 7:1, muted ≥ 4.5:1, control borders ≥ 3:1, in both themes.
- Brand names and codes use `translate="no"`.
- Destructive reset uses a native `<dialog>` with a confirmation button.

## Anti-Slop Rules

- No gradients, glass, glow, blobs, or decorative shapes.
- No cards around every question; space and hairlines do the grouping.
- No badges, pills, fake metrics, or invented counts. The only numbers shown are real (duration from the source, statement counts, step position).
- No eyebrow labels above headlines, except the functional section letter on question pages ("Bagian E · 12 pernyataan"), which carries real position information.
- No em dashes in UI copy. Copy is plain Indonesian, second person, active voice.
- No author profile, no institutional badge. The author appears once, in the footer.

## Do

- Keep the statement text the largest thing on a Likert page after the section title.
- Use the source wording verbatim, including "(pengisian dihentikan)" on stopping options.
- Use specific button labels that name the next section.
- Test both color schemes.

## Don't

- Don't show item codes, D/A/S tags, colors from the source legend, or researcher notes.
- Don't add a second accent color or a second radius scale.
- Don't animate on page load beyond the step fade.
- Don't add analytics or third-party scripts.
- Don't make the author or the institution a visual element.
