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
import { JoomlaImage, ReadMore } from './tools.js';
import { th } from './i18n.js';

const live = new Set();
const flushAll = () => Promise.all([...live].map((e) => e.flush().catch((err) => console.error('Editor.js save failed', err))));

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
      flushAll().then(() => original.apply(this, args));
    };
  }
  document.addEventListener('submit', (e) => {
    const editors = [...live].filter((x) => x.dirty && e.target.contains(x));
    if (!editors.length) return;
    e.preventDefault();
    Promise.all(editors.map((x) => x.flush())).then(() => e.target.requestSubmit(e.submitter));
  }, true);
}

class JoomlaEditorEditorjs extends HTMLElement {
  async connectedCallback() {
    if (this.editor) return;
    this.cfg = JSON.parse(this.dataset.config);
    this.textarea = this.querySelector('textarea');
    this.dirty = false;
    this.buildUi();
    const ready = this.start(this.textarea.value);
    live.add(this);
    guardSubmit();
    await Promise.all([ready, this.registerApi()]);
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
    bar.append(this.sourceBtn);
    this.holder = document.createElement('div');
    this.holder.className = 'cpej-holder';
    box.append(bar, this.holder);
    this.prepend(box);
    box.append(this.textarea);
    this.textarea.classList.add('cpej-source');
    if (this.cfg.readonly) bar.hidden = true;

    const touched = () => this.markDirty();
    this.holder.addEventListener('input', touched);
    this.addEventListener('focusin', () => this.activate());
    this.addEventListener('click', () => this.activate());
    document.addEventListener('selectionchange', () => {
      const s = document.getSelection();
      if (s.rangeCount && this.holder.contains(s.anchorNode)) this.range = s.getRangeAt(0).cloneRange();
    });
  }

  tools() {
    const inline = ['link', 'bold', 'italic', 'underline', 'marker', 'inlineCode'];
    return {
      keepLinks: KeepLinks,
      paragraph: { inlineToolbar: inline },
      header: { class: Header, inlineToolbar: inline, config: { levels: [1, 2, 3, 4, 5, 6], defaultLevel: 2 } },
      list: { class: List, inlineToolbar: inline, config: { defaultStyle: 'unordered' } },
      image: { class: JoomlaImage, config: this.cfg, tunes: [] },
      quote: { class: Quote, inlineToolbar: inline },
      table: { class: Table, inlineToolbar: inline, config: { rows: 2, cols: 3 } },
      embed: { class: Embed, config: { services: { youtube: true, vimeo: true, facebook: true, instagram: true, twitter: true, codepen: true } } },
      code: { class: Code },
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
      const api = this.editor.blocks;
      let index = api.getCurrentBlockIndex();
      index = index < 0 ? api.getBlocksCount() : index + 1;
      blocks.forEach((b, i) => api.insert(b.type, b.data, undefined, index + i, false));
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
