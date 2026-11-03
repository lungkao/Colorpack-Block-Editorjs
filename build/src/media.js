// Upload, browser-side resize and the Joomla Media Manager picker.
import Cropper from 'cropperjs';
import cropperCss from 'cropperjs/dist/cropper.min.css';

export const T = (cfg, th, en) => (cfg.lang === 'th-TH' ? th : en);

async function shrink(file, maxWidth) {
  if (!maxWidth || !/^image\/(jpeg|png|webp)$/.test(file.type) || !window.createImageBitmap) return file;
  try {
    const bmp = await createImageBitmap(file);
    if (bmp.width <= maxWidth && (file.size <= 1500000 || file.type === 'image/png')) {
      bmp.close();
      return file;
    }
    const scale = Math.min(1, maxWidth / bmp.width);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    const blob = await new Promise((r) => { canvas.toBlob(r, file.type, 0.85); });
    if (!blob || (scale === 1 && blob.size >= file.size)) return file;
    return new File([blob], file.name, { type: file.type });
  } catch {
    return file;
  }
}

function send(cfg, file, onProgress) {
  return new Promise((resolve, reject) => {
    const body = new FormData();
    body.append('image', file);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', cfg.uploadUrl);
    xhr.setRequestHeader('X-CSRF-Token', cfg.token);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100)); };
    xhr.onerror = () => reject(new Error(T(cfg, 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้', 'Cannot reach the server')));
    xhr.onload = () => {
      let json;
      try {
        json = JSON.parse(xhr.responseText);
      } catch {
        reject(new Error(T(cfg, 'เซสชันอาจหมดอายุ กรุณาเข้าสู่ระบบใหม่', 'Your session may have expired. Please log in again')));
        return;
      }
      if (json.success) resolve(json.url); else reject(new Error(json.message || `HTTP ${xhr.status}`));
    };
    xhr.send(body);
  });
}

// Resolves to the new URL. The promise registered with cfg.track tells a waiting save whether it worked.
export function uploadImage(cfg, file, onProgress, { resize = true } = {}) {
  const job = (async () => send(cfg, resize ? await shrink(file, cfg.maxWidth) : file, onProgress))();
  cfg.track(job.then(() => true, () => false));
  return job;
}

function dialog(cfg, cls) {
  const d = document.createElement('dialog');
  d.className = `cpej-dialog ${cls}`;
  document.body.append(d);
  d.addEventListener('close', () => d.remove());
  return d;
}

function button(text, onClick, primary) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = text;
  if (primary) b.className = 'cpej-primary';
  b.addEventListener('click', onClick);
  return b;
}

export function relativeUrl(cfg, url) {
  return url.startsWith(cfg.rootUrl) ? url.slice(cfg.rootUrl.length) : url;
}

export const previewUrl = (cfg, u) => (/^([a-z][a-z0-9+.-]*:|\/)/i.test(u) ? u : cfg.rootUrl + u);

// Opens com_media in a dialog. Resolves to a site-relative URL or null when cancelled.
export function pickFromMedia(cfg, types = '0') {
  return new Promise((resolve) => {
    const d = dialog(cfg, 'cpej-picker');
    const frame = document.createElement('iframe');
    frame.src = `${cfg.mediaUrl}&mediatypes=${types}`;
    frame.title = T(cfg, 'เลือกไฟล์จากเว็บ', 'Choose from the site');
    let selected = null;
    // Core listeners on this page (such as the Intro Image field) must not react to this selection.
    const onSelect = (e) => {
      e.stopImmediatePropagation();
      selected = e.detail?.path && e.detail.type !== 'dir' ? e.detail : null;
      ok.disabled = !selected;
    };
    document.addEventListener('onMediaFileSelected', onSelect, true);
    const finish = (v) => {
      document.removeEventListener('onMediaFileSelected', onSelect, true);
      d.close();
      resolve(v);
    };
    const ok = button(T(cfg, 'เลือก', 'Select'), async () => {
      ok.disabled = true;
      try {
        const u = new URL(cfg.mediaApi, window.location.origin);
        u.searchParams.set('path', selected.path);
        const res = await fetch(u, { headers: { 'X-CSRF-Token': cfg.token } });
        const json = await res.json();
        const url = json.data?.[0]?.url;
        if (!url) throw new Error('no url');
        finish(relativeUrl(cfg, url));
      } catch {
        ok.disabled = false;
        window.alert(T(cfg, 'อ่านที่อยู่ไฟล์ไม่ได้', 'Could not read the file address'));
      }
    }, true);
    ok.disabled = true;
    const bar = document.createElement('div');
    bar.className = 'cpej-dialog-bar';
    bar.append(button(T(cfg, 'ยกเลิก', 'Cancel'), () => finish(null)), ok);
    d.append(frame, bar);
    d.addEventListener('cancel', (e) => { e.preventDefault(); finish(null); });
    d.showModal();
  });
}

export const canEdit = (cfg, url) => cfg.canUpload && !/\.gif($|[?#])/i.test(url)
  && (!/^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith(cfg.rootUrl));

// Crop and rotate dialog. Resolves to a File, or null when cancelled.
export function editImage(cfg, url) {
  if (!document.getElementById('cpej-cropper-css')) {
    const s = document.createElement('style');
    s.id = 'cpej-cropper-css';
    s.textContent = cropperCss;
    document.head.append(s);
  }
  return new Promise((resolve) => {
    const d = dialog(cfg, 'cpej-editor');
    const wrap = document.createElement('div');
    wrap.className = 'cpej-crop';
    const img = document.createElement('img');
    img.crossOrigin = 'anonymous';
    img.alt = '';
    wrap.append(img);
    let cropper;
    const finish = (v) => { cropper?.destroy(); d.close(); resolve(v); };
    const path = url.split(/[?#]/)[0];
    const name = decodeURIComponent(path.split('/').pop() || 'image.jpg');
    const type = /\.png$/i.test(path) ? 'image/png' : /\.webp$/i.test(path) ? 'image/webp' : 'image/jpeg';
    const bar = document.createElement('div');
    bar.className = 'cpej-dialog-bar';
    bar.append(
      button(T(cfg, 'หมุนซ้าย', 'Rotate left'), () => cropper?.rotate(-90)),
      button(T(cfg, 'หมุนขวา', 'Rotate right'), () => cropper?.rotate(90)),
      button(T(cfg, 'ยกเลิก', 'Cancel'), () => finish(null)),
      button(T(cfg, 'บันทึกเป็นรูปใหม่', 'Save as new image'), () => {
        cropper.getCroppedCanvas({ maxWidth: 4096, maxHeight: 4096 }).toBlob((blob) => {
          finish(blob ? new File([blob], name, { type }) : null);
        }, type, 0.9);
      }, true),
    );
    d.append(wrap, bar);
    d.addEventListener('cancel', (e) => { e.preventDefault(); finish(null); });
    d.showModal();
    img.onload = () => { cropper = new Cropper(img, { viewMode: 1, autoCropArea: 1, background: false }); };
    img.src = previewUrl(cfg, url);
  });
}
