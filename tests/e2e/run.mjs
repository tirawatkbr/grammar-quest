// End-to-end + accessibility checks with Playwright and axe-core.
// Tooling lives outside the repo (node_modules not committed):
//   GQ_TOOLS=C:/Users/trw_k/gq-tools  (npm i -D playwright @axe-core/playwright there)
// Usage: node tests/e2e/run.mjs [baseUrl] [--full] [--only=name,name]
//   --full  plays EVERY question of EVERY lesson through the UI with the stored answer.
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs";

const TOOLS = process.env.GQ_TOOLS || "C:/Users/trw_k/gq-tools";
const require = createRequire(path.join(TOOLS, "package.json"));
const { chromium, webkit, devices } = require("playwright");
const AxeBuilder = require("@axe-core/playwright").default;

const args = process.argv.slice(2);
const BASE = args.find((a) => a.startsWith("http")) || "http://127.0.0.1:8765/";
const FULL = args.includes("--full");
const ONLY = (args.find((a) => a.startsWith("--only=")) || "").slice(7).split(",").filter(Boolean);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1")), "../..");

// ---------- content ----------
const { UNITS } = await import(pathToFileURL(path.join(ROOT, "site/data/units.js")).href);
const unitData = {};
for (const u of UNITS) unitData[u.id] = (await import(pathToFileURL(path.join(ROOT, "site/data", u.file)).href)).default;
const qById = new Map();
for (const u of Object.values(unitData)) for (const l of u.lessons) for (const q of l.questions) qById.set(q.id, q);
const LETTERS = ["a", "b", "c", "d", "e"];
const { orderTokens: orderTokensNode } = await import(pathToFileURL(path.join(ROOT, "site/js/check.js")).href);

let failures = 0;
let passes = 0;
const results = [];
function ok(name, cond, detail = "") {
  if (cond) passes++;
  else {
    failures++;
    console.log(`  ✖ ${name} ${detail}`);
  }
  return cond;
}

async function newPage(browser, opts = {}) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    serviceWorkers: opts.sw ? "allow" : "block",
    colorScheme: opts.theme || "light",
    reducedMotion: "reduce",
    ...opts.ctx,
  });
  const page = await ctx.newPage();
  page.errors = [];
  page.on("pageerror", (e) => page.errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && !/favicon/.test(m.text()) && page.errors.push(m.text()));
  return { ctx, page };
}

async function setState(page, mutate) {
  await page.evaluate((src) => {
    const s = JSON.parse(localStorage.getItem("gq.v1") || "null") || {};
    const fn = new Function("s", src);
    fn(s);
    localStorage.setItem("gq.v1", JSON.stringify(s));
  }, mutate);
  await page.reload(); // the app keeps state in memory; reload to pick up the change
  await page.waitForSelector("h1");
}

async function getState(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("gq.v1") || "null"));
}

/** Answer the question currently shown. correct=false → pick a wrong answer. */
async function answer(page, correct = true) {
  const qid = await page.getAttribute("[data-qid]", "data-qid");
  const q = qById.get(qid);
  if (!q) throw new Error("unknown qid " + qid);
  switch (q.type) {
    case "mcq": {
      let idx = LETTERS.indexOf(q.answer);
      if (!correct) idx = LETTERS.findIndex((k, i) => i < q.choices.length && k !== q.answer && !(q.alsoCorrect || []).includes(k));
      await page.locator(".choice").nth(idx).click();
      break;
    }
    case "choice-fill": {
      const groups = page.locator(".blank-group [role=radiogroup]");
      for (let b = 0; b < q.answer.length; b++) {
        const opts = q.optionsPerBlank ? q.optionsPerBlank[b] : q.options;
        const good = [q.answer[b]].flat();
        const pick = correct || b > 0 ? good[0] : opts.find((o) => !good.includes(o));
        const i = opts.indexOf(pick);
        await groups.nth(b).locator("button").nth(i).click();
      }
      break;
    }
    case "type-fill": {
      const inputs = page.locator("input.input");
      for (let b = 0; b < q.answer.length; b++) await inputs.nth(b).fill(correct || b > 0 ? [q.answer[b]].flat()[0] : "zzz");
      break;
    }
    case "error": {
      const ans = [q.answer].flat().map(Number);
      let picks = ans;
      if (!correct) {
        const total = await page.locator(".spot").count();
        const other = [...Array(total)].map((_, i) => i + 1).find((n) => !ans.includes(n));
        picks = other ? [other] : ans.slice(0, Math.max(1, ans.length - 1));
      }
      for (const n of picks) await page.locator(".spot", { hasText: `(${n})` }).first().click();
      break;
    }
    case "order": {
      const words = orderTokensNode(q).slice(0, q.answer.trim().split(/\s+/).length);
      if (!correct) words.reverse();
      for (const w of words) {
        await page
          .locator(".chips[aria-label='คลังคำ'] button:not(:disabled)")
          .filter({ hasText: new RegExp(`^${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`) })
          .first()
          .click();
      }
      break;
    }
  }
  await page.click("#check-btn");
  await page.waitForSelector(".feedback");
  const isCorrect = await page.locator(".feedback.is-correct").count();
  return { qid, q, correctShown: isCorrect > 0 };
}

async function next(page) {
  await page.locator(".feedback .btn", { hasText: "ต่อไป" }).click();
}

/** Play a whole lesson; wrongIds = set of qids to answer wrong once. Returns stats. */
async function playLesson(page, lessonId, { wrongOnce = new Set(), expectAllCorrect = true } = {}) {
  await page.goto(BASE + "#/lesson/" + lessonId);
  await page.waitForSelector("[data-qid]");
  const seenWrong = new Set();
  let steps = 0;
  while (true) {
    if (await page.locator("h1:has-text('จบบทเรียน'), h1:has-text('ยอดเยี่ยม')").count()) break;
    const qid = await page.getAttribute("[data-qid]", "data-qid");
    const wrong = wrongOnce.has(qid) && !seenWrong.has(qid);
    if (wrong) seenWrong.add(qid);
    const r = await answer(page, !wrong);
    if (expectAllCorrect) ok(`answer accepted ${r.qid}`, r.correctShown === !wrong, `type=${r.q.type}`);
    await next(page);
    if (++steps > 60) throw new Error("lesson loop");
    await page.waitForSelector("[data-qid], .stat-grid");
    if (await page.locator(".stat-grid").count()) break;
  }
  return steps;
}

// ---------- tests ----------
const tests = {
  async smoke(browser) {
    const { ctx, page } = await newPage(browser);
    await page.goto(BASE);
    await page.waitForSelector("h1");
    ok("home title", (await page.title()).includes("Grammar Quest"));
    ok("html lang th", (await page.getAttribute("html", "lang")) === "th");
    ok("units listed", (await page.locator(".unit-card").count()) === UNITS.length);
    ok("no console errors", page.errors.length === 0, page.errors.join(" | "));
    await ctx.close();
  },

  async lessonFlow(browser) {
    const { ctx, page } = await newPage(browser);
    await page.goto(BASE);
    await page.click("a:has-text('เริ่มเรียน')");
    await page.waitForSelector("[data-qid]");
    ok("check disabled before answer", await page.locator("#check-btn").isDisabled());
    const first = await page.getAttribute("[data-qid]", "data-qid");
    const lessonId = first.split("-").slice(0, 2).join("-");
    const total = unitData[first.split("-")[0]].lessons.find((l) => l.id === lessonId).questions.length;
    // answer first wrong, rest right
    await answer(page, false);
    const hearts = (await getState(page)).hearts.n;
    ok("lost a heart", hearts === 4, `hearts=${hearts}`);
    ok("feedback has explanation", (await page.locator(".feedback .explain").count()) >= 1);
    await next(page);
    let steps = 1;
    while (!(await page.locator(".stat-grid").count())) {
      await answer(page, true);
      await next(page);
      steps++;
      await page.waitForSelector("[data-qid], .stat-grid");
      if (steps > 40) break;
    }
    ok("wrong question repeated at end", steps === total + 1, `steps=${steps} total=${total}`);
    const s = await getState(page);
    ok("lesson done", s.lessons[lessonId]?.done === true);
    // xp: (total-1) first-try*10 + 1 corrected*5 + 20 completion (not perfect)
    const expectXp = (total - 1) * 10 + 5 + 20;
    ok("xp computed", s.xp === expectXp, `xp=${s.xp} expected=${expectXp}`);
    ok("streak 1", s.streak.count === 1);
    ok("mistake in review box", s.questions[first].box === 1);
    ok("results lists mistake", (await page.locator("details.mistake").count()) === 1);
    // review
    await page.goto(BASE + "#/review");
    await page.click("a:has-text('เริ่มทบทวน')");
    await page.waitForSelector("[data-qid]");
    await answer(page, true);
    const s2 = await getState(page);
    ok("review correct moves to box 2", s2.questions[first].box === 2);
    ok("review gives heart back", s2.hearts.n === 5, `hearts=${s2.hearts.n}`);
    ok("no console errors", page.errors.length === 0, page.errors.join(" | "));
    await ctx.close();
  },

  async heartsOut(browser) {
    const { ctx, page } = await newPage(browser);
    await page.goto(BASE);
    await setState(page, `s.hearts = { n: 0, at: Date.now() }; s.v = 1; s.settings = s.settings || {theme:"auto"};`);
    await page.goto(BASE + "#/lesson/u01-l1");
    await page.waitForSelector("h1");
    ok("out of hearts screen", (await page.locator("h1").innerText()).includes("หัวใจหมด"));
    await setState(page, `s.settings.unlimitedHearts = true;`);
    await page.goto(BASE + "#/settings");
    await page.goto(BASE + "#/lesson/u01-l1");
    await page.waitForSelector("[data-qid]");
    ok("unlimited hearts lets you play", true);
    await ctx.close();
  },

  async keyboard(browser) {
    const { ctx, page } = await newPage(browser);
    await page.goto(BASE + "#/lesson/u01-l1");
    await page.waitForSelector("[data-qid]");
    const qid = await page.getAttribute("[data-qid]", "data-qid");
    const q = qById.get(qid);
    await page.keyboard.press(String(LETTERS.indexOf(q.answer) + 1));
    ok("digit selects", (await page.locator(".choice[aria-checked=true]").count()) === 1);
    await page.keyboard.press("Enter");
    await page.waitForSelector(".feedback.is-correct");
    ok("enter checks", true);
    ok("focus moved to feedback title", await page.evaluate(() => document.activeElement?.id === "fb-title"));
    await page.keyboard.press("Enter");
    await page.waitForFunction((id) => document.querySelector("[data-qid]")?.dataset.qid !== id, qid);
    ok("enter goes next", true);
    // arrow keys in radio group
    await page.locator(".choice").first().focus();
    await page.keyboard.press("ArrowDown");
    ok("arrow moves selection", (await page.locator(".choice").nth(1).getAttribute("aria-checked")) === "true");
    // Esc closes exit dialog
    await page.locator(".lesson-top button").click();
    await page.waitForSelector("dialog[open]");
    await page.keyboard.press("Escape");
    ok("escape closes dialog", (await page.locator("dialog[open]").count()) === 0);
    // skip link
    const { page: fresh } = await newPage(browser);
    await fresh.goto(BASE + "#/stats");
    await fresh.waitForSelector("h1");
    await fresh.keyboard.press("Tab");
    ok("skip link first tab stop (fresh load)", (await fresh.evaluate(() => document.activeElement?.className)) === "skip-link");
    await page.goto(BASE + "#/stats");
    await page.waitForSelector("h1");
    ok("route change focuses h1", await page.evaluate(() => document.activeElement?.tagName === "H1"));
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Shift+Tab");
    await page.evaluate(() => document.querySelector(".skip-link").focus());
    await page.keyboard.press("Enter");
    ok("skip link keeps route", page.url().endsWith("#/stats"));
    await ctx.close();
  },

  async sync(browser) {
    const { ctx, page } = await newPage(browser);
    await page.goto(BASE);
    await setState(page, `s.xp = 777; s.lessons = {"u01-l1": {done: true, best: 90, times: 1, at: 1}}; s.updatedAt = Date.now();`);
    await page.goto(BASE + "#/settings");
    await page.click("button:has-text('สร้างรหัส')");
    await page.waitForFunction(() => document.querySelector("#code-out").value.startsWith("GQ1."));
    const code = await page.inputValue("#code-out");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector("h1");
    // bad code shows error
    await page.fill("#code-in", "GQ1.deadbeef.xxxx");
    await page.click("button:has-text('รวมความคืบหน้า')");
    await page.waitForFunction(() => document.querySelector("#code-in-err").textContent.length > 5, null, { timeout: 3000 }).catch(() => {});
    ok("bad code error shown", (await page.locator("#code-in-err").innerText()).length > 5);
    ok("bad code marks field invalid", (await page.getAttribute("#code-in", "aria-invalid")) === "true");
    await page.fill("#code-in", code);
    await page.click("button:has-text('รวมความคืบหน้า')");
    await page.waitForSelector("dialog[open]");
    await page.click("dialog[open] button:has-text('รวมเลย')");
    await page.waitForTimeout(200);
    const s = await getState(page);
    ok("sync restored xp", s.xp === 777, `xp=${s.xp}`);
    ok("sync restored lesson", s.lessons["u01-l1"]?.done === true);
    await ctx.close();
  },

  async offline(browser) {
    const { ctx, page } = await newPage(browser, { sw: true });
    let navs = 0;
    page.on("framenavigated", (f) => { if (f === page.mainFrame()) navs++; });
    await page.goto(BASE);
    await page.waitForSelector("h1");
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
      // wait until all precache requests are done (install finished → active)
      for (let i = 0; i < 100 && !(await caches.keys()).length; i++) await new Promise((r) => setTimeout(r, 100));
    });
    await page.waitForTimeout(1500);
    ok("first visit does not reload when the service worker takes control", navs === 1, `navigations=${navs}`);
    await ctx.setOffline(true);
    const p2 = await ctx.newPage();
    await p2.goto(BASE + "#/unit/u01");
    await p2.waitForSelector(".lesson-node", { timeout: 10000 }).catch(() => {});
    ok("works offline", (await p2.locator(".lesson-node").count()) > 0);
    ok("offline bar visible", await p2.locator("#offline").isVisible());
    await p2.goto(BASE + "#/lesson/u01-l1");
    await p2.waitForSelector("[data-qid]", { timeout: 10000 }).catch(() => {});
    ok("lesson opens offline", (await p2.locator("[data-qid]").count()) === 1);
    await ctx.close();
  },

  async a11y(browser) {
    const routes = ["#/", "#/unit/u01", "#/unit/u01/summary", "#/review", "#/stats", "#/settings", "#/lesson/u01-l1"];
    for (const theme of ["light", "dark"]) {
      const { ctx, page } = await newPage(browser, { theme });
      await page.goto(BASE);
      await setState(page, `s.questions = {"u01-l1-q01": {seen:1,right:0,wrong:1,box:1,due:"2000-01-01",at:1}};`);
      for (const r of routes) {
        await page.goto(BASE + r);
        await page.waitForTimeout(400);
        const res = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
        const bad = res.violations.filter((v) => ["serious", "critical"].includes(v.impact));
        const minor = res.violations.filter((v) => !["serious", "critical"].includes(v.impact));
        results.push({ theme, route: r, serious: bad.map((v) => v.id), minor: minor.map((v) => v.id) });
        ok(`axe ${theme} ${r}`, bad.length === 0, bad.map((v) => `${v.id}: ${v.nodes.slice(0, 2).map((n) => n.target.join(" ")).join(", ")}`).join(" | "));
      }
      // feedback panel state
      await page.goto(BASE + "#/lesson/u01-l1");
      await page.waitForSelector("[data-qid]");
      await answer(page, false);
      const res = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      const bad = res.violations.filter((v) => ["serious", "critical"].includes(v.impact));
      ok(`axe ${theme} feedback`, bad.length === 0, bad.map((v) => v.id).join(","));
      await ctx.close();
    }
  },

  async layout(browser) {
    const routes = ["#/", "#/unit/u01", "#/unit/u01/summary", "#/review", "#/stats", "#/settings", "#/lesson/u01-l1", "#/lesson/u01-l3", "#/lesson/u01-l5"];
    for (const width of [320, 375, 768, 1280]) {
      const { ctx, page } = await newPage(browser, { ctx: { viewport: { width, height: 800 } } });
      await page.goto(BASE);
      await setState(page, `s.settings = {theme:"auto", unlimitedHearts: true}; s.lessons = {}; for (const id of ${JSON.stringify(UNITS.flatMap((u) => u.lessons.map((l) => l.id)))}) s.lessons[id] = {done:true,best:100,times:1,at:1};`);
      for (const r of routes) {
        await page.goto(BASE + r);
        await page.waitForTimeout(300);
        const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        ok(`no horizontal scroll ${width} ${r}`, over <= 0, `overflow=${over}px`);
        // touch targets (skip inline text links inside paragraphs)
        const small = await page.evaluate(() =>
          [...document.querySelectorAll("button, a[href], input, [role=radio], [role=switch], [role=tab]")]
            .filter((el) => el.offsetParent !== null && !el.closest("p") && !el.classList.contains("skip-link"))
            .map((el) => ({ el, r: el.getBoundingClientRect() }))
            .filter(({ r }) => r.width > 0 && (r.width < 44 || r.height < 44))
            .map(({ el, r }) => `${el.tagName.toLowerCase()}.${el.className} ${Math.round(r.width)}x${Math.round(r.height)} "${el.textContent.trim().slice(0, 20)}"`),
        );
        ok(`touch targets ${width} ${r}`, small.length === 0, small.slice(0, 4).join(" | "));
      }
      // 200% text zoom (approximate with root font-size)
      await page.goto(BASE + "#/lesson/u01-l1");
      await page.addStyleTag({ content: "html{font-size:200%}" });
      await page.waitForTimeout(200);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      ok(`text 200% no h-scroll ${width}`, over <= 0, `overflow=${over}`);
      await ctx.close();
    }
  },

  async renderAll(browser) {
    // open every lesson and verify every question renders (cheap): unlock all, walk queue answering correctly
    const { ctx, page } = await newPage(browser);
    await page.goto(BASE);
    const allLessons = UNITS.flatMap((u) => u.lessons.map((l) => l.id));
    await setState(page, `s.settings = {theme:"auto", unlimitedHearts: true}; s.lessons = {}; for (const id of ${JSON.stringify(allLessons)}) s.lessons[id] = {done:true,best:100,times:1,at:1};`);
    const lessons = FULL ? allLessons : allLessons.filter((_, i) => i % 1 === 0);
    let count = 0;
    for (const id of lessons) {
      count += await playLesson(page, id);
    }
    ok("played all questions", count === qById.size || !FULL, `played=${count} total=${qById.size}`);
    ok("no console errors (all lessons)", page.errors.length === 0, page.errors.slice(0, 3).join(" | "));
    await ctx.close();
  },
};

const browser = await chromium.launch();
const names = ONLY.length ? ONLY : Object.keys(tests).filter((n) => n !== "renderAll" || FULL);
for (const n of names) {
  const before = failures;
  const t0 = Date.now();
  try {
    await tests[n](browser);
  } catch (e) {
    failures++;
    console.log(`  ✖ ${n} threw: ${e.message.split("\n")[0]}`);
  }
  console.log(`${failures === before ? "✔" : "✖"} ${n} (${Date.now() - t0}ms)`);
}
await browser.close();

// WebKit mobile smoke (Safari engine)
if (!ONLY.length || ONLY.includes("webkit")) {
  const wk = await webkit.launch();
  const ctx = await wk.newContext({ ...devices["iPhone 13"], serviceWorkers: "block" });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e)));
  await page.goto(BASE + "#/lesson/u01-l1");
  await page.waitForSelector("[data-qid]");
  await answer(page, true);
  ok("webkit lesson works", (await page.locator(".feedback.is-correct").count()) === 1);
  ok("webkit no errors", errs.length === 0, errs.join(" | "));
  await wk.close();
  console.log("✔ webkit");
}

fs.mkdirSync(path.join(ROOT, "tests/e2e/out"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "tests/e2e/out/axe.json"), JSON.stringify(results, null, 2));
console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
