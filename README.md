# Grammar Quest — ฝึกไวยากรณ์อังกฤษเพื่อ TOEIC

เว็บแอปเรียนไวยากรณ์แบบเกม (XP · Streak · Level · หัวใจ · ทบทวนข้อผิด) จากชีท BASIC GRAMMAR 14 บท
พร้อมข้อแนว TOEIC Part 5/6 และ **เฉลยพร้อมเหตุผลภาษาไทยทุกข้อ** ใช้ได้ทั้งมือถือและคอม (ติดตั้งเป็นแอปได้ และใช้ออฟไลน์ได้)

**เปิดใช้งาน:** https://tirawatkbr.github.io/grammar-quest/

## วิธีใช้
1. เปิดลิงก์ด้านบน → กด **เริ่มเรียน**
2. แต่ละบทมี **สรุปเนื้อหา** (อ่านก่อนได้) และบทเรียนย่อย 8–15 ข้อ
3. ตอบ → กด **ตรวจคำตอบ** → อ่าน **เหตุผล** และ **ทำไมคำตอบที่เลือกจึงผิด** → **ต่อไป**
4. ข้อที่ผิดจะกลับมาให้ทำอีกครั้งท้ายบทเรียน และถูกเก็บไว้ในเมนู **ทบทวน** (ทบทวนซ้ำหลัง 1 และ 3 วัน)
5. เมนู ทบทวน › **TOEIC Mix** สุ่มข้อแนวข้อสอบจากหลายบท

คีย์ลัด: `1`–`4` เลือกตัวเลือก · `Enter` ตรวจคำตอบ/ต่อไป · `Esc` ปิดหน้าต่าง

### ติดตั้งบนมือถือ
- iPhone (Safari): ปุ่มแชร์ › “เพิ่มไปยังหน้าจอโฮม”
- Android (Chrome): เมนู ⋮ › “ติดตั้งแอป” / “เพิ่มลงในหน้าจอหลัก”

## ซิงก์ความคืบหน้าระหว่างมือถือกับคอม
### แบบที่ 1: รหัสซิงก์ (ใช้ได้ทันที)
ตั้งค่า › ซิงก์ข้ามเครื่อง → เครื่องที่มีข้อมูลกด **สร้างรหัส** แล้ว **คัดลอก** → อีกเครื่องวางในช่อง “วางรหัสจากอีกเครื่อง” แล้วกด **รวมความคืบหน้า**
ระบบจะ “รวม” ไม่ใช่ “ทับ” (เก็บ XP ที่มากกว่า, บทเรียนที่จบจากทั้งสองเครื่อง, ข้อทบทวนที่ใหม่กว่า)

### แบบที่ 2: บัญชี Google (อัตโนมัติ) — ตั้งค่าครั้งเดียว ~10 นาที
1. เข้า https://console.firebase.google.com → **Add project** (ปิด Google Analytics ได้)
2. **Build › Authentication › Get started › Sign-in method › Google › Enable** → Save
3. **Authentication › Settings › Authorized domains › Add domain** → `tirawatkbr.github.io`
4. **Build › Firestore Database › Create database** → Production mode → เลือก region ใกล้ไทย (เช่น `asia-southeast1`)
5. แท็บ **Rules** วางกฎนี้แล้ว **Publish**:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{uid}/{doc=**} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
       }
     }
   }
   ```
6. **Project settings (รูปเฟือง) › Your apps › Web (</>)** → ตั้งชื่อแอป → คัดลอกค่า `firebaseConfig`
7. แก้ไฟล์ `site/js/firebase-config.js` ให้เป็น
   ```js
   export const FIREBASE_CONFIG = { apiKey: "…", authDomain: "…", projectId: "…", appId: "…" };
   ```
   แล้ว commit + push (GitHub Actions จะ deploy ให้เอง)
8. ในแอป: ตั้งค่า › **เข้าสู่ระบบด้วย Google** บนทุกเครื่อง

> ค่า config ของ Firebase เว็บไม่ใช่รหัสลับ ข้อมูลถูกป้องกันด้วย Rules ข้อ 5 (อ่าน/เขียนได้เฉพาะเจ้าของบัญชี)

## สำหรับนักพัฒนา
ไม่มีขั้นตอน build — `site/` คือเว็บที่ deploy ทั้งโฟลเดอร์
```
site/                 แอป (HTML/CSS/JS modules, PWA)
  data/uNN.js         เนื้อหาแต่ละบท (สร้าง id ด้วย data/_build.js)
  data/units.js       manifest (สร้างอัตโนมัติ)
docs/                 user research, design system, a11y checklist/audit, content notes
scripts/              build + ตรวจคุณภาพ
tests/unit            node --test
tests/e2e             Playwright + axe (เครื่องมืออยู่นอก repo: GQ_TOOLS)
```
คำสั่ง:
```bash
node scripts/build-icons.mjs        # ไอคอน Material Symbols → site/js/icons-data.js
node scripts/build-manifest.mjs     # site/data/units.js
node scripts/build-sw.mjs           # service worker + precache list (รันทุกครั้งก่อน commit)
node scripts/validate.mjs           # ตรวจเนื้อหา: ครบทุกข้อ, เฉลย, คำอธิบาย, ภาษาไทย/อังกฤษ
node scripts/diff-answers.mjs       # เทียบเฉลยกับการแก้ข้อรอบสอง
node scripts/contrast.mjs           # ตรวจ contrast ของสี (WCAG AA)
node --test "tests/unit/*.test.mjs"
python -m http.server 8765 --directory site   # แล้ว
node tests/e2e/run.mjs [--full]     # E2E + axe + layout (--full เล่นทุกข้อ)
```

## เครดิต / ใบอนุญาต
- เนื้อหาแบบฝึกหัดจากชีท BASIC GRAMMAR (ใช้เพื่อการศึกษาส่วนตัว) — เฉลย คำอธิบาย และข้อแนว TOEIC เขียนขึ้นใหม่สำหรับแอปนี้
- ฟอนต์ IBM Plex Sans Thai — Google Fonts, SIL Open Font License 1.1 (`site/assets/fonts/OFL.txt`)
- ไอคอน Material Symbols Rounded — Google Fonts, Apache License 2.0
