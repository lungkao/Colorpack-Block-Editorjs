# Colorpack Block Editor.js

ปลั๊กอิน Editor สำหรับ Joomla 4.4, 5 และ 6 ใช้ [Editor.js](https://editorjs.io) แก้เนื้อหาแบบบล็อก เนื้อหายังเก็บเป็น HTML ปกติ
A block editor plugin for Joomla 4.4, 5 and 6, based on Editor.js. Content stays stored as normal HTML.

## ติดตั้ง / Install
1. System → Install → Extensions แล้วอัปโหลด `colorpack-block-editorjs-1.0.0.zip` / upload the ZIP.
2. Global Configuration → Default Editor → **Colorpack Block Editor.js**

ต้องการ PHP 8.1 ขึ้นไป / Requires PHP 8.1+.

## การทำงาน / How it works
- เปิดบทความ: แปลง HTML เป็นบล็อก ส่วนที่แปลงตรงตัวไม่ได้จะเป็นบล็อก HTML เพื่อไม่ให้โค้ดหาย
  On open, HTML becomes blocks. Anything a block cannot represent exactly stays as a raw HTML block.
- บันทึกโดยไม่แก้ไข: HTML เดิมไม่เปลี่ยน / Saving without edits leaves the original HTML untouched.
- ปุ่ม `HTML` สลับไปแก้โค้ดได้ / The `HTML` button switches to the source.
- ปุ่มของ Joomla (Media, Article, Read More, Page Break ฯลฯ) ใช้ได้ตามปกติ / Joomla editor buttons work as usual.
- อัปโหลดรูป JPG, PNG, GIF, WebP ต้องมีสิทธิ์สร้างไฟล์ใน Media / Uploads need `core.create` on com_media.

## บิลด์ / Build
```
cd build && npm install && sh make.sh
```

## License
GPL-2.0-or-later. Bundled libraries: see `pkg/media/js/THIRD-PARTY.txt`.
© 2026 COLORPACK CREATION CO., LTD.
