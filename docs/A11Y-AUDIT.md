# Accessibility Audit: Grammar Quest (ทุกหน้าจอ)
**Standard:** WCAG 2.1 AA | **Date:** 2026-11-23 | **Method:** axe-core 4 (Playwright, Chromium) + automated layout/keyboard checks + WebKit smoke test + manual screenshot review (375px light, 1280px dark)

### Summary
**Issues found:** 0 open | **Critical:** 0 | **Major:** 0 | **Minor:** 0
Automated suite: `node tests/e2e/run.mjs --full` → **1504 passed, 0 failed** (includes playing all 1374 questions of the 14 units through the real UI).

Issues found and fixed during the build (kept here as a record):
| # | Issue | WCAG | Severity | Fix |
|---|-------|------|----------|-----|
| 1 | Settings switch hit area smaller than 44×44px | 2.5.5 | 🟡 Major | Switch label wraps the whole row; min-height 44px |
| 2 | Skip link stole focus on first load in tests; route changes left focus on old link | 2.4.3 | 🟡 Major | First load keeps natural focus (Tab → skip link); each route change moves focus to the page `h1` |
| 3 | Summary tables caused horizontal scroll at 320px | 1.4.10 | 🟡 Major | Tables below 600px stack into labelled rows (`data-label`) |
| 4 | Passage prompts showed "(1)" printed text and a numbered blank side by side (unit 13) | 1.3.1 | 🟢 Minor | Removed the printed numbers; blanks keep their own numbers, which match the inputs "ช่องที่ 1…" |

### Findings by principle
#### Perceivable
| Check | WCAG | Result |
|-------|------|--------|
| Icons are inline SVG: decorative ones `aria-hidden`, icon-only buttons have `aria-label` | 1.1.1 | ✅ axe 0 violations |
| Headings, lists, `<main>`/`<nav>` landmarks, radio-group for choices, `<dialog>` for summary | 1.3.1 | ✅ |
| Text contrast ≥ 4.5:1 in both themes (table below) | 1.4.3 | ✅ 52/52 pairs |
| Text resize 200% (root font-size) with no horizontal scroll at 320 / 375 / 768 / 1280px | 1.4.4 | ✅ |
| Reflow: no horizontal scroll at 320px on every route, including lessons | 1.4.10 | ✅ |
| Non-text contrast ≥ 3:1 for borders, focus ring, progress bar, status icons | 1.4.11 | ✅ |
| Right/wrong never shown by colour alone: icon + text ("คำตอบของคุณ", "คำตอบที่ถูก", "ยังไม่ถูก") | 1.4.1 | ✅ |

#### Operable
| Check | WCAG | Result |
|-------|------|--------|
| Whole lesson playable by keyboard: Tab, 1–4 / arrows select, Enter checks and continues, Esc closes dialogs | 2.1.1 | ✅ e2e `keyboard` |
| No keyboard trap; `<dialog>` returns focus to its opener | 2.1.2 | ✅ |
| Skip link to main content | 2.4.1 | ✅ |
| Focus order follows visual order; feedback panel title receives focus after "ตรวจคำตอบ" | 2.4.3 | ✅ |
| Visible focus ring (2px `--focus`, 6:1 or more) | 2.4.7 | ✅ |
| Touch targets ≥ 44×44px on every route at 320–1280px | 2.5.5 | ✅ e2e `layout` |
| No time limits: the optional TOEIC Mix timer only counts up (off by default) | 2.2.1 | ✅ |
| `prefers-reduced-motion` disables slide/scale animation | 2.3.3 (AAA, extra) | ✅ |

#### Understandable
| Check | WCAG | Result |
|-------|------|--------|
| `<html lang="th">`; English prompts and choices marked `lang="en"` | 3.1.1 / 3.1.2 | ✅ |
| Same navigation in the same place on every screen (bottom nav on mobile, side nav ≥1024px) | 3.2.3 | ✅ |
| Sync-code error text below the field, `aria-invalid` + `aria-describedby` | 3.3.1 | ✅ e2e `sync` |
| Every typed blank has a visible label ("ช่องที่ 1") | 3.3.2 | ✅ |

#### Robust
| Check | WCAG | Result |
|-------|------|--------|
| Choices are `role="radio"` with `aria-checked`; word chips are `<button>`s in a labelled group ("คลังคำ") and every add/remove is announced by a polite live region | 4.1.2 | ✅ |
| Feedback panel is a labelled `region` whose title receives focus (so it is read at once); toasts are `role="status"` | 4.1.3 | ✅ |
| Works in WebKit (Safari engine) | — | ✅ e2e `webkit` |

### Keyboard Navigation
| Element | Tab Order | Enter/Space | Escape | Arrow Keys / digits |
|---------|-----------|-------------|--------|---------------------|
| Skip link | 1st | Jump to `<main>` | — | — |
| Answer choices (radio group) | one tab stop | Select | — | ↑↓ / 1–4 move selection |
| ตรวจคำตอบ / ต่อไป | after answers | Check / next | — | — |
| Word chips (order) | each chip | Add / remove word | — | — |
| Summary dialog | inside dialog | Activate | Close, focus returns | — |
| Close lesson (✕) | first in lesson | Confirm dialog | Cancel | — |

### Screen Reader (expected announcements, from DOM roles/names)
| Element | Announced As | Issue |
|---------|-------------|-------|
| Choice | "with, in, radio button, 1 of 4, not checked" | none |
| Hearts | "หัวใจ 5 จาก 5 ดวง" | none |
| Feedback | focus moves to title: "ยังไม่ถูก, heading level 2", then the region reads the answer and reason | none |
| Blank input | "ช่องที่ 1, edit text" | none |
Manual testing with real NVDA / VoiceOver was not possible in this session; the table is derived from roles and names checked by axe and the tests.

### Usability walkthrough (USER-RESEARCH.md §8)
| Task | Result | Evidence |
|------|--------|----------|
| T1 Start first lesson | ✅ 1 tap ("เริ่มเรียน" on Home goes straight to the lesson) | `smoke`, home.js |
| T2 Answer wrong and understand | ✅ Feedback shows correct answer, reason, why the chosen option is wrong; "ดูสรุปกฎ" opens a dialog without leaving the lesson; wrong item returns at the end | `lessonFlow` |
| T3 Review | ✅ Wrong item appears in Review (box 1); correct answer moves it to box 2 and gives back one heart | `lessonFlow` |
| T4 Keyboard only | ✅ | `keyboard` |
| T5 Sync | ✅ Export code → clear data → import → XP and lessons restored; bad code shows an error next to the field | `sync` |

Hypotheses: H1 ✅ (1 tap). H3 ✅ (out-of-hearts screen points to Review, and unlimited-hearts practice mode exists). H2 and H4 need a real learner to confirm.

### Color Contrast Check

## light
| Foreground | Background | Ratio | Required | Pass |
|---|---|---|---|---|
| body text on page: --text #1c1917 | --bg #fafaf9 | 16.74:1 | 4.5:1 | ✅ |
| body text on card: --text #1c1917 | --surface #ffffff | 17.49:1 | 4.5:1 | ✅ |
| muted text on page: --text-muted #57534e | --bg #fafaf9 | 7.30:1 | 4.5:1 | ✅ |
| muted text on card: --text-muted #57534e | --surface #ffffff | 7.63:1 | 4.5:1 | ✅ |
| muted text on sunken surface: --text-muted #57534e | --surface-2 #f5f5f4 | 6.99:1 | 4.5:1 | ✅ |
| text on sunken surface: --text #1c1917 | --surface-2 #f5f5f4 | 16.03:1 | 4.5:1 | ✅ |
| primary button label: --on-primary #ffffff | --primary #3730a3 | 9.93:1 | 4.5:1 | ✅ |
| link / primary text on card: --primary #3730a3 | --surface #ffffff | 9.93:1 | 4.5:1 | ✅ |
| link / primary text on page: --primary #3730a3 | --bg #fafaf9 | 9.51:1 | 4.5:1 | ✅ |
| selected option text: --primary #3730a3 | --primary-soft #eef2ff | 8.88:1 | 4.5:1 | ✅ |
| correct feedback text: --success #15803d | --success-soft #f0fdf4 | 4.79:1 | 4.5:1 | ✅ |
| wrong feedback text: --danger #b91c1c | --danger-soft #fef2f2 | 5.91:1 | 4.5:1 | ✅ |
| success text on card: --success #15803d | --surface #ffffff | 5.02:1 | 4.5:1 | ✅ |
| danger text on card: --danger #b91c1c | --surface #ffffff | 6.47:1 | 4.5:1 | ✅ |
| warning text on card: --warning #a14a08 | --surface #ffffff | 6.00:1 | 4.5:1 | ✅ |
| tip text on tip box: --warning #a14a08 | --warning-soft #fffbeb | 5.79:1 | 4.5:1 | ✅ |
| button label on success: --on-success #ffffff | --success #15803d | 5.02:1 | 4.5:1 | ✅ |
| button label on danger: --on-danger #ffffff | --danger #b91c1c | 6.47:1 | 4.5:1 | ✅ |
| heart icon (non-text): --heart #dc2626 | --surface #ffffff | 4.83:1 | 3:1 | ✅ |
| streak icon (non-text): --streak #c2410c | --surface #ffffff | 5.18:1 | 3:1 | ✅ |
| xp icon (non-text): --xp #a16207 | --surface #ffffff | 4.92:1 | 3:1 | ✅ |
| input/option border (non-text): --border-strong #8a8380 | --surface #ffffff | 3.72:1 | 3:1 | ✅ |
| input/option border on page (non-text): --border-strong #8a8380 | --bg #fafaf9 | 3.57:1 | 3:1 | ✅ |
| focus ring on card (non-text): --focus #4f46e5 | --surface #ffffff | 6.29:1 | 3:1 | ✅ |
| focus ring on page (non-text): --focus #4f46e5 | --bg #fafaf9 | 6.02:1 | 3:1 | ✅ |
| progress fill vs track (non-text): --primary #3730a3 | --track #e7e5e4 | 7.91:1 | 3:1 | ✅ |

## dark
| Foreground | Background | Ratio | Required | Pass |
|---|---|---|---|---|
| body text on page: --text #f5f5f4 | --bg #0c0a09 | 18.11:1 | 4.5:1 | ✅ |
| body text on card: --text #f5f5f4 | --surface #1c1917 | 16.03:1 | 4.5:1 | ✅ |
| muted text on page: --text-muted #a8a29e | --bg #0c0a09 | 7.83:1 | 4.5:1 | ✅ |
| muted text on card: --text-muted #a8a29e | --surface #1c1917 | 6.93:1 | 4.5:1 | ✅ |
| muted text on sunken surface: --text-muted #a8a29e | --surface-2 #292524 | 6.01:1 | 4.5:1 | ✅ |
| text on sunken surface: --text #f5f5f4 | --surface-2 #292524 | 13.90:1 | 4.5:1 | ✅ |
| primary button label: --on-primary #1e1b4b | --primary #a5b4fc | 8.02:1 | 4.5:1 | ✅ |
| link / primary text on card: --primary #a5b4fc | --surface #1c1917 | 8.77:1 | 4.5:1 | ✅ |
| link / primary text on page: --primary #a5b4fc | --bg #0c0a09 | 9.91:1 | 4.5:1 | ✅ |
| selected option text: --primary #a5b4fc | --primary-soft #1e1b4b | 8.02:1 | 4.5:1 | ✅ |
| correct feedback text: --success #4ade80 | --success-soft #052e16 | 8.55:1 | 4.5:1 | ✅ |
| wrong feedback text: --danger #f87171 | --danger-soft #450a0a | 5.84:1 | 4.5:1 | ✅ |
| success text on card: --success #4ade80 | --surface #1c1917 | 10.04:1 | 4.5:1 | ✅ |
| danger text on card: --danger #f87171 | --surface #1c1917 | 6.32:1 | 4.5:1 | ✅ |
| warning text on card: --warning #fbbf24 | --surface #1c1917 | 10.48:1 | 4.5:1 | ✅ |
| tip text on tip box: --warning #fbbf24 | --warning-soft #422006 | 8.73:1 | 4.5:1 | ✅ |
| button label on success: --on-success #052e16 | --success #4ade80 | 8.55:1 | 4.5:1 | ✅ |
| button label on danger: --on-danger #450a0a | --danger #f87171 | 5.84:1 | 4.5:1 | ✅ |
| heart icon (non-text): --heart #f87171 | --surface #1c1917 | 6.32:1 | 3:1 | ✅ |
| streak icon (non-text): --streak #fb923c | --surface #1c1917 | 7.73:1 | 3:1 | ✅ |
| xp icon (non-text): --xp #facc15 | --surface #1c1917 | 11.42:1 | 3:1 | ✅ |
| input/option border (non-text): --border-strong #8a8380 | --surface #1c1917 | 4.70:1 | 3:1 | ✅ |
| input/option border on page (non-text): --border-strong #8a8380 | --bg #0c0a09 | 5.30:1 | 3:1 | ✅ |
| focus ring on card (non-text): --focus #a5b4fc | --surface #1c1917 | 8.77:1 | 3:1 | ✅ |
| focus ring on page (non-text): --focus #a5b4fc | --bg #0c0a09 | 9.91:1 | 3:1 | ✅ |
| progress fill vs track (non-text): --primary #a5b4fc | --track #44403c | 5.15:1 | 3:1 | ✅ |

all pairs pass

### Priority Fixes
None open. Recommended next steps:
1. **Test with a real screen reader** (TalkBack on Android, VoiceOver on iPhone) — confirms the announcements above.
2. **Test with the real learner** for H2 (explanations understood without opening the summary) and H4 (sync by themselves).
