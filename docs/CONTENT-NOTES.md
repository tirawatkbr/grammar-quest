# Content notes — differences from the sheet

All questions are transcribed from page images (not OCR). The sheet has no answer key
("Answer key on page 152" is not included), so every answer and explanation was written for this app
and checked by a second independent pass (`scripts/verify/*.json`, `node scripts/diff-answers.mjs`).

Exercise labels: `Ex.0` = the first, unnumbered "Exercise" of a chapter; `Ex.1`, `Ex.2` … as printed.

## Unit 1 — Parts of Speech (sheet chapter 1)
- Ex.0 (20), Ex.1 (15), Ex.2 (8), Ex.3 (30) — all items included.
- Ex.1: the sheet asks for the word form and the part of speech → two blanks (word, part of speech).
- Ex.3 #30: printed "In the morning, usually, Some days…" → changed the comma before "Some" to a full stop.
- Ex.3 #7: "their" is classified as an adjective (possessive adjective), following the sheet's own system
  (its pronoun table lists only mine/yours/theirs as possessive pronouns, and its worked example tags
  "this" and "some" before nouns as adjectives). The explanation mentions the other convention.
- Concept page typo "artcie" → "article".

## Unit 2 — Noun (sheet chapter 2)
- Ex.1 (10), Ex.2 (10), Ex.3 (10), Ex.4 (30), unnumbered Exercise "Ex.0" (20) — all items included.
- Ex.1 / Ex.2 ask learners to find one *or more* wrong nouns → multi-select error questions.
  Ex.1 underlines nothing in the sheet, so the tappable parts are the nouns of each sentence (wrong ones plus
  correct distractors). Ex.2 uses exactly the underlined nouns of the sheet.
- Ex.2 #10: only "yeasts" is wrong. "Many breads" (= many kinds of bread) is acceptable and agrees with "Many … are";
  the explanation says so.
- Ex.4 #4: "have difficulty (in) doing" — answer *difficulty*.
- Concept page: "two slides of bread" → corrected to "two slices of bread".

## Unit 3 — Article (sheet chapter 3)
- Ex.0 (20), Ex.1 (20), Ex.2 passage (22 blanks), Ex.3 passage (26 blanks), Ex.4 (30) — all included.
- Passages are split into questions by sentence; each question shows the previous sentence as context
  (with earlier blanks already filled), and the ref lists every blank it covers, e.g. `Ex.2 #3,4`.
- "-" (no article) in the sheet's options is shown as "— (no article)".
- Ex.1 asks for *the* when the noun is "defined by modifiers". Where natural English also allows a/an
  (#7 engineer, #13 agency), both are accepted and the explanation names the sheet's rule.
- Ex.1 #4: the sheet's question tag "didn't it" does not agree with "The questions" (should be "didn't they");
  the sentence is kept and a tip explains this.
- Ex.2 #6 ("one point on ___ grid") accepts a / the; Ex.3 #25 ("___ grocery store") accepts the / a.

## Unit 4 — Quantifier (sheet chapter 4)
- Ex.0 (20), Ex.1 (30), Ex.2 (15), Ex.3 (10), Ex.4 (30) — all included.
- Ex.1 (many/much + plural if needed) is a typed answer of the whole phrase, e.g. "many teeth".
  Countability follows the sheet's Noun chapter (accommodation, trouble, vocabulary → uncountable).
- Ex.0 #17 ("These children saw ___ people…") → *some*; *few* would need a negative context.

## All units — TOEIC answer positions
- `scripts/rebalance-toeic.mjs` spreads the correct letter of new TOEIC items across a–d (validator rejects
  any letter above 40 %). Sheet items keep the sheet's original order.

## Unit 5 — Pronoun (sheet chapter 5)
- Ex.0 (20), Ex.1 (10), Ex.2 (12), Ex.3 (15), Ex.4 (30) — all included.
- Ex.1 asks to write the pronoun above the underlined phrase → typed answer after "→".
  Gender-unspecified persons accept he/she, he or she, she/he (him/her likewise); spaces around "/" are ignored.
- Ex.2 #4 first blank accepts "her own" and "her".
- Ex.3 accepts both -one/-body forms (nobody / no one, anyone / anybody, everybody / everyone).
