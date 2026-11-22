// Answer checking. Pure functions (unit-tested in tests/unit/check.test.mjs).

const CONTRACTIONS = [
  [/\bwon't\b/g, "will not"],
  [/\bshan't\b/g, "shall not"],
  [/\bcan't\b/g, "cannot"],
  [/\bcan not\b/g, "cannot"],
  [/\bain't\b/g, "am not"],
  [/\b(\w+)n't\b/g, "$1 not"],
  [/\b(i|you|we|they|who)'ve\b/g, "$1 have"],
  [/\b(\w+)'ll\b/g, "$1 will"],
  [/\b(you|we|they|who)'re\b/g, "$1 are"],
  [/\bi'm\b/g, "i am"],
];

/** Normalise a typed answer for comparison. */
export function normalize(s) {
  let t = String(s ?? "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/[‘’ʼ`´]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/\s*\/\s*/g, "/")
    .trim();
  for (const [re, rep] of CONTRACTIONS) t = t.replace(re, rep);
  t = t
    .replace(/\s*([,.;:!?])\s*/g, "$1 ")
    .replace(/[.!?]+\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
  return t;
}

/** Is a typed answer accepted for one blank? accepted: string | string[] */
export function matchesAny(input, accepted) {
  const n = normalize(input);
  if (!n) return false;
  return [accepted].flat().some((a) => normalize(a) === n);
}

/**
 * Check a response against a question.
 * response shape per type:
 *   mcq: "a".."d"                     error: number (part)
 *   choice-fill: string[] per blank   type-fill: string[] per blank
 *   order: string[] tokens in order
 * Returns { correct: boolean, perBlank?: boolean[] }
 */
export function checkAnswer(q, response) {
  switch (q.type) {
    case "mcq": {
      const ok = [q.answer, ...(q.alsoCorrect || [])];
      return { correct: ok.includes(response) };
    }
    case "error": {
      if (Array.isArray(q.answer)) {
        const want = [...q.answer].map(Number).sort((a, b) => a - b).join(",");
        const got = [...(response || [])].map(Number).sort((a, b) => a - b).join(",");
        return { correct: want === got };
      }
      return { correct: Number(response) === Number(q.answer) };
    }
    case "choice-fill": {
      const per = q.answer.map((a, i) => [a].flat().includes(response?.[i]));
      return { correct: per.every(Boolean), perBlank: per };
    }
    case "type-fill": {
      const per = q.answer.map((a, i) => matchesAny(response?.[i], a));
      return { correct: per.every(Boolean), perBlank: per };
    }
    case "order": {
      const built = normalizeOrder((response || []).join(" "));
      const ok = [q.answer, ...(q.accept || [])].some((a) => normalizeOrder(a) === built);
      return { correct: ok };
    }
    default:
      throw new Error("Unknown question type: " + q.type);
  }
}

/** Word-order comparison ignores case and punctuation (chips carry no punctuation). */
export function normalizeOrder(s) {
  return normalize(String(s ?? "").replace(/[.,!?;:\u201c\u201d"]/g, " "));
}

/** Strip punctuation around a word (keeps inner apostrophes/hyphens). */
export function chipWord(w) {
  return String(w).replace(/^[\u201c"(]+|[.,!?;:\u201d")]+$/g, "");
}

/**
 * Chips for an order question: words of the main answer without punctuation, plus distractors.
 * The first word is lower-cased (so capitalisation does not give away the start) unless it is "I"
 * or q.keepFirstCase is set (proper noun).
 */
export function orderTokens(q) {
  const words = String(q.answer).trim().split(/\s+/).map(chipWord).filter(Boolean);
  if (words.length && !q.keepFirstCase && words[0] !== "I" && !/^I'/.test(words[0])) {
    words[0] = words[0].charAt(0).toLowerCase() + words[0].slice(1);
  }
  return [...words, ...(q.distractors || []).map(chipWord)];
}

/** Has the learner given a complete response (enables the Check button)? */
export function isComplete(q, response) {
  switch (q.type) {
    case "mcq":
      return typeof response === "string" && response.length > 0;
    case "error":
      return Array.isArray(q.answer) ? Array.isArray(response) && response.length > 0 : Number.isInteger(response);
    case "choice-fill":
      return Array.isArray(response) && q.answer.every((_, i) => typeof response[i] === "string");
    case "type-fill":
      return Array.isArray(response) && q.answer.every((_, i) => String(response[i] ?? "").trim().length > 0);
    case "order":
      return Array.isArray(response) && response.length > 0;
    default:
      return false;
  }
}
