# PROGRESS — Grammar Quest (overnight build log)

Plan: `C:\Users\trw_k\.claude\plans\staged-booping-cherny-of-b50cfd52-7d75-4d98-9ec0-5abd3f2b1d5c.md`
Rule: the source folder `OneDrive\Desktop\M.4` is READ-ONLY (only the PDFs are read).

## Phases
- [x] Phase 0 — setup, memory, page images rendered (125 pages, scratchpad), pymupdf installed
- [x] Phase 1 — docs: USER-RESEARCH, DESIGN-SYSTEM, A11Y-CHECKLIST
- [x] Phase 2 — engine (router, 5 question types, XP/level/streak/hearts/Leitner, sync code, Firebase-ready, PWA)
- [ ] Phase 3 — content (per unit: images read → inventory → data → summary → answers+explanations → second pass → TOEIC items → validate)
- [ ] Phase 4 — deploy (GitHub Pages via Actions)
- [ ] Phase 5 — full verification + A11Y-AUDIT

## Units
| Unit | Sheet ch. | Topic | Status | Sheet items | TOEIC items |
|------|-----------|-------|--------|-------------|-------------|
| u01 | 1 | Parts of Speech | ✅ done (validate, diff, full UI play) | 73 | 15 |
| u02 | 2 | Noun | ✅ done (validate, diff, full UI play) | 80 | 15 |
| u03 | 3 | Article | ✅ done (validate, diff, full UI play) | 118 blanks in 89 questions | 15 |
| u04 | 4 | Quantifier | ✅ done (validate, diff, full UI play) | 105 | 15 |
| u05 | 5 | Pronoun | ✅ done (validate, diff, full UI play) | 87 | 15 |
| u06 | 6 | Subject-Verb Agreement | ✅ done (validate, diff, full UI play) | 113 | 15 |
| u07 | 7 | Present Tenses | ✅ done (validate, diff, full UI play) | 75 items | 15 |
| u08 | 8 | Past Tenses | ✅ done (validate, diff, full UI play) | 75 items | 15 |
| u09 | 9 | Future Tenses | ✅ done (validate, diff, full UI play) | 71 items | 15 |
| u10 | 10 | Passive Voice | ⏳ | | |
| u11 | 11 | Conditional Sentence | ⏳ | | |
| u12 | 12 | Non-finite Verb | ⏳ | | |
| u13 | 13 | Modal Verb | ⏳ | | |
| u14 | 18 | Preposition | ⏳ | | |

## Per-unit checklist
1. Read every page image of the chapter
2. `scripts/inventory/uNN.json` (exercise item counts from images)
3. `site/data/uNN.js` — transcription + summary cards + answers + Thai explanations + whyWrong
4. `scripts/verify/uNN.json` second pass → `node scripts/diff-answers.mjs uNN`
5. `node scripts/build-manifest.mjs && node scripts/validate.mjs`
6. `node tests/e2e/run.mjs --full --only=renderAll`
7. `node scripts/build-sw.mjs`, commit, push

## Decisions log
- Underline markup `__x__` only matches exactly two underscores, so "___" can be used for blanks in explanations.
- First page load keeps natural focus (Tab → skip link); route changes move focus to the h1.
- Tables in summary cards stack into labelled rows below 600px (no horizontal scrolling).

## Stopped here (usage limit) — next steps
- Units u10 Passive (ch10), u11 Conditional (ch11), u12 Non-finite (ch12), u13 Modal (ch13), u14 Preposition (ch18): follow the per-unit checklist.
- Then Phase 5: full e2e + axe run, screenshots review at 375/1280 light/dark, write docs/A11Y-AUDIT.md.
