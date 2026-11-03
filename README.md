# Colorpack Block Editor.js

[English](#english) · [ภาษาไทย](#ภาษาไทย) · [Changelog](CHANGELOG.md) · [☕ Buy Me a Coffee](https://buymeacoffee.com/cheuachatchai)

---

## English

A block editor plugin for Joomla 4.4, 5 and 6, based on [Editor.js](https://editorjs.io). Content stays stored as normal HTML, so existing articles and the site frontend keep working.

### Features
- **Blocks:** heading, paragraph, list, checklist, image, gallery, video, quote, table, code, delimiter, read more and raw HTML
- **Existing content:** anything a block cannot represent exactly stays as a raw HTML block, so no markup is lost. Saving without edits leaves the HTML untouched
- **HTML source:** the `HTML` button switches between blocks and source code
- **Joomla buttons:** Media, Article, Read More, Page Break and other editor buttons stay available
- **Images:** upload JPG, PNG, GIF or WebP, browse `/images` and `/files` in the Joomla Media Manager, or paste a URL. Includes size, alignment, crop, rotate, alt text and caption
- **Automatic reduction:** large images shrink in the browser before upload
- **Video:** paste a YouTube or Vimeo link into an empty block
- **Word paste:** cleans formatting and keeps lists and merged table cells
- **Undo and redo**
- **Languages:** English and Thai

### Requirements
- Joomla 4.4, 5 or 6 (Joomla 3 is not supported)
- PHP 8.1 or later

### Install
1. Go to **System → Install → Extensions** and upload `colorpack-block-editorjs-1.1.0.zip` from [Releases](https://github.com/lungkao/Colorpack-Block-Editorjs/releases).
2. Go to **Global Configuration → Default Editor** and select **Colorpack Block Editor.js**.

The plugin is enabled automatically on first install. Try it on a test site first.

### Settings
Find these under **System → Plugins → Colorpack Block Editor.js**:
- **Upload folder:** where uploaded images go, always inside `images/` (default `images/editorjs`)
- **Maximum image width:** larger images shrink before upload, 0 turns this off (default 1920)
- **Table CSS class:** classes added to tables created in the editor (default `uk-table uk-table-divider table`)

Uploads require the `core.create` permission on Media.

### Known issues
- On Joomla 4, the `files` folder must first be added under **System → Plugins → FileSystem - Local**.
- Videos saved by users under Text Filters need **Content - Colorpack Video Embed** enabled. It is enabled on first install.

### Build
```bash
cd build
npm install
sh make.sh
```
The installable ZIP is created in the project root.

### Support the author
If this tool helped you, you can buy the author a coffee:

<a href="https://buymeacoffee.com/cheuachatchai" >![buy_me_a_coffee](https://github.com/conseilgouz/plg_system_cgwebp_j4/assets/19435246/4fda4cb5-64f1-4717-81ae-c71a0fc26c2d)</a>

### License
GPL-2.0-or-later. Bundled libraries are listed in [`pkg/media/js/THIRD-PARTY.txt`](pkg/media/js/THIRD-PARTY.txt).

© 2026 COLORPACK CREATION CO., LTD.

---

## ภาษาไทย

ปลั๊กอินตัวแก้ไขแบบบล็อกสำหรับ Joomla 4.4, 5 และ 6 พัฒนาจาก [Editor.js](https://editorjs.io) เนื้อหายังเก็บเป็น HTML ปกติ บทความเดิมและหน้าเว็บจึงใช้งานได้เหมือนเดิม

### ความสามารถ
- **บล็อก:** หัวข้อ, ย่อหน้า, รายการ, เช็กลิสต์, รูปภาพ, แกลเลอรี, วิดีโอ, คำพูด, ตาราง, โค้ด, เส้นคั่น, อ่านต่อ และ HTML
- **เนื้อหาเดิม:** ส่วนที่แปลงเป็นบล็อกตรง ๆ ไม่ได้จะเก็บเป็นบล็อก HTML โค้ดจึงไม่หาย และถ้าบันทึกโดยไม่แก้ไข HTML จะไม่เปลี่ยน
- **แก้โค้ด HTML:** ปุ่ม `HTML` ใช้สลับระหว่างบล็อกกับโค้ด
- **ปุ่มของ Joomla:** Media, Article, Read More, Page Break และปุ่มอื่นของตัวแก้ไขยังใช้ได้
- **รูปภาพ:** อัปโหลด JPG, PNG, GIF หรือ WebP เลือกจาก `/images` และ `/files` ใน Media Manager ของ Joomla หรือวาง URL พร้อมปรับขนาด จัดวาง ตัด หมุน ใส่ alt และคำบรรยาย
- **ย่อรูปอัตโนมัติ:** รูปใหญ่จะถูกย่อในเบราว์เซอร์ก่อนอัปโหลด
- **วิดีโอ:** วางลิงก์ YouTube หรือ Vimeo ในบล็อกว่าง
- **วางจาก Word:** ลบรูปแบบที่ไม่จำเป็น และคงรายการกับเซลล์รวมของตาราง
- **เลิกทำและทำซ้ำ**
- **ภาษา:** อังกฤษและไทย

### ความต้องการของระบบ
- Joomla 4.4, 5 หรือ 6 (ไม่รองรับ Joomla 3)
- PHP 8.1 ขึ้นไป

### วิธีติดตั้ง
1. ไปที่ **System → Install → Extensions** แล้วอัปโหลด `colorpack-block-editorjs-1.1.0.zip` จากหน้า [Releases](https://github.com/lungkao/Colorpack-Block-Editorjs/releases)
2. ไปที่ **Global Configuration → Default Editor** แล้วเลือก **Colorpack Block Editor.js**

ปลั๊กอินจะเปิดใช้งานเองเมื่อติดตั้งครั้งแรก แนะนำให้ลองบนเว็บทดสอบก่อน

### การตั้งค่า
ตั้งค่าได้ที่ **System → Plugins → Colorpack Block Editor.js**
- **โฟลเดอร์อัปโหลด:** ที่เก็บรูปที่อัปโหลด อยู่ภายใน `images/` เสมอ (ค่าเริ่มต้น `images/editorjs`)
- **ความกว้างรูปสูงสุด:** รูปที่ใหญ่กว่านี้จะถูกย่อก่อนอัปโหลด ใส่ 0 เพื่อปิด (ค่าเริ่มต้น 1920)
- **CSS class ของตาราง:** class ที่ใส่ให้ตารางซึ่งสร้างในตัวแก้ไข (ค่าเริ่มต้น `uk-table uk-table-divider table`)

ผู้อัปโหลดต้องมีสิทธิ์ `core.create` ใน Media

### ข้อจำกัดที่ทราบ
- บน Joomla 4 ต้องเพิ่มโฟลเดอร์ `files` ที่ **System → Plugins → FileSystem - Local** ก่อน
- วิดีโอที่บันทึกโดยผู้ใช้ภายใต้ Text Filter ต้องเปิด **Content - Colorpack Video Embed** ซึ่งเปิดให้เองตอนติดตั้งครั้งแรก

### การบิลด์
```bash
cd build
npm install
sh make.sh
```
ไฟล์ ZIP สำหรับติดตั้งจะอยู่ที่โฟลเดอร์หลักของโปรเจกต์

### สนับสนุนผู้พัฒนา
ถ้าเครื่องมือนี้ช่วยคุณได้ เลี้ยงกาแฟผู้พัฒนาได้ที่นี่:

<a href="https://buymeacoffee.com/cheuachatchai" >![buy_me_a_coffee](https://github.com/conseilgouz/plg_system_cgwebp_j4/assets/19435246/4fda4cb5-64f1-4717-81ae-c71a0fc26c2d)</a>

### สัญญาอนุญาต
GPL-2.0-or-later รายการไลบรารีที่รวมมาอยู่ใน [`pkg/media/js/THIRD-PARTY.txt`](pkg/media/js/THIRD-PARTY.txt)

© 2026 บริษัท คัลเลอร์แพค ครีเอชั่น จำกัด
