import {
  T, canEdit, editImage, pickFromMedia, previewUrl, uploadImage,
} from './media.js';
import { parseVideoUrl, VIDEO_PASTE } from './video.js';

const ICON = (d) => `<svg width="17" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${d}</svg>`;
const ACCEPT = 'image/jpeg,image/png,image/gif,image/webp';
const CAPTION_RULES = { a: { href: true, target: true, rel: true }, b: {}, strong: {}, i: {}, em: {}, br: {} };

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
function btn(text, fn) {
  const b = el('button', '', text);
  b.type = 'button';
  b.addEventListener('click', fn);
  return b;
}
function select(label, options, value, fn) {
  const wrap = el('label', 'cpej-select', label);
  const s = document.createElement('select');
  options.forEach(([v, t]) => { const o = el('option', '', t); o.value = v; s.append(o); });
  s.value = value;
  s.addEventListener('change', () => fn(s.value));
  wrap.append(s);
  return wrap;
}
function filePicker(multiple, fn) {
  const f = document.createElement('input');
  f.type = 'file';
  f.accept = ACCEPT;
  f.multiple = multiple;
  f.hidden = true;
  f.addEventListener('change', () => { if (f.files.length) fn([...f.files]); f.value = ''; });
  return f;
}

export class ReadMore {
  static get toolbox() {
    return { title: 'Read more', icon: ICON('<path d="M4 12h3m4 0h2m4 0h3M8 6l4-3 4 3M8 18l4 3 4-3"/>') };
  }
  static get isReadOnlySupported() { return true; }
  static get contentless() { return true; }
  constructor({ config }) { this.cfg = config ?? {}; }
  render() { return el('div', 'cpej-readmore', T(this.cfg, 'อ่านต่อ', 'Read more')); }
  save() { return {}; }
}

export class JoomlaImage {
  static get toolbox() {
    return { title: 'Image', icon: ICON('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>') };
  }
  static get isReadOnlySupported() { return true; }
  static get pasteConfig() { return { files: { mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] } }; }
  static get sanitize() {
    return { url: true, alt: true, attrs: true, figureClass: true, width: true, align: true, caption: CAPTION_RULES };
  }
  constructor({ data, config, api, readOnly }) {
    this.data = { url: '', alt: '', caption: '', attrs: {}, ...data };
    this.cfg = config;
    this.api = api;
    this.readOnly = readOnly;
    this.root = el('div', 'cpej-img');
  }
  t(th, en) { return T(this.cfg, th, en); }
  render() { this.draw(); return this.root; }
  draw() {
    this.root.replaceChildren();
    this.altEl = null;
    if (this.data.url) this.drawImage(); else if (!this.readOnly) this.drawEmpty();
  }
  drawImage() {
    const img = document.createElement('img');
    img.src = previewUrl(this.cfg, this.data.url);
    img.alt = this.data.alt;
    this.imgEl = img;
    const frame = el('div', 'cpej-img-frame');
    frame.append(img);
    this.applyLayout(frame);
    if (this.readOnly) { this.root.append(frame); return; }
    const tools = el('div', 'cpej-img-tools');
    tools.append(
      select(this.t('ขนาด', 'Size'), [['', this.t('เต็ม', 'Full')], ['75', '75%'], ['50', '50%'], ['33', '33%'], ['25', '25%']], this.data.width ?? '', (v) => { this.data.width = v || null; this.applyLayout(frame); this.cfg.markDirty(); }),
      select(this.t('จัดวาง', 'Align'), [['', this.t('ปกติ', 'Normal')], ['left', this.t('ซ้าย', 'Left')], ['center', this.t('กลาง', 'Center')], ['right', this.t('ขวา', 'Right')]], this.data.align ?? '', (v) => { this.data.align = v || null; this.applyLayout(frame); this.cfg.markDirty(); }),
    );
    if (canEdit(this.cfg, this.data.url)) tools.append(btn(this.t('ตัด/หมุน', 'Crop/rotate'), () => this.edit()));
    const file = filePicker(false, ([f]) => this.upload(f));
    if (this.cfg.canUpload) tools.append(file, btn(this.t('เปลี่ยนรูป', 'Replace'), () => file.click()));
    if (this.cfg.canBrowse) tools.append(btn(this.t('เลือกจากเว็บ', 'Choose from site'), () => this.browse()));
    this.altEl = document.createElement('input');
    this.altEl.type = 'text';
    this.altEl.value = this.data.alt;
    this.altEl.placeholder = this.t('ข้อความแทนรูป (alt)', 'Alternative text (alt)');
    this.altEl.setAttribute('aria-label', this.altEl.placeholder);
    this.capEl = el('div', 'cpej-img-caption');
    this.capEl.contentEditable = 'true';
    this.capEl.dataset.placeholder = this.t('คำบรรยายรูป', 'Caption');
    this.capEl.innerHTML = this.data.caption;
    this.root.append(frame, tools, this.altEl, this.capEl);
  }
  applyLayout(frame) {
    const { width, align } = this.data;
    frame.style.width = width ? `${width}%` : '';
    frame.style.marginLeft = align === 'center' || align === 'right' ? 'auto' : '';
    frame.style.marginRight = align === 'center' ? 'auto' : '';
  }
  drawEmpty() {
    const box = el('div', 'cpej-img-empty');
    if (this.cfg.canUpload) {
      const file = filePicker(false, ([f]) => this.upload(f));
      box.append(file, btn(this.t('อัปโหลดรูป', 'Upload image'), () => file.click()));
    }
    if (this.cfg.canBrowse) box.append(btn(this.t('เลือกจากเว็บ', 'Choose from site'), () => this.browse()));
    const url = document.createElement('input');
    url.type = 'url';
    url.placeholder = this.t('หรือวาง URL รูปแล้วกด Enter', 'Or paste an image URL and press Enter');
    url.setAttribute('aria-label', url.placeholder);
    url.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      e.stopPropagation();
      if (url.value.trim()) { this.data.url = url.value.trim(); this.draw(); this.cfg.markDirty(); }
    });
    box.append(url);
    this.root.append(box);
  }
  setUrl(u) {
    if (this.altEl) this.save();
    this.data.url = u;
    delete this.data.attrs.width;
    delete this.data.attrs.height;
    delete this.data.attrs['data-path'];
    this.draw();
    this.cfg.markDirty();
  }
  async browse() {
    const u = await pickFromMedia(this.cfg);
    if (u) this.setUrl(u);
  }
  async edit() {
    const f = await editImage(this.cfg, this.data.url);
    if (f) this.upload(f, { resize: false });
  }
  async upload(file, opts) {
    const bar = el('div', 'cpej-progress', `${this.t('กำลังอัปโหลด', 'Uploading')} ${file.name}`);
    this.root.prepend(bar);
    try {
      this.setUrl(await uploadImage(this.cfg, file, (p) => { bar.textContent = `${this.t('กำลังอัปโหลด', 'Uploading')} ${file.name} ${p}%`; }, opts));
    } catch (e) {
      bar.remove();
      this.api.notifier.show({ message: `${this.t('อัปโหลดไม่สำเร็จ', 'Upload failed')}: ${file.name} (${e.message})`, style: 'error' });
    }
  }
  onPaste(event) {
    if (event.type === 'file') this.upload(event.detail.file);
  }
  validate() { return true; }
  save() {
    if (this.altEl) { this.data.alt = this.altEl.value; this.data.caption = this.capEl.innerHTML.replace(/<br>$/, ''); }
    return this.data;
  }
}

export class JoomlaGallery {
  static get toolbox() {
    return { title: 'Gallery', icon: ICON('<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/>') };
  }
  static get isReadOnlySupported() { return true; }
  static get sanitize() { return { images: true, columns: true }; }
  constructor({ data, config, api, readOnly }) {
    this.data = { images: [], columns: 3, ...data };
    this.cfg = config;
    this.api = api;
    this.readOnly = readOnly;
    this.root = el('div', 'cpej-gallery');
  }
  t(th, en) { return T(this.cfg, th, en); }
  render() { this.draw(); return this.root; }
  draw() {
    this.root.replaceChildren();
    const grid = el('div', 'cpej-gallery-grid');
    grid.style.setProperty('--cols', this.data.columns);
    this.data.images.forEach((im, i) => grid.append(this.tile(im, i)));
    this.grid = grid;
    if (this.readOnly) { this.root.append(grid); return; }
    const tools = el('div', 'cpej-img-tools');
    const file = filePicker(true, (fs) => this.addFiles(fs));
    if (this.cfg.canUpload) tools.append(file, btn(this.t('อัปโหลดหลายรูป', 'Upload images'), () => file.click()));
    if (this.cfg.canBrowse) tools.append(btn(this.t('เลือกจากเว็บ', 'Choose from site'), () => this.browse()));
    tools.append(select(this.t('คอลัมน์', 'Columns'), [['2', '2'], ['3', '3'], ['4', '4']], String(this.data.columns), (v) => {
      this.data.columns = Number(v);
      grid.style.setProperty('--cols', v);
      this.cfg.markDirty();
    }));
    this.root.append(tools, grid);
  }
  tile(im, i) {
    const t = el('div', 'cpej-gallery-tile');
    const img = document.createElement('img');
    img.src = previewUrl(this.cfg, im.url);
    img.alt = im.alt;
    t.append(img);
    if (this.readOnly) return t;
    const alt = document.createElement('input');
    alt.type = 'text';
    alt.value = im.alt;
    alt.placeholder = this.t('ข้อความแทนรูป (alt)', 'Alternative text (alt)');
    alt.setAttribute('aria-label', alt.placeholder);
    alt.addEventListener('input', () => { im.alt = alt.value; this.cfg.markDirty(); });
    const row = el('div', 'cpej-gallery-row');
    const move = (d) => {
      const list = this.data.images;
      const j = i + d;
      if (j < 0 || j >= list.length) return;
      [list[i], list[j]] = [list[j], list[i]];
      this.draw();
      this.cfg.markDirty();
    };
    const label = (b, s) => { b.setAttribute('aria-label', s); b.title = s; return b; };
    row.append(
      label(btn('←', () => move(-1)), this.t('ย้ายไปก่อนหน้า', 'Move back')),
      label(btn('→', () => move(1)), this.t('ย้ายไปถัดไป', 'Move forward')),
      label(btn('×', () => { this.data.images.splice(i, 1); this.draw(); this.cfg.markDirty(); }), this.t('ลบรูป', 'Remove image')),
    );
    t.append(alt, row);
    return t;
  }
  async browse() {
    const u = await pickFromMedia(this.cfg);
    if (u) { this.data.images.push({ url: u, alt: '' }); this.draw(); this.cfg.markDirty(); }
  }
  async addFiles(files) {
    const queue = files.map((file) => {
      const entry = { file, url: null, tile: el('div', 'cpej-gallery-tile cpej-progress', `${file.name} 0%`) };
      this.grid.append(entry.tile);
      return entry;
    });
    const failed = [];
    let next = 0;
    const worker = async () => {
      while (next < queue.length) {
        const entry = queue[next];
        next += 1;
        try {
          entry.url = await uploadImage(this.cfg, entry.file, (p) => { entry.tile.textContent = `${entry.file.name} ${p}%`; });
        } catch (e) {
          failed.push(`${entry.file.name} (${e.message})`);
        }
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    queue.forEach((q) => { if (q.url) this.data.images.push({ url: q.url, alt: '' }); });
    this.draw();
    this.cfg.markDirty();
    if (failed.length) this.api.notifier.show({ message: `${this.t('อัปโหลดไม่สำเร็จ', 'Upload failed')}: ${failed.join(', ')}`, style: 'error', time: 10000 });
  }
  validate() { return true; }
  save() { return this.data; }
}

export class VideoEmbed {
  static get toolbox() {
    return { title: 'Video', icon: ICON('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 9 5 3-5 3z"/>') };
  }
  static get isReadOnlySupported() { return true; }
  static get pasteConfig() { return { patterns: { video: VIDEO_PASTE } }; }
  static get sanitize() {
    return { service: true, source: true, embed: true, width: true, height: true, portrait: true, caption: CAPTION_RULES };
  }
  constructor({ data, config, api, readOnly }) {
    this.data = { caption: '', ...data };
    this.cfg = config;
    this.api = api;
    this.readOnly = readOnly;
    this.root = el('div', 'cpej-video');
  }
  t(th, en) { return T(this.cfg, th, en); }
  render() { this.draw(); return this.root; }
  draw() {
    this.root.replaceChildren();
    this.capEl = null;
    if (!this.data.embed) { if (!this.readOnly) this.drawEmpty(); return; }
    const frame = document.createElement('iframe');
    frame.src = this.data.embed;
    frame.title = this.data.service === 'vimeo' ? 'Vimeo' : 'YouTube';
    frame.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    frame.allowFullscreen = true;
    frame.style.aspectRatio = `${this.data.width}/${this.data.height}`;
    if (this.data.portrait) frame.style.maxWidth = '315px';
    this.root.append(frame);
    if (this.cfg.iframeFiltered && !this.cfg.embedPlugin) {
      this.root.append(el('div', 'cpej-warning', this.t(
        'สิทธิ์ของบัญชีนี้ถูก Text Filter ตัดวิดีโอออกตอนบันทึก กรุณาเปิดปลั๊กอิน Content - Colorpack Video Embed หรือให้ผู้ดูแลปรับ Text Filter',
        'Text Filters will remove this video when this account saves. Enable the Content - Colorpack Video Embed plugin or ask an administrator to change the Text Filters.',
      )));
    }
    if (this.readOnly) return;
    this.capEl = el('div', 'cpej-img-caption');
    this.capEl.contentEditable = 'true';
    this.capEl.dataset.placeholder = this.t('คำบรรยายวิดีโอ', 'Caption');
    this.capEl.innerHTML = this.data.caption;
    this.root.append(this.capEl);
  }
  drawEmpty() {
    const input = document.createElement('input');
    input.type = 'url';
    input.placeholder = this.t('วางลิงก์ YouTube หรือ Vimeo แล้วกด Enter', 'Paste a YouTube or Vimeo link and press Enter');
    input.setAttribute('aria-label', input.placeholder);
    input.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      e.stopPropagation();
      this.apply(input.value);
    });
    this.root.append(input);
    setTimeout(() => input.focus());
  }
  apply(url) {
    const parsed = parseVideoUrl(url);
    if (!parsed) {
      this.api.notifier.show({ message: this.t('ไม่รู้จักลิงก์วิดีโอนี้', 'This video link is not recognised'), style: 'error' });
      return;
    }
    Object.assign(this.data, parsed);
    this.draw();
    this.cfg.markDirty();
  }
  onPaste(event) {
    if (event.type === 'pattern') this.apply(event.detail.data);
  }
  validate() { return true; }
  save() {
    if (this.capEl) this.data.caption = this.capEl.innerHTML.replace(/<br>$/, '');
    return this.data;
  }
}
