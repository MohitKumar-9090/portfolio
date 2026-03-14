import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useSwipeable } from 'react-swipeable';

function SwipeIntro({ onContinue, reducedMotion }) {
  const handlers = useSwipeable(
    useMemo(
      () => ({
        onSwipedUp: () => onContinue?.(),
        trackMouse: true,
        delta: 20,
        preventScrollOnSwipe: true,
      }),
      [onContinue]
    )
  );

  const transition = reducedMotion
    ? { duration: 0.25 }
    : { duration: 0.8, ease: [0.22, 1, 0.36, 1] };

  return (
    <motion.section
      className="intro-panel intro-panel-welcome"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      transition={transition}
      {...handlers}
      onWheel={(event) => {
        if (event.deltaY > 8) onContinue?.();
      }}
      onClick={() => onContinue?.()}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onContinue?.();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label="Swipe up, scroll, or press Enter to continue"
    >
      <motion.h1
        className="intro-main-title"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...transition, delay: reducedMotion ? 0 : 0.1 }}
      >
        Welcome to Mohit Pandey&apos;s Portfolio
      </motion.h1>
      <motion.p
        className="intro-main-subtitle"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...transition, delay: reducedMotion ? 0.05 : 0.24 }}
      >
        Swipe Up to Enter
      </motion.p>
      <motion.div
        className="intro-swipe-hint"
        animate={reducedMotion ? undefined : { y: [0, -8, 0], opacity: [0.55, 1, 0.55] }}
        transition={reducedMotion ? undefined : { duration: 1.5, repeat: Infinity }}
      >
        Swipe Up / Scroll Down / Click
      </motion.div>
    </motion.section>
  );
}

export default SwipeIntro;
