/**
 * Helpers for surveillance feeds: YouTube embeds (clip + loop) vs direct video files.
 */

const YT_CLIP_START_SEC = 0;
const YT_CLIP_END_SEC = 120; // ~2 minutes per user request

export function isDirectVideoUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const u = url.trim().toLowerCase();
  if (u.startsWith('/videos/')) return true;
  if (u.endsWith('.mp4') || u.endsWith('.webm') || u.endsWith('.ogg')) return true;
  if (u.includes('.mp4?') || u.includes('.webm?')) return true;
  return false;
}

function extractYoutubeId(raw) {
  const s = raw.trim();
  const live = s.match(/youtube\.com\/live\/([^?&/#]+)/i);
  if (live) return live[1];
  const watch = s.match(/[?&]v=([^?&/#]+)/i);
  if (watch) return watch[1];
  const shortU = s.match(/youtu\.be\/([^?&/#]+)/i);
  if (shortU) return shortU[1];
  const embed = s.match(/youtube\.com\/embed\/([^?&/#]+)/i);
  if (embed) return embed[1];
  if (/^[a-z0-9_-]{11}$/i.test(s)) return s;
  return null;
}

/**
 * Build embed URL with a fixed window (start/end seconds) and looping.
 * For live streams, YouTube may still treat content as live; clip window works best on VOD/replays.
 */
export function toYoutubeEmbedUrl(raw) {
  if (!raw || typeof raw !== 'string') return '';
  const trimmed = raw.trim();

  if (trimmed.includes('youtube.com/embed')) {
    try {
      const url = new URL(trimmed);
      if (!url.searchParams.has('start')) {
        url.searchParams.set('start', String(YT_CLIP_START_SEC));
      }
      if (!url.searchParams.has('end')) {
        url.searchParams.set('end', String(YT_CLIP_END_SEC));
      }
      url.searchParams.set('loop', '1');
      const pathId = url.pathname.split('/').filter(Boolean).pop();
      if (pathId && !url.searchParams.get('playlist')) {
        url.searchParams.set('playlist', pathId);
      }
      url.searchParams.set('rel', '0');
      return url.toString();
    } catch {
      return trimmed;
    }
  }

  const id = extractYoutubeId(trimmed);
  if (!id) return trimmed;

  const params = new URLSearchParams({
    rel: '0',
    start: String(YT_CLIP_START_SEC),
    end: String(YT_CLIP_END_SEC),
    loop: '1',
    playlist: id,
  });
  return `https://www.youtube.com/embed/${id}?${params.toString()}`;
}

/** Use relative /videos/... as-is; optional absolute for cross-origin edge cases. */
export function resolveDirectVideoSrc(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return url;
}
