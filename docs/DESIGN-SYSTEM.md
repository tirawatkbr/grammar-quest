# Design System — Grammar Quest

แหล่งความจริงเดียว: `site/css/tokens.css` (ค่าทั้งหมด) → ทุก component ใช้ `var(--token)` เท่านั้น ห้ามใส่ hex ในไฟล์อื่น
(ตรวจด้วย `node scripts/validate-css.mjs`). คู่สีตรวจด้วย `node scripts/contrast.mjs`.

## หลักการ
1. **มินิมอล สุภาพ** — พื้นหลังโทนกลาง (stone), สีหลักเดียว (indigo) ใช้กับ action และสถานะที่เลือก; สีสถานะ (เขียว/แดง/ส้ม) ใช้เมื่อมีความหมายเท่านั้น
2. **อ่านง่ายก่อนสวย** — ภาษาไทย 16px ขึ้นไป line-height 1.7, ความยาวบรรทัด ≤ 720px
3. **สีไม่ใช่สัญญาณเดียว** — ทุกสถานะมีไอคอน + ข้อความกำกับ
4. **หนึ่งหน้าจอ หนึ่ง CTA หลัก**
5. **การเคลื่อนไหวมีความหมาย** — ใช้เฉพาะ feedback/การเข้าออกของ sheet; ปิดเมื่อ `prefers-reduced-motion`

## Tokens
### สี
| Token | Light | Dark | ใช้กับ |
|-------|-------|------|--------|
| `--bg` | #FAFAF9 | #0C0A09 | พื้นหลังหน้า |
| `--surface` | #FFFFFF | #1C1917 | การ์ด, sheet |
| `--surface-2` | #F5F5F4 | #292524 | พื้นยุบ, ช่องโจทย์ |
| `--text` | #1C1917 | #F5F5F4 | ข้อความหลัก |
| `--text-muted` | #57534E | #A8A29E | ข้อความรอง |
| `--border` | #E7E5E4 | #44403C | เส้นแบ่งตกแต่ง |
| `--border-strong` | #8A8380 | #8A8380 | ขอบตัวเลือก/ช่องกรอก (≥3:1) |
| `--primary` | #3730A3 | #A5B4FC | ปุ่มหลัก, ลิงก์, ที่เลือก |
| `--on-primary` | #FFFFFF | #1E1B4B | ข้อความบนปุ่มหลัก |
| `--primary-soft` | #EEF2FF | #1E1B4B | พื้นตัวเลือกที่ถูกเลือก |
| `--success` / `--success-soft` | #15803D / #F0FDF4 | #4ADE80 / #052E16 | ถูกต้อง |
| `--danger` / `--danger-soft` | #B91C1C / #FEF2F2 | #F87171 / #450A0A | ผิด, ลบข้อมูล |
| `--warning` / `--warning-soft` | #A14A08 / #FFFBEB | #FBBF24 / #422006 | กล่อง TIP |
| `--heart` `--streak` `--xp` | #DC2626 #C2410C #A16207 | #F87171 #FB923C #FACC15 | ไอคอนสถานะ |
| `--focus` | #4F46E5 | #A5B4FC | วงโฟกัส |

ผลตรวจ contrast ทุกคู่: ดู `docs/A11Y-AUDIT.md` (ผ่านทั้งหมด).

### ตัวอักษร — IBM Plex Sans Thai (Google Fonts, OFL)
| Token | ขนาด | ใช้กับ |
|-------|------|--------|
| `--fs-xs` | 14px | badge, caption (ไม่ใช้กับเนื้อหา) |
| `--fs-sm` | 16px | เนื้อหา, ปุ่ม, ตัวเลือก |
| `--fs-md` | 18px | โจทย์ |
| `--fs-lg` | 20px | หัวข้อส่วน |
| `--fs-xl` | 24px | หัวข้อหน้าจอ |
| `--fs-2xl` | 30px | ตัวเลขใหญ่ (XP ผลลัพธ์) |
น้ำหนัก: 400 เนื้อหา, 500 label, 600 หัวข้อ/ปุ่ม, 700 ตัวเลขเด่น. line-height เนื้อหา 1.7, หัวข้อ 1.4. ไม่ใช้ letter-spacing ติดลบ. ตัวเลขใช้ `font-variant-numeric: tabular-nums`.

### ระยะ รูปทรง เงา การเคลื่อนไหว
- Spacing: 4 · 8 · 12 · 16 · 24 · 32 · 48 (`--sp-1`…`--sp-7`)
- Radius: 8 (ชิป), 12 (ปุ่ม/ตัวเลือก), 16 (การ์ด/sheet), full (badge)
- Shadow: `--shadow-1` (การ์ด), `--shadow-2` (sheet/dialog) — สองระดับเท่านั้น
- Motion: กด 120ms, เข้า 200ms ease-out, ออก 140ms ease-in; ปิดทั้งหมดเมื่อ reduced-motion
- Z-index: nav 10 · sheet 20 · dialog 40 · toast 100
- Breakpoints: 0–767 มือถือ (bottom nav) · 768–1023 แท็บเล็ต · ≥1024 เดสก์ท็อป (side nav)

### ไอคอน — Material Symbols Rounded (Google Fonts, Apache 2.0)
ขนาด 24px (ในปุ่ม 20px), fill 0 / weight 400; ไอคอนสถานะ (หัวใจ, streak, XP, ถูก/ผิด) ใช้ fill 1.
ไอคอนข้างข้อความ → `aria-hidden="true"`; ปุ่มไอคอนล้วน → ต้องมี `aria-label`.
สร้างจาก `site/assets/icons/*.svg` ด้วย `node scripts/build-icons.mjs` → `icon(name)` ใน `js/ui/icon.js`.

## Components
### Button
| Variant | ใช้เมื่อ |
|---------|---------|
| primary | action หลักของหน้าจอ (ตรวจคำตอบ, ต่อไป, เรียนต่อ) — มีได้ 1 ปุ่มต่อหน้าจอ |
| secondary | action รอง (ดูสรุปกฎ, ข้าม) |
| ghost | action ในแถบ/ลิงก์ |
| danger | ลบข้อมูล (ต้องมี dialog ยืนยัน) |
States: default · hover (เข้มขึ้น) · active (scale 0.98) · focus-visible (วง 3px `--focus` offset 2px) · disabled (`disabled` attribute, opacity 0.45, cursor not-allowed).
ขนาดขั้นต่ำ 44×44px. Element: `<button>` จริงเสมอ.

### ChoiceOption (ตัวเลือก a–d)
`role="radiogroup"` + `<button role="radio" aria-checked>`; ลูกศร/1–4 เลือก; แสดงตัวอักษร a–d ในวงกลม + ข้อความ (`lang="en"`).
States: default · selected (ขอบ primary 2px + พื้น primary-soft) · correct (ขอบ success + ไอคอน check_circle + "คำตอบที่ถูก") · wrong (ขอบ danger + ไอคอน cancel + "คำตอบของคุณ") · disabled หลังตรวจ.

### WordChip (choice-fill / order)
`<button>` ขนาด ≥44px; ใน order: แตะเพื่อย้ายระหว่าง "คลังคำ" กับ "ประโยค" (ไม่ต้องลาก — ทางเลือกแทน drag ตาม WCAG); ประกาศผลผ่าน live region.

### TextAnswer (type-fill)
`<input type="text">` + `<label>` มองเห็นได้, `autocomplete="off" autocapitalize="off" spellcheck="false"`, สูง ≥44px, Enter = ตรวจ.

### ErrorSpotSentence
ประโยคที่แบ่งเป็นส่วน (1)–(4) แต่ละส่วนเป็น `role="radio"` แตะได้, ขีดเส้นใต้ + หมายเลขกำกับ.

### ProgressBar
`role="progressbar" aria-valuenow aria-valuemin aria-valuemax aria-label="ความคืบหน้า"`; สูง 12px, fill `--primary`, track `--track`.

### HeartMeter / XPBadge / StreakBadge / LevelBadge
ไอคอน + ตัวเลข + ข้อความสำหรับ screen reader ("หัวใจ 4 จาก 5 ดวง"); เปลี่ยนค่าแล้วประกาศผ่าน status region เดียวของแอป.

### FeedbackPanel
Sheet ล่างจอ `role="region" aria-labelledby` + หัวข้อ "ถูกต้อง!"/"ยังไม่ถูก" (โฟกัสย้ายไปหัวข้อ), แสดง: คำตอบที่ถูก · เหตุผล · ทำไมคำตอบที่เลือกผิด · TIP TOEIC · ปุ่ม "ดูสรุปกฎ" · ปุ่มหลัก "ต่อไป".
พื้น `--success-soft`/`--danger-soft`, ข้อความสถานะ `--success`/`--danger`.

### SummaryCard
หัวข้อ + เนื้อหา (ไทย) + ตัวอย่าง (`lang="en"`, เน้นคำสำคัญด้วย `<mark>`) + กล่อง TIP (ไอคอน lightbulb).

### UnitCard / LessonNode
UnitCard: เลขบท, ชื่ออังกฤษ+ไทย, แถบความคืบหน้า, จำนวน lesson ที่จบ. LessonNode: วงกลม 56px + ชื่อ, สถานะ ล็อก (ไอคอน lock + "ล็อกอยู่") / พร้อม / จบแล้ว (check) — ล็อกอยู่ยังกดได้เพื่ออธิบายเหตุผลที่ล็อก.

### BottomNav / SideNav
4 เมนู: เรียน (school) · ทบทวน (history) · สถิติ (bar_chart) · ตั้งค่า (settings) — ไอคอน + ข้อความ, `aria-current="page"` ที่หน้าปัจจุบัน. ซ่อนระหว่างทำ lesson (โหมดโฟกัส) โดยมีปุ่มปิดชัดเจนแทน.

### Dialog
`<dialog>` แบบ modal: โฟกัสกักไว้ภายใน, Esc ปิด, คืนโฟกัสให้ปุ่มที่เปิด, มีปุ่มปิด/ยกเลิกเสมอ.

### Toast
`role="status"` ไม่ขโมยโฟกัส, หายเองใน 4 วินาที, ไม่ใช้กับข้อมูลสำคัญที่ต้องตัดสินใจ.

## Patterns
- **Lesson flow**: เลือกคำตอบ → "ตรวจคำตอบ" → FeedbackPanel → "ต่อไป"; ผิด → ข้อนั้นกลับมาท้ายคิว; จบ → Results.
- **Empty states**: ทบทวนว่าง → "ยังไม่มีข้อที่ต้องทบทวน" + ปุ่มไปเรียน; สถิติว่าง → อธิบายว่าจะเห็นอะไรเมื่อเรียน.
- **Offline**: แถบบาง "ออฟไลน์อยู่ — เรียนต่อได้ ความคืบหน้าจะซิงก์เมื่อออนไลน์" (ไอคอน wifi_off).
- **Update**: เมื่อมีเวอร์ชันใหม่ → toast + ปุ่ม "อัปเดต".
- **Destructive**: รีเซ็ตความคืบหน้า → dialog ยืนยัน พิมพ์คำว่า "ลบ" ก่อนกด.
- **Sync**: Settings › ซิงก์ — สร้างรหัส (คัดลอก/แชร์) · วางรหัส (แสดงสรุปก่อนรวม) · Google (เมื่อมี config).

## Do / Don't
| ✅ Do | ❌ Don't |
|------|---------|
| ใช้ token ทุกค่า | ใส่ hex/px สุ่มใน component |
| ไอคอน + ข้อความกำกับ | สีอย่างเดียวบอกถูก/ผิด |
| ปุ่ม `<button>` จริง | `<div onclick>` |
| `lang="en"` กับประโยคอังกฤษ | ปล่อยให้ screen reader อ่านอังกฤษด้วยเสียงไทย |
| เหตุผลเฉลยภาษาไทยที่อ้างกฎ | เฉลยแค่ "ข้อ c" |
| Material Symbols Rounded ชุดเดียว | emoji หรือไอคอนต่างชุด |
