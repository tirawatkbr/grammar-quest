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

## Unit 6 — Subject-Verb Agreement (sheet chapter 6)
- Ex.0 (20), Ex.1 (40), Ex.2 Text A (12 underlined verbs, 6 errors), Text B (11 underlined verbs, 6 errors), Ex.3 (30).
- Ex.2 texts are split into sentence groups (multi-select). Sentences without an error are merged into a
  neighbouring group so every question has at least one error; refs list the underlined verbs it covers.
- Ex.3 #2 / #11 follow the sheet's formal agreement (Each … his, anyone … he); the explanation notes this.
- Ex.3 #21: the sheet's typo "perfom" → "perform".

## Unit 7 — Present Tenses (sheet chapter 7)
- Ex.0 (20), Ex.1 (5 dialogues, 23 blanks), Ex.2 (10 items, 21 blanks), Ex.3 (10), Ex.4 (30) — all included.
- Ex.1: question words that split the verb ("What ___ you (do) ___") are separate blanks (auxiliary + main verb).
- Ex.1 #3: sheet typo "umbreaella" → "umbrella".
- Ex.0 #11 accepts *agree* (stative, present state) and *have agreed* (just reached agreement).
- Ex.2 #4 accepts have been suffering / have suffered; #6 accepts have been running / have run and have gained / gained.

## Unit 8 — Past Tenses (sheet chapter 8)
- Ex.0 (20), Ex.1 (10), Ex.2 (15 items; #15 is a 10-blank paragraph), Ex.3 (30) — all included.
- Ex.0 #2 ("My friends usually ___ in the park"): no present-simple option; *walked* (past habit) is the only workable choice.
- Ex.1 #9 accepts was taking / took; #10 accepts was distracting / distracted.
- Ex.2 #2 accepts had already got / gotten / been infected; British/American spellings accepted (realised, learnt, recognised).
- Ex.2 #8 keeps the sheet's wording "go through with her again".
- Ex.3 #10: sheet "oceanliner" → "ocean liner".

## Unit 9 — Future Tenses (sheet chapter 9)
- Ex.0 (20), Ex.1 (5), Ex.2 (6 combine-sentence items as word-order questions with distractor words), Ex.3 (10), Ex.4 (30).
- Word-order checking ignores case and punctuation; chips carry no punctuation and the first word is lower-cased.
- Ex.0 #16 accepts will be seeing / is seeing.
