import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import {
  isDirectVideoUrl,
  toYoutubeEmbedUrl,
  resolveDirectVideoSrc,
} from '../utils/feedVideo';

/**
 * HTML5 video: supports pause/resume + canvas capture. YouTube iframe: playback not controllable here.
 */
const FeedVideoPlayer = forwardRef(function FeedVideoPlayer(
  {
    url,
    title = 'Feed',
    className = 'w-full h-full min-h-[180px] object-cover',
    iframeSandbox = 'allow-same-origin allow-scripts allow-popups allow-forms',
    paused = false,
  },
  ref
) {
  const videoRef = useRef(null);

  useImperativeHandle(
    ref,
    () => ({
      pause: () => videoRef.current?.pause(),
      play: () => videoRef.current?.play()?.catch(() => {}),
      captureDataUrl: (quality = 0.85) => {
        const v = videoRef.current;
        if (!v || v.readyState < 2) return null;
        const w = v.videoWidth;
        const h = v.videoHeight;
        if (!w || !h) return null;
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const ctx = c.getContext('2d');
        if (!ctx) return null;
        ctx.drawImage(v, 0, 0, w, h);
        try {
          return c.toDataURL('image/jpeg', quality);
        } catch {
          return null;
        }
      },
      isDirectVideo: () => isDirectVideoUrl(url),
    }),
    [url]
  );

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !isDirectVideoUrl(url)) return;
    if (paused) {
      el.pause();
    } else {
      el.play()?.catch(() => {});
    }
  }, [paused, url]);

  if (!url) return null;

  if (isDirectVideoUrl(url)) {
    return (
      <video
        ref={videoRef}
        className={className}
        src={resolveDirectVideoSrc(url)}
        title={title}
        loop
        muted
        playsInline
        autoPlay={!paused}
        controls
      />
    );
  }

  const embedSrc = toYoutubeEmbedUrl(url);

  return (
    <iframe
      className={className}
      src={embedSrc}
      title={title}
      frameBorder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
      sandbox={iframeSandbox}
    />
  );
});

export default FeedVideoPlayer;
