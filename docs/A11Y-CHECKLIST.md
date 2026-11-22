# Accessibility Checklist — WCAG 2.1 AA (Grammar Quest)

ใช้เป็นเกณฑ์ตรวจทุกหน้าจอใน Phase 5; ผลบันทึกใน `docs/A11Y-AUDIT.md`.

| เกณฑ์ | ข้อกำหนดในแอปนี้ | วิธีตรวจ |
|-------|-------------------|----------|
| 1.1.1 Non-text content | ไอคอนตกแต่ง `aria-hidden`; ไอคอนที่มีความหมายมีข้อความ; ปุ่มไอคอนล้วนมี `aria-label` | axe + อ่านโค้ด |
| 1.3.1 Info & relationships | ใช้ heading h1→h2 ตามลำดับ, `<main>`/`<nav>`, radiogroup, label ของ input | axe + snapshot accessibility tree |
| 1.3.2 Meaningful sequence | ลำดับ DOM = ลำดับที่มองเห็น | ตรวจ Tab order |
| 1.4.1 Use of color | ถูก/ผิด/ล็อก/เลือก มีไอคอน+ข้อความเสมอ | screenshot โหมดขาวดำ |
| 1.4.3 Contrast (text) | ≥ 4.5:1 ทุกคู่ทั้ง light/dark | `scripts/contrast.mjs` + axe |
| 1.4.4 Resize text | zoom 200% ไม่ตัดข้อความ | Playwright zoom |
| 1.4.10 Reflow | กว้าง 320px ไม่มี scroll แนวนอน | Playwright 320px |
| 1.4.11 Non-text contrast | ขอบตัวเลือก, focus ring, progress, ไอคอนสถานะ ≥ 3:1 | `scripts/contrast.mjs` |
| 1.4.12 Text spacing | ไม่ตั้งความสูงตายตัวให้กล่องข้อความ | ตรวจ CSS |
| 1.4.13 Content on hover/focus | ไม่มี tooltip ที่ต้อง hover | ตรวจ |
| 2.1.1 Keyboard | ทุกฟีเจอร์ใช้คีย์บอร์ดได้ (Tab, Enter, Space, 1–4, ลูกศร, Esc) | E2E keyboard-only |
| 2.1.2 No keyboard trap | dialog กักโฟกัสแต่ Esc ออกได้ | E2E |
| 2.2.1 Timing adjustable | จับเวลาใน TOEIC Mix ปิดเป็นค่าเริ่มต้น, ปิดได้ | ตรวจ |
| 2.3.1 Flashes | ไม่มีการกะพริบ | ตรวจ |
| 2.4.1 Bypass blocks | ลิงก์ "ข้ามไปเนื้อหา" | E2E |
| 2.4.2 Page titled | `document.title` เปลี่ยนตามหน้าจอ | E2E |
| 2.4.3 Focus order | หลังเปลี่ยนหน้า โฟกัสไปที่ h1 ของหน้า | E2E |
| 2.4.6 Headings & labels | หัวข้อบอกเนื้อหาชัด | ตรวจ |
| 2.4.7 Focus visible | วงโฟกัส 3px `--focus` ทุก control | screenshot focus |
| 2.5.3 Label in name | accessible name มีข้อความที่มองเห็น | axe |
| 2.5.5 Target size (AAA, ใช้เป็นมาตรฐานภายใน) | เป้าแตะ ≥ 44×44px | สคริปต์วัด bounding box |
| 3.1.1 Language of page | `<html lang="th">` | axe |
| 3.1.2 Language of parts | ประโยคอังกฤษ `lang="en"` | อ่านโค้ด renderer |
| 3.2.1/3.2.2 On focus/input | เลือกคำตอบไม่ส่งคำตอบอัตโนมัติ ต้องกด "ตรวจคำตอบ" | E2E |
| 3.3.1 Error identification | ตอบผิด/รหัสซิงก์ผิด บอกเป็นข้อความชัด | E2E |
| 3.3.2 Labels | ช่องกรอกทุกช่องมี label มองเห็นได้ | axe |
| 4.1.2 Name, role, value | radio มี aria-checked, progressbar มีค่า, toggle มี aria-pressed/checked | axe |
| 4.1.3 Status messages | ผลตรวจ, XP, หัวใจ, toast ประกาศผ่าน `role="status"` | ตรวจ |
| Motion | `prefers-reduced-motion` ปิดแอนิเมชัน | Playwright emulate |
