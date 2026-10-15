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
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isMountedRef = useRef(true);

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

  if (playbackId) {
    return (
      <div className="w-full aspect-video bg-black rounded-lg overflow-hidden">
        <MuxPlayer
          playbackId={playbackId}
          streamType="on-demand"
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    );
  }

  return (
    <div className="w-full aspect-video bg-black rounded-lg overflow-hidden">
      <video src={b2Url} controls playsInline preload="metadata" className="w-full h-full object-contain" />
    </div>
  );
};

export default MuxVideoPlayer;
