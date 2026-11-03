// Cleans HTML from Word, Excel and similar programs before it becomes blocks.
const KEEP = { A: ['href'], IMG: ['src', 'alt'], TD: ['rowspan', 'colspan'], TH: ['rowspan', 'colspan'] };

export const needsCleaning = (html) => /<table[\s>]|class="?Mso|urn:schemas-microsoft|mso-list|<o:p/i.test(html);

function listInfo(p) {
  const style = p.getAttribute('style') || '';
  const m = /mso-list:\s*\S+\s+level(\d+)/i.exec(style);
  if (!m && !/MsoList/i.test(p.className)) return null;
  const marker = [...p.querySelectorAll('*')].find((e) => /mso-list:\s*Ignore/i.test(e.getAttribute('style') || ''));
  let text = marker ? marker.textContent.trim() : '';
  if (marker) marker.remove();
  else {
    const first = p.firstChild;
    const found = first?.nodeType === 3 ? /^\s*((?:\d+|[a-zก-ฮ])[.)]|[·•§o-])\s+/.exec(first.data) : null;
    if (!found) return null;
    text = found[1];
    first.data = first.data.slice(found[0].length);
  }
  return { level: m ? Number(m[1]) : 1, ordered: /^\(?(\d+|[a-zก-ฮ])[.)]/i.test(text) };
}

function convertLists(doc) {
  for (const p of [...doc.querySelectorAll('p')]) {
    if (!p.isConnected) continue;
    const info = listInfo(p);
    if (!info) continue;
    const root = doc.createElement(info.ordered ? 'ol' : 'ul');
    p.before(root);
    const stack = [{ el: root, level: info.level }];
    let cur = p;
    let curInfo = info;
    while (cur && curInfo) {
      while (stack.length > 1 && curInfo.level < stack[stack.length - 1].level) stack.pop();
      if (curInfo.level > stack[stack.length - 1].level) {
        const sub = doc.createElement(curInfo.ordered ? 'ol' : 'ul');
        const parent = stack[stack.length - 1].el.lastElementChild;
        if (parent) { parent.append(sub); stack.push({ el: sub, level: curInfo.level }); }
      }
      const li = doc.createElement('li');
      li.append(...cur.childNodes);
      stack[stack.length - 1].el.append(li);
      const next = cur.nextElementSibling;
      cur.remove();
      cur = next?.tagName === 'P' ? next : null;
      curInfo = cur ? listInfo(cur) : null;
    }
  }
}

export function cleanPasted(html, opts = {}) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const walker = doc.createTreeWalker(doc, NodeFilter.SHOW_COMMENT);
  const comments = [];
  while (walker.nextNode()) comments.push(walker.currentNode);
  comments.forEach((c) => c.remove());
  doc.querySelectorAll('style,meta,link,title,xml,script').forEach((e) => e.remove());
  convertLists(doc);

  let droppedImages = 0;
  doc.querySelectorAll('img').forEach((img) => {
    if (!/^https?:\/\//i.test(img.getAttribute('src') || '')) { img.remove(); droppedImages += 1; }
  });
  [...doc.body.querySelectorAll('*')].forEach((el) => {
    if (/^(SPAN|FONT|O:P|ST1:.*|COL|COLGROUP)$/.test(el.tagName)) {
      if (/^(COL|COLGROUP)$/.test(el.tagName)) el.remove(); else el.replaceWith(...el.childNodes);
      return;
    }
    const keep = KEEP[el.tagName] ?? [];
    [...el.attributes].forEach((a) => { if (!keep.includes(a.name)) el.removeAttribute(a.name); });
  });
  doc.querySelectorAll('td,th').forEach((c) => {
    const ps = [...c.querySelectorAll(':scope > p')];
    ps.forEach((p, i) => {
      if (i) p.before(doc.createElement('br'));
      p.replaceWith(...p.childNodes);
    });
    c.innerHTML = c.innerHTML.trim();
  });
  doc.querySelectorAll('p').forEach((p) => {
    if (!p.textContent.replace(/ /g, ' ').trim() && !p.querySelector('img')) p.remove();
  });
  if (opts.tableClass) doc.querySelectorAll('table').forEach((t) => t.setAttribute('class', opts.tableClass));
  return { html: doc.body.innerHTML.trim(), droppedImages };
}
