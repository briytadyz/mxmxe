import { useEffect, useRef, useState, type ReactNode } from "react";
import { Maximize, Pause, Play, Volume2, VolumeX } from "lucide-react";
import type MuxPlayerElement from "@mux/mux-player";
import MuxPlayer from "@mux/mux-player-react";
import { supabase } from "../lib/supabase";

interface MuxVideoPlayerProps {
  attachmentId?: string;
  filename?: string;
  controlsMode?: "default" | "minimal";
  presentation?: "default" | "immersive";
  overlay?: ReactNode;
  overlayOnlyOnMobilePortrait?: boolean;
  onAspectRatioChange?: (aspectRatio: number) => void;
}

export const MuxVideoPlayer: React.FC<MuxVideoPlayerProps> = ({
  attachmentId,
  filename,
  controlsMode = "default",
  presentation = "default",
  overlay,
  overlayOnlyOnMobilePortrait = false,
  onAspectRatioChange,
}) => {
  const [playbackId, setPlaybackId] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [viewportHeight, setViewportHeight] = useState(() => typeof window === "undefined" ? 0 : window.innerHeight);
  const [viewportWidth, setViewportWidth] = useState(() => typeof window === "undefined" ? 0 : window.innerWidth);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isMountedRef = useRef(true);
  const muxPlayerRef = useRef<MuxPlayerElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const updateViewport = () => {
      setViewportHeight(window.innerHeight);
      setViewportWidth(window.innerWidth);
    };
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    let retries = 0;

    const fetch = async () => {
      try {
        let nextPlaybackId: string | null = null;
        let status: string | null = null;

        if (attachmentId) {
          const response = await window.fetch(`/api/hotel-menu-video/${encodeURIComponent(attachmentId)}`, { cache: "no-store" });
          if (!response.ok) return;
          const video = await response.json() as { playbackId: string | null; status: string; aspectRatio: number | null };
          nextPlaybackId = video.playbackId;
          status = video.status;
          if (video.aspectRatio && Number.isFinite(video.aspectRatio) && video.aspectRatio > 0) {
            setAspectRatio(video.aspectRatio);
            onAspectRatioChange?.(video.aspectRatio);
          }
        } else if (filename) {
          const { data: video } = await supabase
            .from("video_uploads")
            .select("playback_id, status")
            .eq("filename", filename)
            .maybeSingle();
          nextPlaybackId = video?.playback_id || null;
          status = video?.status || null;
        }

        if (!isMountedRef.current) return;

        if (nextPlaybackId && status === "ready") {
          setPlaybackId(nextPlaybackId);
        } else if (
          attachmentId
            ? status !== "failed" && status !== "errored" && retries < 24
            : status === "processing" && retries < 3
        ) {
          retries++;
          timeoutRef.current = setTimeout(fetch, attachmentId ? 2500 : 1500);
        }
      } catch {
        if (isMountedRef.current && attachmentId && retries < 24) {
          retries++;
          timeoutRef.current = setTimeout(fetch, 2500);
        }
      }
    };

    fetch();

    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [attachmentId, filename]);

  const isPortrait = aspectRatio !== null && aspectRatio < 1;
  const isImmersivePortrait = presentation === "immersive" && isPortrait;
  const fillPortraitFrame = isImmersivePortrait && viewportWidth < 640;
  const frameStyle: React.CSSProperties = presentation === "immersive"
    ? fillPortraitFrame
      ? { width: "100%", height: "min(68svh, 560px)" }
      : {
          aspectRatio: aspectRatio ?? undefined,
          width: isImmersivePortrait ? `min(100%, calc(68svh * ${aspectRatio}))` : "100%",
          maxHeight: "68svh",
          maxWidth: isImmersivePortrait ? "100%" : aspectRatio !== null ? `min(100%, calc(68svh * ${aspectRatio}))` : "100%",
        }
    : {
        aspectRatio: aspectRatio ?? undefined,
        width: isPortrait && aspectRatio !== null ? `${Math.min(448, viewportHeight * 0.7 * aspectRatio)}px` : "100%",
        maxHeight: "70svh",
        maxWidth: isPortrait ? "100%" : aspectRatio !== null ? `min(100%, calc(70svh * ${aspectRatio}))` : "100%",
      };
  const muxPlayerStyle = {
    width: "100%",
    height: "100%",
    "--media-object-fit": fillPortraitFrame ? "cover" : "contain",
    "--media-object-position": "50% 35%",
    "--controls": controlsMode === "minimal" ? "none" : undefined,
  } as React.CSSProperties & { [key: `--${string}`]: string | undefined };
  const frameClass = presentation === "immersive"
    ? "relative w-full overflow-hidden bg-black"
    : "relative mx-auto w-full overflow-hidden rounded-xl bg-black shadow-md";
  const showOverlay = overlayOnlyOnMobilePortrait
    ? presentation === "immersive" && isPortrait && viewportWidth < 768
    : !(presentation === "immersive" && isPortrait && viewportWidth >= 768);

  const updateAspectRatio = (width: number, height: number) => {
    if (width <= 0 || height <= 0) return;
    const ratio = width / height;
    setAspectRatio(ratio);
    onAspectRatioChange?.(ratio);
  };

  const togglePlayback = () => {
    const media = muxPlayerRef.current;
    if (!media) return;
    if (media.paused) {
      void media.play().catch(() => setIsPlaying(false));
    } else {
      media.pause();
    }
  };

  const toggleMuted = () => {
    const media = muxPlayerRef.current;
    if (!media) return;
    media.muted = !media.muted;
    setIsMuted(media.muted);
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void frameRef.current?.requestFullscreen();
    }
  };

  const minimalControls = controlsMode === "minimal" && (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between p-3">
      <button
        type="button"
        aria-label={isPlaying ? "Pause video" : "Play video"}
        onClick={togglePlayback}
        className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white shadow-sm backdrop-blur-sm transition hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
      </button>
      <div className="flex gap-2">
        <button
          type="button"
          aria-label={isMuted ? "Unmute video" : "Mute video"}
          onClick={toggleMuted}
          className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white shadow-sm backdrop-blur-sm transition hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>
        <button
          type="button"
          aria-label="View video fullscreen"
          onClick={toggleFullscreen}
          className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white shadow-sm backdrop-blur-sm transition hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <Maximize className="h-5 w-5" />
        </button>
      </div>
    </div>
  );

  return (
    <div ref={frameRef} className={frameClass} style={frameStyle}>
      {playbackId && (
        <MuxPlayer
          ref={muxPlayerRef}
          playbackId={playbackId}
          streamType="on-demand"
          onLoadedMetadata={(event) => {
            const video = event.currentTarget as typeof event.currentTarget & { videoWidth: number; videoHeight: number; muted: boolean };
            updateAspectRatio(video.videoWidth, video.videoHeight);
            setIsMuted(video.muted);
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          onVolumeChange={(event) => setIsMuted((event.currentTarget as MuxPlayerElement).muted)}
          style={muxPlayerStyle}
        />
      )}
      {minimalControls}
      {showOverlay && overlay}
    </div>
  );
};

export default MuxVideoPlayer;
