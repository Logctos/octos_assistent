"use client";

import { useEffect, useRef } from "react";

const VIDEO_SRC =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260601_110537_3a579fa0-7bbc-4d94-9d25-0e816c7840f5.mp4";

function useDesktopScrub(videoRef: React.RefObject<HTMLVideoElement | null>) {
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let previousX: number | null = null;

    function handleMouseMove(event: MouseEvent) {
      if (window.innerWidth < 1024) {
        previousX = null;
        return;
      }
      if (!video || !video.duration) {
        previousX = event.clientX;
        return;
      }
      if (previousX === null) {
        previousX = event.clientX;
        return;
      }

      const deltaX = event.clientX - previousX;
      previousX = event.clientX;

      const deltaTime = (deltaX / window.innerWidth) * 0.8 * video.duration;
      video.currentTime = Math.min(Math.max(video.currentTime + deltaTime, 0), video.duration);
    }

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [videoRef]);
}

function useMobileAutoplay(videoRef: React.RefObject<HTMLVideoElement | null>) {
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (window.innerWidth < 1024) {
      video.autoplay = true;
      video.play().catch(() => {});
    }
  }, [videoRef]);
}

export function HeroVideoAvatar({ size = 440 }: { size?: number }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useDesktopScrub(videoRef);
  useMobileAutoplay(videoRef);

  return (
    <div
      className="relative overflow-hidden rounded-[32px] bg-neutral-50 shadow-xl"
      style={{ width: size, height: size }}
    >
      <video
        ref={videoRef}
        muted
        playsInline
        preload="auto"
        src={VIDEO_SRC}
        className="h-full w-full object-cover"
      />
    </div>
  );
}
