import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import SwipeIntro from './SwipeIntro.jsx';
import DeveloperScene from './DeveloperScene.jsx';
import './intro.css';

function IntroLoader({ onEnter }) {
  const audioRef = useRef(null);
  const [phase, setPhase] = useState('swipe');
  const [muted, setMuted] = useState(false);

  const shouldReduceMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const lowEnd = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
    return prefersReduced || (isMobile && lowEnd);
  }, []);

  const tryPlayAudio = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = 1;
    try {
      await audio.play();
    } catch {
      // Browser can still block until a user interaction happens.
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.muted = muted;
  }, [muted]);

  useEffect(() => {
    tryPlayAudio();
  }, []);

  useEffect(() => {
    const unlockAudio = () => {
      tryPlayAudio();
    };

    window.addEventListener('pointerdown', unlockAudio, { once: true, passive: true });
    window.addEventListener('keydown', unlockAudio, { once: true, passive: true });
    window.addEventListener('wheel', unlockAudio, { once: true, passive: true });

    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('wheel', unlockAudio);
    };
  }, []);

  const handleContinue = async () => {
    await tryPlayAudio();
    setPhase('scene');
  };

  return (
    <div className="intro-root" role="dialog" aria-modal="true" aria-label="Portfolio intro">
      <audio ref={audioRef} src="/intro-music.mpeg" loop preload="auto" />

      <motion.button
        type="button"
        className="intro-audio-toggle"
        onClick={async () => {
          const nextMuted = !muted;
          setMuted(nextMuted);
          if (!nextMuted) {
            await tryPlayAudio();
          }
        }}
        whileTap={{ scale: 0.96 }}
      >
        {muted ? 'Unmute' : 'Mute'}
      </motion.button>

      <AnimatePresence mode="wait">
        {phase === 'swipe' ? (
          <SwipeIntro
            key="swipe"
            onContinue={handleContinue}
            reducedMotion={shouldReduceMotion}
          />
        ) : (
          <DeveloperScene key="scene" onEnter={onEnter} reducedMotion={shouldReduceMotion} />
        )}
      </AnimatePresence>
    </div>
  );
}

export default IntroLoader;
