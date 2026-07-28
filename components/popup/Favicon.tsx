import { useEffect, useState } from 'react';
import fluxFeedIcon from '@/assets/flux-feed.svg';

interface FaviconProps {
  url: string;
  title?: string;
  imageUrl?: string;
  size?: number;
}

function getOrigin(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
}

export function Favicon({ url, title = '', imageUrl, size = 16 }: FaviconProps) {
  const fallbackSrc = fluxFeedIcon;
  const [src, setSrc] = useState(imageUrl?.trim() || fallbackSrc);
  const [failed, setFailed] = useState(false);
  const label = title || getOrigin(url);
  const letter = label.trim().charAt(0).toUpperCase() || 'F';

  useEffect(() => {
    setSrc(imageUrl?.trim() || fallbackSrc);
    setFailed(false);
  }, [imageUrl]);

  if (failed) {
    return (
      <span
        aria-label={label}
        className="inline-flex shrink-0 items-center justify-center rounded bg-accent text-[10px] font-semibold text-accent-foreground"
        style={{ width: size, height: size }}
      >
        {letter}
      </span>
    );
  }

  return (
    <img
      alt={label}
      className="shrink-0 rounded"
      height={size}
      src={src}
      width={size}
      onError={() => {
        if (src !== fallbackSrc) {
          setSrc(fallbackSrc);
          return;
        }
        setFailed(true);
      }}
    />
  );
}
