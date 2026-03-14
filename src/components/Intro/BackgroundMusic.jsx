import { useEffect, useRef, useState } from 'react';

function BackgroundMusic({ autoStart = true, src = '/intro-music.mp4' }) {
  const audioRef = useRef(null);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.muted = muted;
  }, [muted]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !autoStart) return;

    const tryPlay = async () => {
      try {
        await audio.play();
      } catch {
        // Auto-play can be blocked by the browser until user gesture.
      }
    };

    tryPlay();
  }, [autoStart]);

  return (
    <>
      <audio ref={audioRef} src={src} loop preload="auto" />
      <button
        type="button"
        className="music-toggle-btn"
        onClick={() => setMuted((value) => !value)}
        aria-label={muted ? 'Unmute intro music' : 'Mute intro music'}
      >
        {muted ? 'Unmute' : 'Mute'}
      </button>
    </>
  );
}

export default BackgroundMusic;
