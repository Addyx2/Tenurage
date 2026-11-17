"use client";

import { useEffect, useRef } from "react";

/** A property's video tour: muted and looping while on screen, still for people who prefer less motion. */
export function TourVideo({ src, poster }: { src: string; poster?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const seen = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) video.play().catch(() => {});
      else video.pause();
    }, { threshold: 0.25 });
    seen.observe(video);
    return () => seen.disconnect();
  }, []);
  return <video ref={ref} src={src} poster={poster} muted loop playsInline preload="metadata" aria-label="Video tour" className="absolute inset-0 h-full w-full object-cover" />;
}
