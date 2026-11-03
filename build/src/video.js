// Turns any common YouTube or Vimeo address into a safe embed description.
function seconds(v) {
  if (!v) return 0;
  if (/^\d+$/.test(v)) return Number(v);
  const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i.exec(v);
  return m ? Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0) : 0;
}
const YT_ID = /^[A-Za-z0-9_-]{6,20}$/;
const LIST = /^[A-Za-z0-9_-]{2,64}$/;

export function parseVideoUrl(input) {
  let u;
  try {
    u = new URL(String(input ?? '').trim());
  } catch {
    return null;
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  const host = u.hostname.toLowerCase().replace(/^www\./, '');
  const parts = u.pathname.split('/').filter(Boolean);

  if (['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com', 'youtu.be'].includes(host)) {
    let id = null;
    let shorts = false;
    if (host === 'youtu.be') [id] = parts;
    else if (parts[0] === 'watch') id = u.searchParams.get('v');
    else if (['shorts', 'live', 'embed', 'v'].includes(parts[0])) {
      [, id] = parts;
      shorts = parts[0] === 'shorts';
    }
    if (id === 'videoseries') id = null;
    const list = u.searchParams.get('list');
    const validList = list && LIST.test(list) ? list : null;
    if (id && !YT_ID.test(id)) return null;
    if (!id && !validList) return null;
    const start = seconds(u.searchParams.get('t') || u.searchParams.get('start'));
    const q = new URLSearchParams();
    if (id && validList) q.set('list', validList);
    if (!id) q.set('list', validList);
    if (start) q.set('start', String(start));
    const qs = q.toString();
    return {
      service: 'youtube',
      source: u.href,
      embed: `https://www.youtube-nocookie.com/embed/${id || 'videoseries'}${qs ? `?${qs}` : ''}`,
      width: shorts ? 315 : 560,
      height: shorts ? 560 : 315,
      portrait: shorts,
    };
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const nums = host === 'vimeo.com' ? parts : parts.slice(1);
    if (!/^\d+$/.test(nums[0] ?? '')) return null;
    const hash = /^[a-f0-9]{6,}$/i.test(nums[1] ?? '') ? nums[1] : u.searchParams.get('h');
    const h = hash && /^[a-f0-9]{6,}$/i.test(hash) ? `?h=${hash}` : '';
    const t = /^#t=(\w+)$/.exec(u.hash);
    return {
      service: 'vimeo',
      source: u.href,
      embed: `https://player.vimeo.com/video/${nums[0]}${h}${t && seconds(t[1]) ? `#t=${seconds(t[1])}s` : ''}`,
      width: 640,
      height: 360,
      portrait: false,
    };
  }
  return null;
}

export const VIDEO_PASTE = /^\s*https?:\/\/(?:[\w-]+\.)*(?:youtube\.com|youtube-nocookie\.com|youtu\.be|vimeo\.com)\/\S+\s*$/i;
