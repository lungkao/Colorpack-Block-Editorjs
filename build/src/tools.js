const TH = (cfg, th, en) => (cfg.lang === 'th-TH' ? th : en);

export class ReadMore {
  static get toolbox() {
    return { title: 'Read more', icon: '<svg width="17" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12h3m4 0h2m4 0h3M8 6l4-3 4 3M8 18l4 3 4-3"/></svg>' };
  }
  static get isReadOnlySupported() { return true; }
  static get contentless() { return true; }
  constructor({ config }) { this.cfg = config ?? {}; }
  render() {
    const el = document.createElement('div');
    el.className = 'cpej-readmore';
    el.textContent = TH(this.cfg, 'อ่านต่อ', 'Read more');
    return el;
  }
  save() { return {}; }
}

// Joomla-aware image block: keeps relative paths, #joomlaImage fragments, alt text and other attributes.
export class JoomlaImage {
  static get toolbox() {
    return { title: 'Image', icon: '<svg width="17" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/></svg>' };
  }
  static get isReadOnlySupported() { return true; }
  static get pasteConfig() { return { files: { mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] } }; }
  static get sanitize() {
    return {
      url: true, alt: true, attrs: true, figureClass: true,
      caption: { a: { href: true, target: true, rel: true }, b: {}, strong: {}, i: {}, em: {}, br: {} },
    };
  }
  constructor({ data, config, api, readOnly }) {
    this.data = { url: '', alt: '', caption: '', attrs: {}, ...data };
    this.cfg = config;
    this.api = api;
    this.readOnly = readOnly;
    this.root = document.createElement('div');
    this.root.className = 'cpej-img';
  }
  t(th, en) { return TH(this.cfg, th, en); }
  render() { this.draw(); return this.root; }
  draw() {
    this.root.replaceChildren();
    if (this.data.url) this.drawImage(); else if (!this.readOnly) this.drawEmpty();
  }
  drawImage() {
    const img = document.createElement('img');
    const u = this.data.url;
    img.src = /^([a-z][a-z0-9+.-]*:|\/)/i.test(u) ? u : this.cfg.rootUrl + u;
    img.alt = this.data.alt;
    this.altEl = document.createElement('input');
    this.altEl.type = 'text';
    this.altEl.value = this.data.alt;
    this.altEl.placeholder = this.t('ข้อความแทนรูป (alt)', 'Alternative text (alt)');
    this.altEl.setAttribute('aria-label', this.altEl.placeholder);
    this.altEl.disabled = this.readOnly;
    this.altEl.addEventListener('input', () => { this.data.alt = this.altEl.value; this.changed(); });
    this.capEl = document.createElement('div');
    this.capEl.className = 'cpej-img-caption';
    this.capEl.contentEditable = String(!this.readOnly);
    this.capEl.dataset.placeholder = this.t('คำบรรยายรูป', 'Caption');
    this.capEl.innerHTML = this.data.caption;
    this.root.append(img, this.altEl, this.capEl);
  }
  drawEmpty() {
    const box = document.createElement('div');
    box.className = 'cpej-img-empty';
    if (this.cfg.canUpload) {
      const file = document.createElement('input');
      file.type = 'file';
      file.accept = 'image/jpeg,image/png,image/gif,image/webp';
      file.hidden = true;
      file.addEventListener('change', () => file.files[0] && this.upload(file.files[0]));
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = this.t('อัปโหลดรูป', 'Upload image');
      btn.addEventListener('click', () => file.click());
      box.append(file, btn);
    }
    const url = document.createElement('input');
    url.type = 'url';
    url.placeholder = this.t('หรือวาง URL รูปแล้วกด Enter', 'Or paste an image URL and press Enter');
    url.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      e.stopPropagation();
      if (url.value.trim()) { this.data.url = url.value.trim(); this.draw(); this.changed(); }
    });
    box.append(url);
    this.root.append(box);
  }
  changed() {
    const b = this.api.blocks.getBlockByElement?.(this.root);
    b?.dispatchChange();
  }
  async upload(file) {
    const body = new FormData();
    body.append('image', file);
    this.root.style.opacity = '.5';
    try {
      const res = await fetch(this.cfg.uploadUrl, { method: 'POST', body, credentials: 'same-origin' });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || res.statusText);
      this.data.url = json.url;
      this.draw();
      this.changed();
    } catch (e) {
      this.api.notifier.show({ message: `${this.t('อัปโหลดไม่สำเร็จ', 'Upload failed')}: ${e.message}`, style: 'error' });
    } finally {
      this.root.style.opacity = '';
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

