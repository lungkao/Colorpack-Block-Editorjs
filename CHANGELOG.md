# Changelog

## 1.1.0 (2026-11-03)

### English
**Added**
- Automatic YouTube and Vimeo embeds: paste a link into an empty block. Supports share links, Shorts, live, playlists and start times
- Browse the Joomla Media Manager from image and gallery blocks, including folders in `/images` and `/files`
- Gallery block with multi-file upload, per-file progress, reordering and 2 to 4 columns
- Image size, alignment, crop, rotate and replace
- Automatic image reduction in the browser before upload (default maximum width 1920 px)
- Undo and redo buttons, and Ctrl/Cmd+Z after adding or removing blocks
- Companion plugin, Content - Colorpack Video Embed, which shows videos when Text Filters removed the player at save time

**Fixed**
- Saving now waits for running uploads and stops if one fails, so images are not lost
- Warns when Text Filters will remove a video and the companion plugin is off
- Word lists become real lists, Word formatting is removed, and tables with merged cells keep their layout
- Upload errors name the file and explain an expired session
- Editors moved inside a subform register again
- More Thai labels, table header `scope` and iframe `title`

**Changed**
- Distributed as a package with both plugins. Install it over 1.0.0 to upgrade

### ภาษาไทย
**เพิ่ม**
- ฝังวิดีโอ YouTube และ Vimeo อัตโนมัติ เพียงวางลิงก์ในบล็อกว่าง รองรับลิงก์แชร์ Shorts ไลฟ์ เพลย์ลิสต์ และเวลาเริ่ม
- เลือกไฟล์จาก Media Manager ของ Joomla ในบล็อกรูปและแกลเลอรี รวมถึงโฟลเดอร์ใน `/images` และ `/files`
- บล็อกแกลเลอรี อัปโหลดหลายรูป เห็นความคืบหน้ารายไฟล์ จัดลำดับได้ และเลือก 2 ถึง 4 คอลัมน์
- ปรับขนาด จัดวาง ตัด หมุน และเปลี่ยนรูป
- ย่อรูปในเบราว์เซอร์อัตโนมัติก่อนอัปโหลด (ค่าเริ่มต้นกว้างสุด 1920 px)
- ปุ่มเลิกทำและทำซ้ำ รวมถึง Ctrl/Cmd+Z หลังเพิ่มหรือลบบล็อก
- ปลั๊กอินเสริม Content - Colorpack Video Embed แสดงวิดีโอเมื่อ Text Filter ตัดตัวเล่นออกตอนบันทึก

**แก้ไข**
- การบันทึกจะรอการอัปโหลดให้เสร็จ และหยุดถ้าอัปโหลดล้มเหลว รูปจึงไม่หาย
- เตือนเมื่อ Text Filter จะตัดวิดีโอและยังไม่ได้เปิดปลั๊กอินเสริม
- รายการจาก Word เป็นรายการจริง ลบรูปแบบของ Word ออก และตารางที่มีเซลล์รวมคงโครงสร้างเดิม
- ข้อความแจ้งอัปโหลดล้มเหลวระบุชื่อไฟล์ และบอกเมื่อเซสชันหมดอายุ
- ตัวแก้ไขใน subform ลงทะเบียนใหม่เมื่อถูกย้าย
- แปลข้อความไทยเพิ่ม เพิ่ม `scope` ให้หัวตาราง และ `title` ให้ iframe

**เปลี่ยน**
- แจกเป็นแพ็กเกจที่มีปลั๊กอินสองตัว ติดตั้งทับ 1.0.0 เพื่ออัปเกรดได้เลย

## 1.0.0 (2026-11-03)

### English
- First release: Editor.js block editor for Joomla 4.4, 5 and 6 that stores content as HTML

### ภาษาไทย
- รุ่นแรก: ตัวแก้ไขแบบบล็อกจาก Editor.js สำหรับ Joomla 4.4, 5 และ 6 ที่เก็บเนื้อหาเป็น HTML
