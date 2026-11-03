// HTML <-> Editor.js blocks. HTML stays the stored format. Anything a block cannot
// represent exactly becomes a raw block, so opening an article never loses markup.
const INLINE = new Set(['A', 'B', 'STRONG', 'I', 'EM', 'U', 'MARK', 'CODE', 'BR', 'SUB', 'SUP']);
const INLINE_NAMES = new Set([...INLINE, 'SPAN', 'FONT', 'ABBR', 'SMALL', 'S', 'STRIKE', 'DEL', 'INS', 'Q', 'CITE', 'KBD', 'TIME', 'LABEL']);
const LINK_ATTRS = new Set(['href', 'target', 'rel', 'title']);
const CLASSES = { MARK: 'cdx-marker', CODE: 'inline-code', U: 'cdx-underline' };

export const INLINE_SANITIZE = {
  a: { href: true, target: true, rel: true, title: true },
  b: {}, strong: {}, i: {}, em: {}, sub: {}, sup: {}, br: {},
  mark: { class: 'cdx-marker' }, code: { class: 'inline-code' }, u: { class: 'cdx-underline' },
};

import { parseVideoUrl } from './video.js';

const attrNames = (el) => [...el.attributes].map((a) => a.name);
const hasAttrs = (el) => el.attributes.length > 0;

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function inlineOk(root) {
  return [...root.querySelectorAll('*')].every((el) => {
    if (!INLINE.has(el.tagName)) return false;
    if (el.tagName === 'A') return attrNames(el).every((n) => LINK_ATTRS.has(n));
    return !hasAttrs(el);
  });
}

function toEditorInline(root) {
  root.querySelectorAll('mark,code,u').forEach((el) => el.setAttribute('class', CLASSES[el.tagName]));
  return root.innerHTML.trim();
}

function fromEditorInline(html) {
  const t = document.createElement('template');
  t.innerHTML = html ?? '';
  const swap = (from, to) => t.content.querySelectorAll(from).forEach((el) => {
    const n = document.createElement(to);
    n.append(...el.childNodes);
    el.replaceWith(n);
  });
  swap('b', 'strong');
  swap('i', 'em');
  t.content.querySelectorAll('mark,code,u').forEach((el) => el.removeAttribute('class'));
  return t.innerHTML.trim();
}

const raw = (html) => ({ type: 'raw', data: { html } });
const para = (root) => ({ type: 'paragraph', data: { text: toEditorInline(root) } });

function imageData(img, figure, caption) {
  const attrs = {};
  const laidOut = figure?.hasAttribute('data-width') || figure?.hasAttribute('data-align');
  for (const a of img.attributes) if (a.name !== 'src' && a.name !== 'alt' && !(laidOut && a.name === 'style')) attrs[a.name] = a.value;
  const data = {
    url: img.getAttribute('src') || '', alt: img.getAttribute('alt') ?? '', caption: caption ?? '', attrs,
  };
  if (figure?.getAttribute('class')) data.figureClass = figure.getAttribute('class');
  if (figure?.dataset.width) data.width = figure.dataset.width;
  if (figure?.dataset.align) data.align = figure.dataset.align;
  return { type: 'image', data };
}

function listItems(listEl, checklist) {
  const items = [];
  for (const li of listEl.children) {
    if (li.tagName !== 'LI' || hasAttrs(li)) return null;
    const clone = li.cloneNode(true);
    const meta = {};
    if (checklist) {
      const box = clone.querySelector(':scope > input[type=checkbox]');
      if (!box) return null;
      meta.checked = box.hasAttribute('checked');
      box.remove();
    }
    let children = [];
    const nested = clone.querySelectorAll(':scope > ul, :scope > ol');
    if (nested.length > 1) return null;
    if (nested.length) {
      if (nested[0].tagName !== listEl.tagName || nested[0].nextSibling?.textContent?.trim() || hasAttrs(nested[0]) !== checklist) return null;
      children = listItems(nested[0], checklist);
      if (!children) return null;
      nested[0].remove();
    }
    if (!inlineOk(clone)) return null;
    items.push({ content: toEditorInline(clone), meta, items: children });
  }
  return items;
}

function listBlock(el) {
  const checklist = el.tagName === 'UL' && el.getAttribute('class') === 'editorjs-checklist' && el.attributes.length === 1;
  if (!checklist && (hasAttrs(el) && !(el.tagName === 'OL' && el.attributes.length === 1 && el.hasAttribute('start')))) return null;
  const items = listItems(el, checklist);
  if (!items) return null;
  const meta = el.hasAttribute('start') ? { start: Number(el.getAttribute('start')), counterType: 'numeric' } : (el.tagName === 'OL' ? { counterType: 'numeric' } : {});
  return { type: 'list', data: { style: checklist ? 'checklist' : (el.tagName === 'OL' ? 'ordered' : 'unordered'), meta, items } };
}

function tableBlock(el, opts) {
  const cls = el.getAttribute('class') ?? '';
  if (attrNames(el).some((n) => n !== 'class') || (cls && cls !== opts.tableClass)) return null;
  const head = [...el.querySelectorAll(':scope > thead > tr')];
  const body = [...el.querySelectorAll(':scope > tbody > tr')];
  if (el.querySelector(':scope > caption, :scope > tfoot, :scope > colgroup') || head.length > 1 || !(head.length + body.length)) return null;
  const rows = [...head, ...body];
  const content = [];
  for (const tr of rows) {
    if (hasAttrs(tr)) return null;
    const row = [];
    for (const c of tr.children) {
      const isHeadCell = c.tagName === 'TH' && c.attributes.length === 1 && c.getAttribute('scope') === 'col';
      if ((hasAttrs(c) && !isHeadCell) || !inlineOk(c) || (c.tagName === 'TH') !== head.includes(tr)) return null;
      row.push(toEditorInline(c));
    }
    content.push(row);
  }
  if (content.some((r) => r.length !== content[0].length)) return null;
  return { type: 'table', data: { withHeadings: head.length === 1, withHeadingsColumn: false, content } };
}

function figureBlock(el) {
  if (el.classList.contains('editorjs-embed')) {
    const f = el.querySelector(':scope > iframe');
    const capEl = el.querySelector(':scope > figcaption');
    if (['youtube', 'vimeo'].includes(el.dataset.service)) {
      // The iframe may be gone after a Text Filter; the source address is enough to rebuild it.
      const parsed = parseVideoUrl(el.dataset.source || f?.getAttribute('src'));
      if (parsed) return { type: 'video', data: { ...parsed, caption: capEl?.innerHTML ?? '' } };
    }
    if (!f || !el.dataset.service) return null;
    return {
      type: 'embed',
      data: {
        service: el.dataset.service, source: el.dataset.source || f.src, embed: f.getAttribute('src'),
        width: Number(f.getAttribute('width')) || 580, height: Number(f.getAttribute('height')) || 320,
        caption: el.querySelector(':scope > figcaption')?.innerHTML ?? '',
      },
    };
  }
  const kids = [...el.children];
  const img = kids[0];
  const laidOut = el.hasAttribute('data-width') || el.hasAttribute('data-align');
  const allowed = laidOut ? ['class', 'style', 'data-width', 'data-align'] : ['class'];
  if (img?.tagName !== 'IMG' || kids.length > 2 || attrNames(el).some((n) => !allowed.includes(n))) return null;
  const cap = kids[1];
  if (cap && (cap.tagName !== 'FIGCAPTION' || hasAttrs(cap) || !inlineOk(cap))) return null;
  if ([...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) return null;
  return imageData(img, el, cap ? toEditorInline(cap) : '');
}

function quoteBlock(el) {
  if (hasAttrs(el)) return null;
  const clone = el.cloneNode(true);
  const footer = clone.querySelector(':scope > footer');
  let caption = '';
  if (footer) {
    if (hasAttrs(footer) || !inlineOk(footer)) return null;
    caption = toEditorInline(footer);
    footer.remove();
  }
  const kids = [...clone.children];
  let holder = clone;
  if (kids.length === 1 && kids[0].tagName === 'P' && !hasAttrs(kids[0]) && !clone.textContent.replace(kids[0].textContent, '').trim()) holder = kids[0];
  if (!inlineOk(holder)) return null;
  return { type: 'quote', data: { text: toEditorInline(holder), caption, alignment: 'left' } };
}

function galleryBlock(el) {
  if (el.getAttribute('class') !== 'editorjs-gallery') return null;
  const images = [];
  for (const a of el.children) {
    const img = a.firstElementChild;
    if (a.tagName !== 'A' || img?.tagName !== 'IMG') return null;
    images.push({ url: img.getAttribute('src') || '', alt: img.getAttribute('alt') ?? '' });
  }
  return { type: 'gallery', data: { images, columns: Number(el.dataset.columns) || 3 } };
}

function elementBlock(el, opts) {
  const tag = el.tagName;
  if (/^H[1-6]$/.test(tag)) {
    return !hasAttrs(el) && inlineOk(el) ? { type: 'header', data: { text: toEditorInline(el), level: Number(tag[1]) } } : null;
  }
  switch (tag) {
    case 'P': {
      if (hasAttrs(el)) return null;
      if (el.children.length === 1 && el.firstElementChild.tagName === 'IMG' && !el.textContent.trim()) return imageData(el.firstElementChild, null, '');
      return inlineOk(el) ? para(el) : null;
    }
    case 'HR':
      if (el.id === 'system-readmore' && el.attributes.length === 1) return { type: 'readmore', data: {} };
      return hasAttrs(el) ? null : { type: 'delimiter', data: {} };
    case 'IMG': return imageData(el, null, '');
    case 'FIGURE': return figureBlock(el);
    case 'UL': case 'OL': return listBlock(el);
    case 'BLOCKQUOTE': return quoteBlock(el);
    case 'TABLE': return tableBlock(el, opts);
    case 'DIV': return galleryBlock(el);
    case 'PRE': {
      const c = el.firstElementChild;
      if (hasAttrs(el) || el.children.length !== 1 || c.tagName !== 'CODE' || hasAttrs(c) || el.textContent !== c.textContent) return null;
      return { type: 'code', data: { code: c.textContent } };
    }
    default: return null;
  }
}

export function htmlToBlocks(html, opts = {}) {
  const doc = new DOMParser().parseFromString(`<!doctype html><body>${html ?? ''}`, 'text/html');
  const blocks = [];
  let run = [];
  const flush = () => {
    if (!run.length) return;
    const holder = doc.createElement('div');
    holder.append(...run);
    run = [];
    if (!holder.textContent.trim() && !holder.querySelector('img,br')) return;
    blocks.push(inlineOk(holder) ? para(holder) : raw(holder.innerHTML.trim()));
  };
  for (const node of [...doc.body.childNodes]) {
    if (node.nodeType === 3) { run.push(node); continue; }
    if (node.nodeType === 8) { flush(); blocks.push(raw(`<!--${node.data}-->`)); continue; }
    if (node.nodeType !== 1) continue;
    if (INLINE_NAMES.has(node.tagName)) { run.push(node); continue; }
    flush();
    blocks.push(elementBlock(node, opts) ?? raw(node.outerHTML));
  }
  flush();
  return blocks;
}

function listHtml(data, items) {
  const tag = data.style === 'ordered' ? 'ol' : 'ul';
  const check = data.style === 'checklist';
  const body = items.map((it) => {
    const box = check ? `<input type="checkbox" disabled${it.meta?.checked ? ' checked' : ''}> ` : '';
    const sub = it.items?.length ? listHtml(data, it.items) : '';
    return `<li>${box}${fromEditorInline(it.content)}${sub}</li>`;
  }).join('');
  const cls = check ? ' class="editorjs-checklist"' : '';
  const start = items === data.items && tag === 'ol' && data.meta?.start > 1 ? ` start="${Number(data.meta.start)}"` : '';
  return `<${tag}${cls}${start}>${body}</${tag}>`;
}

function imageLayout(d) {
  const w = /^(25|33|50|75)$/.test(d.width ?? '') ? d.width : null;
  const a = ['left', 'center', 'right'].includes(d.align) ? d.align : null;
  if (!w && !a) return '';
  const width = w ?? (a === 'center' ? 100 : 50);
  const css = { left: 'float:left;margin:0 1rem 1rem 0', right: 'float:right;margin:0 0 1rem 1rem', center: 'margin:0 auto 1rem' }[a] ?? 'margin:0 0 1rem';
  return `${w ? ` data-width="${w}"` : ''}${a ? ` data-align="${a}"` : ''} style="width:${width}%;max-width:100%;${css}"`;
}

function galleryHtml(d) {
  const images = d.images ?? [];
  if (!images.length) return '';
  const cols = [2, 3, 4].includes(Number(d.columns)) ? Number(d.columns) : 3;
  const min = { 2: 320, 3: 220, 4: 160 }[cols];
  const items = images.map((im) => `<a href="${esc(im.url)}"><img src="${esc(im.url)}" alt="${esc(im.alt)}" loading="lazy" style="display:block;width:100%;aspect-ratio:4/3;object-fit:cover"></a>`).join('');
  return `<div class="editorjs-gallery" data-columns="${cols}" uk-lightbox="" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,${min}px),1fr));gap:.75rem;margin:0 0 1rem">${items}</div>`;
}

function videoHtml(d) {
  if (!d.embed) return '';
  const w = Number(d.width) || 560;
  const h = Number(d.height) || 315;
  const cap = fromEditorInline(d.caption);
  const name = d.service === 'vimeo' ? 'Vimeo' : 'YouTube';
  const title = esc(cap.replace(/<[^>]+>/g, '') || `${name} video`);
  const box = d.portrait ? ' style="max-width:315px;margin:0 auto 1rem"' : ' style="margin:0 0 1rem"';
  return `<figure class="editorjs-embed" data-service="${esc(d.service)}" data-source="${esc(d.source)}"${box}>`
    + `<iframe src="${esc(d.embed)}" title="${title}" width="${w}" height="${h}" style="display:block;width:100%;height:auto;aspect-ratio:${w}/${h};border:0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen="" loading="lazy"></iframe>${cap ? `<figcaption>${cap}</figcaption>` : ''}</figure>`;
}

function imageHtml(d) {
  if (!d.url) return '';
  const extra = Object.entries(d.attrs ?? {}).map(([k, v]) => ` ${esc(k)}="${esc(v)}"`).join('');
  const img = `<img src="${esc(d.url)}" alt="${esc(d.alt)}"${extra}>`;
  const cap = fromEditorInline(d.caption);
  const layout = imageLayout(d);
  if (!cap && !d.figureClass && !layout) return img;
  const cls = d.figureClass ? ` class="${esc(d.figureClass)}"` : '';
  const body = layout ? img.replace(/>$/, ' style="width:100%;height:auto">') : img;
  return `<figure${cls}${layout}>${body}${cap ? `<figcaption>${cap}</figcaption>` : ''}</figure>`;
}

function tableHtml(d, opts) {
  const rows = d.content ?? [];
  const cell = (tag, c) => `<${tag}>${fromEditorInline(c)}</${tag}>`;
  const head = d.withHeadings && rows.length ? `<thead><tr>${rows[0].map((c) => `<th scope="col">${fromEditorInline(c)}</th>`).join('')}</tr></thead>` : '';
  const bodyRows = (d.withHeadings ? rows.slice(1) : rows).map((r) => `<tr>${r.map((c) => cell('td', c)).join('')}</tr>`).join('');
  const cls = opts.tableClass ? ` class="${esc(opts.tableClass)}"` : '';
  return `<table${cls}>${head}${bodyRows ? `<tbody>${bodyRows}</tbody>` : ''}</table>`;
}

function embedHtml(d) {
  const w = Number(d.width) || 580;
  const h = Number(d.height) || 320;
  const cap = d.caption ? `<figcaption>${fromEditorInline(d.caption)}</figcaption>` : '';
  return `<figure class="editorjs-embed" data-service="${esc(d.service)}" data-source="${esc(d.source)}">`
    + `<iframe src="${esc(d.embed)}" width="${w}" height="${h}" title="${esc(d.service)}" style="width:100%;height:auto;aspect-ratio:${w}/${h};border:0" allowfullscreen="" loading="lazy"></iframe>${cap}</figure>`;
}

export function blocksToHtml(blocks, opts = {}) {
  return (blocks ?? []).map(({ type, data: d }) => {
    switch (type) {
      case 'paragraph': { const t = fromEditorInline(d.text); return t ? `<p>${t}</p>` : ''; }
      case 'header': { const t = fromEditorInline(d.text); return t ? `<h${d.level}>${t}</h${d.level}>` : ''; }
      case 'list': return d.items?.length ? listHtml(d, d.items) : '';
      case 'quote': {
        const t = fromEditorInline(d.text);
        const c = fromEditorInline(d.caption);
        return t || c ? `<blockquote><p>${t}</p>${c ? `<footer>${c}</footer>` : ''}</blockquote>` : '';
      }
      case 'table': return tableHtml(d, opts);
      case 'code': return d.code ? `<pre><code>${esc(d.code).replace(/&quot;/g, '"')}</code></pre>` : '';
      case 'delimiter': return '<hr>';
      case 'readmore': return '<hr id="system-readmore">';
      case 'image': return imageHtml(d);
      case 'embed': return embedHtml(d);
      case 'video': return videoHtml(d);
      case 'gallery': return galleryHtml(d);
      case 'raw': return d.html ?? '';
      default: return '';
    }
  }).filter(Boolean).join('\n');
}
