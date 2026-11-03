import EditorJS from '@editorjs/editorjs';
import Header from '@editorjs/header';
import List from '@editorjs/list';
import Quote from '@editorjs/quote';
import Table from '@editorjs/table';
import Code from '@editorjs/code';
import Delimiter from '@editorjs/delimiter';
import Embed from '@editorjs/embed';
import Marker from '@editorjs/marker';
import InlineCode from '@editorjs/inline-code';
import Underline from '@editorjs/underline';
import Raw from '@editorjs/raw';
import { blocksToHtml, htmlToBlocks, INLINE_SANITIZE } from './convert.js';
import { JoomlaGallery, JoomlaImage, ReadMore, VideoEmbed } from './tools.js';
import { cleanPasted, needsCleaning } from './paste.js';
import { th } from './i18n.js';

const live = new Set();
// Resolves to false when an upload failed while waiting, so the form is not submitted without that file.
const flushAll = async (editors = [...live]) => {
  const results = await Promise.all(editors.map((e) => e.prepareSubmit()));
  return results.every(Boolean);
};

class KeepLinks {
  static get isTune() { return true; }
  static get sanitize() { return INLINE_SANITIZE; }
  render() { return document.createElement('div'); }
  save() { return undefined; }
}

function guardSubmit() {
  if (guardSubmit.done) return;
  guardSubmit.done = true;
  if (window.Joomla?.submitform) {
    const original = Joomla.submitform;
    Joomla.submitform = function submitform(...args) {
      flushAll().then((ok) => { if (ok) original.apply(this, args); });
    };
  }
  document.addEventListener('submit', (e) => {
    const editors = [...live].filter((x) => (x.dirty || x.pending.size) && e.target.contains(x));
    if (!editors.length) return;
    e.preventDefault();
    flushAll(editors).then((ok) => { if (ok) e.target.requestSubmit(e.submitter); });
  }, true);
  window.addEventListener('beforeunload', (e) => {
    if ([...live].some((x) => x.pending.size)) e.preventDefault();
  });
}

class JoomlaEditorEditorjs extends HTMLElement {
  async connectedCallback() {
    if (this.editor) {
      // Moved in the page, for example a subform row: register again.
      live.add(this);
      this.registerApi();
      return;
    }
    this.cfg = JSON.parse(this.dataset.config);
    this.pending = new Set();
    this.cfg.markDirty = () => this.markDirty();
    this.cfg.track = (job) => {
      this.pending.add(job);
      job.then((ok) => { this.pending.delete(job); if (!ok) this.uploadFailed = true; });
    };
    this.history = [];
    this.future = [];
    this.textarea = this.querySelector('textarea');
    this.dirty = false;
    this.buildUi();
    const ready = this.start(this.textarea.value);
    live.add(this);
    guardSubmit();
    await Promise.all([ready, this.registerApi()]);
    await this.snapshot();
  }

  disconnectedCallback() {
    live.delete(this);
    if (this.unregister) this.unregister();
  }

  buildUi() {
    const box = document.createElement('div');
    box.className = 'cpej-box';
    const bar = document.createElement('div');
    bar.className = 'cpej-bar';
    this.sourceBtn = document.createElement('button');
    this.sourceBtn.type = 'button';
    this.sourceBtn.textContent = 'HTML';
    this.sourceBtn.setAttribute('aria-pressed', 'false');
    this.sourceBtn.addEventListener('click', () => this.toggleSource());
    const th = this.cfg.lang === 'th-TH';
    this.undoBtn = this.barButton(th ? 'เลิกทำ' : 'Undo', () => this.undo());
    this.redoBtn = this.barButton(th ? 'ทำซ้ำ' : 'Redo', () => this.redo());
    this.undoBtn.disabled = true;
    this.redoBtn.disabled = true;
    bar.append(this.undoBtn, this.redoBtn, this.sourceBtn);
    this.holder = document.createElement('div');
    this.holder.className = 'cpej-holder';
    box.append(bar, this.holder);
    this.prepend(box);
    box.append(this.textarea);
    this.textarea.classList.add('cpej-source');
    if (this.cfg.readonly) bar.hidden = true;

    this.holder.addEventListener('paste', (e) => this.onPaste(e), true);
    this.holder.addEventListener('keydown', (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z' || !this.structural) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.shiftKey) this.redo(); else this.undo();
    }, true);
    const touched = () => this.markDirty();
    this.holder.addEventListener('input', touched);
    this.addEventListener('focusin', () => this.activate());
    this.addEventListener('click', () => this.activate());
    document.addEventListener('selectionchange', () => {
      const s = document.getSelection();
      if (s.rangeCount && this.holder.contains(s.anchorNode)) this.range = s.getRangeAt(0).cloneRange();
    });
  }

  barButton(text, fn) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = text;
    b.addEventListener('click', fn);
    return b;
  }

  onPaste(e) {
    const html = e.clipboardData?.getData('text/html');
    if (!html || !needsCleaning(html) || e.target.closest?.('.tc-table, input, textarea, .cpej-img-caption')) return;
    e.preventDefault();
    e.stopPropagation();
    const { html: clean, droppedImages } = cleanPasted(html, this.cfg);
    this.insertBlocks(htmlToBlocks(clean, this.cfg));
    if (droppedImages) {
      const th = this.cfg.lang === 'th-TH';
      this.editor.notifier.show({
        message: th ? `คัดลอกรูปจากเอกสารไม่ได้ ${droppedImages} รูป กรุณาอัปโหลดแยก` : `${droppedImages} image(s) could not be copied from the document. Please upload them separately.`,
        style: 'error',
        time: 8000,
      });
    }
  }

  insertBlocks(blocks) {
    const api = this.editor.blocks;
    let index = api.getCurrentBlockIndex();
    const current = index >= 0 ? api.getBlockByIndex(index) : null;
    const replace = current?.name === 'paragraph' && current.isEmpty;
    index = index < 0 ? api.getBlocksCount() : index + (replace ? 0 : 1);
    blocks.forEach((b, i) => api.insert(b.type, b.data, undefined, index + i, false, replace && i === 0));
    this.markDirty();
  }

  async snapshot() {
    if (this.source) return;
    const { blocks } = await this.editor.save();
    const json = JSON.stringify(blocks.map(({ type, data }) => ({ type, data })));
    const last = this.history[this.history.length - 1];
    if (json === last) return;
    this.structural = !!last && JSON.parse(last).length !== blocks.length;
    this.history.push(json);
    if (this.history.length > 50) this.history.shift();
    this.future = [];
    this.updateHistoryButtons();
  }

  updateHistoryButtons() {
    this.undoBtn.disabled = this.history.length < 2;
    this.redoBtn.disabled = !this.future.length;
  }

  async restore(json) {
    this.restoring = true;
    clearTimeout(this.timer);
    this.dirty = false;
    const blocks = JSON.parse(json);
    if (blocks.length) await this.editor.render({ blocks }); else await this.editor.clear();
    this.textarea.value = blocksToHtml(blocks, this.cfg);
    this.dirty = false;
    clearTimeout(this.timer);
    this.restoring = false;
    this.updateHistoryButtons();
  }

  async undo() {
    if (this.source) return;
    await this.flush();
    if (this.history.length < 2) return;
    this.future.push(this.history.pop());
    this.structural = true;
    await this.restore(this.history[this.history.length - 1]);
  }

  async redo() {
    if (this.source || !this.future.length) return;
    const json = this.future.pop();
    this.history.push(json);
    await this.restore(json);
  }

  tools() {
    const th = this.cfg.lang === 'th-TH';
    const inline = ['link', 'bold', 'italic', 'underline', 'marker', 'inlineCode'];
    return {
      keepLinks: KeepLinks,
      paragraph: { inlineToolbar: inline },
      header: { class: Header, inlineToolbar: inline, config: { levels: [1, 2, 3, 4, 5, 6], defaultLevel: 2 } },
      list: { class: List, inlineToolbar: inline, config: { defaultStyle: 'unordered' } },
      image: { class: JoomlaImage, config: this.cfg, tunes: [] },
      gallery: { class: JoomlaGallery, config: this.cfg, tunes: [] },
      video: { class: VideoEmbed, config: this.cfg, tunes: [] },
      quote: { class: Quote, inlineToolbar: inline, config: th ? { quotePlaceholder: 'พิมพ์คำพูด', captionPlaceholder: 'ผู้กล่าว' } : {} },
      table: { class: Table, inlineToolbar: inline, config: { rows: 2, cols: 3 } },
      embed: { class: Embed, config: { services: { facebook: true, instagram: true, twitter: true, codepen: true } } },
      code: { class: Code, config: th ? { placeholder: 'พิมพ์โค้ด' } : {} },
      delimiter: { class: Delimiter },
      raw: { class: Raw, config: { placeholder: 'HTML', defaultHeight: 90 } },
      readmore: { class: ReadMore, config: this.cfg },
      marker: { class: Marker },
      inlineCode: { class: InlineCode },
      underline: { class: Underline },
    };
  }

  async start(html) {
    this.editor = new EditorJS({
      holder: this.holder,
      tools: this.tools(),
      tunes: ['keepLinks'],
      data: { blocks: htmlToBlocks(html, this.cfg) },
      readOnly: this.cfg.readonly,
      minHeight: 80,
      placeholder: this.cfg.lang === 'th-TH' ? 'พิมพ์เนื้อหา หรือกด / เพื่อเลือกบล็อก' : 'Type here, or press / to choose a block',
      i18n: { direction: this.cfg.rtl ? 'rtl' : 'ltr', ...(this.cfg.lang === 'th-TH' ? th : {}) },
      onChange: () => this.markDirty(),
    });
    await this.editor.isReady;
  }

  markDirty() {
    if (this.restoring) return;
    this.dirty = true;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush().catch(console.error), 250);
  }

  async flush() {
    if (!this.dirty || this.source) return;
    this.dirty = false;
    clearTimeout(this.timer);
    const { blocks } = await this.editor.save();
    this.textarea.value = blocksToHtml(blocks, this.cfg);
    await this.snapshot();
  }

  // Waits for running uploads, then writes the content. False means do not submit.
  async prepareSubmit() {
    if (this.pending.size) {
      this.uploadFailed = false;
      this.editor.notifier.show({ message: this.cfg.lang === 'th-TH' ? 'กำลังอัปโหลดรูป จะบันทึกให้เมื่ออัปโหลดเสร็จ' : 'Uploading images. The article will save when they finish.', time: 4000 });
      while (this.pending.size) {
        // eslint-disable-next-line no-await-in-loop
        await Promise.all([...this.pending]);
      }
      // Lets the block that finished uploading record its new address.
      await new Promise((r) => { setTimeout(r); });
      if (this.uploadFailed) {
        this.editor.notifier.show({ message: this.cfg.lang === 'th-TH' ? 'มีรูปอัปโหลดไม่สำเร็จ ยังไม่ได้บันทึก กรุณาตรวจแล้วกดบันทึกอีกครั้ง' : 'An image failed to upload, so nothing was saved. Check it and save again.', style: 'error', time: 8000 });
        return false;
      }
    }
    try {
      await this.flush();
    } catch (err) {
      console.error('Editor.js save failed', err);
      return false;
    }
    return true;
  }

  async toggleSource() {
    if (this.source) {
      this.source = false;
      this.textarea.hidden = true;
      this.holder.hidden = false;
      await this.setValue(this.textarea.value);
    } else {
      await this.flush();
      this.source = true;
      this.holder.hidden = true;
      this.textarea.hidden = false;
      this.textarea.focus();
    }
    this.sourceBtn.setAttribute('aria-pressed', String(this.source));
    this.sourceBtn.textContent = this.source ? (this.cfg.lang === 'th-TH' ? 'กลับไปแก้แบบบล็อก' : 'Back to blocks') : 'HTML';
  }

  getValue() { return this.textarea.value; }

  async setValue(html) {
    this.textarea.value = html ?? '';
    this.dirty = false;
    if (this.source) return;
    const blocks = htmlToBlocks(html, this.cfg);
    if (blocks.length) await this.editor.render({ blocks });
    else await this.editor.clear();
    this.dirty = false;
  }

  getSelection() {
    return this.range && !this.range.collapsed ? this.range.toString() : '';
  }

  // Used by the Joomla editor buttons (Article, Image, Read more, Page break, Media...).
  replaceSelection(html) {
    if (this.source) {
      const t = this.textarea;
      t.setRangeText(html, t.selectionStart, t.selectionEnd, 'end');
      return;
    }
    const blocks = htmlToBlocks(html, this.cfg);
    const inlineOnly = blocks.length === 1 && blocks[0].type === 'paragraph' && !/^\s*<p[\s>]/i.test(html);
    if (inlineOnly && this.range && this.holder.contains(this.range.startContainer)
      && this.range.startContainer.parentElement?.closest('[contenteditable=true]')) {
      const s = document.getSelection();
      s.removeAllRanges();
      s.addRange(this.range);
      document.execCommand('insertHTML', false, blocks[0].data.text);
    } else {
      this.insertBlocks(blocks);
    }
    this.markDirty();
  }

  async registerApi() {
    const el = this;
    const id = this.textarea.id;
    const methods = {
      getValue: () => el.getValue(),
      setValue(v) { el.setValue(v); return this; },
      getSelection: () => el.getSelection(),
      replaceSelection(v) { el.replaceSelection(v); return this; },
      disable(enable) { el.editor.readOnly.toggle(enable === false ? true : !enable); return this; },
    };
    let api;
    try {
      api = await import('editor-api');
    } catch {
      api = null;
    }
    if (api?.JoomlaEditorDecorator) {
      class Decorator extends api.JoomlaEditorDecorator {}
      Object.assign(Decorator.prototype, methods);
      const dec = new Decorator(this, 'editorjs', id);
      api.JoomlaEditor.register(dec);
      this.activate = () => api.JoomlaEditor.setActive(id);
      this.unregister = () => api.JoomlaEditor.unregister(id);
    } else {
      window.Joomla = window.Joomla || {};
      Joomla.editors = Joomla.editors || { instances: {} };
      Joomla.editors.instances[id] = { id, element: this.textarea, ...methods };
      this.unregister = () => delete Joomla.editors.instances[id];
    }
  }

  activate() {}
}

customElements.define('joomla-editor-editorjs', JoomlaEditorEditorjs);
