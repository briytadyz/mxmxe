import React, { useState, useEffect, useRef } from 'react';
import MuxPlayer from '@mux/mux-player-react';
import { supabase } from '../lib/supabase';

interface MuxVideoPlayerProps {
  b2Url: string;
  attachmentId?: string;
  filename?: string;
}

export const MuxVideoPlayer: React.FC<MuxVideoPlayerProps> = ({
  b2Url,
  attachmentId,
  filename,
}) => {
  const [playbackId, setPlaybackId] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState(16 / 9);
  const [viewportHeight, setViewportHeight] = useState(720);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isMountedRef = useRef(true);

  useEffect(() => {
    const updateViewportHeight = () => setViewportHeight(window.innerHeight);
    updateViewportHeight();
    window.addEventListener("resize", updateViewportHeight);
    return () => window.removeEventListener("resize", updateViewportHeight);
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
          const video = await response.json() as { playbackId: string | null; status: string };
          nextPlaybackId = video.playbackId;
          status = video.status;
        } else if (filename) {
          const { data: video } = await supabase
            .from('video_uploads')
            .select('playback_id, status')
            .eq('filename', filename)
            .maybeSingle();
          nextPlaybackId = video?.playback_id || null;
          status = video?.status || null;
        }

        if (!isMountedRef.current) return;

        if (nextPlaybackId && status === 'ready') {
          setPlaybackId(nextPlaybackId);
        } else if (
          attachmentId
            ? status !== 'failed' && status !== 'errored' && retries < 24
            : status === 'processing' && retries < 3
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

  const frameStyle: React.CSSProperties = {
    aspectRatio,
    width: aspectRatio < 1 ? `${Math.min(448, viewportHeight * 0.7 * aspectRatio)}px` : "100%",
    maxHeight: "70svh",
    maxWidth: aspectRatio < 1 ? "100%" : `min(100%, calc(70svh * ${aspectRatio}))`,
  };
  const muxPlayerStyle = {
    width: "100%",
    height: "100%",
    "--media-object-fit": "contain",
  } as React.CSSProperties & { [key: `--${string}`]: string | undefined };
  const updateAspectRatio = (width: number, height: number) => {
    if (width > 0 && height > 0) setAspectRatio(width / height);
  };

  if (playbackId) {
    return (
      <div className="mx-auto w-full overflow-hidden rounded-xl bg-black shadow-md" style={frameStyle}>
        <MuxPlayer
          playbackId={playbackId}
          streamType="on-demand"
          onLoadedMetadata={(event) => {
            const video = event.currentTarget as typeof event.currentTarget & { videoWidth: number; videoHeight: number };
            updateAspectRatio(video.videoWidth, video.videoHeight);
          }}
          style={muxPlayerStyle}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full overflow-hidden rounded-xl bg-black shadow-md" style={frameStyle}>
      <video
        src={b2Url}
        controls
        playsInline
        preload="metadata"
        onLoadedMetadata={(event) => updateAspectRatio(event.currentTarget.videoWidth, event.currentTarget.videoHeight)}
        className="h-full w-full object-contain"
      />
    </div>
  );
};

export default MuxVideoPlayer;
