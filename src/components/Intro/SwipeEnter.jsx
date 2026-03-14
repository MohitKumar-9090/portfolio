import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useSwipeable } from 'react-swipeable';

function SwipeEnter({ onEnter }) {
  const swipeHandlers = useSwipeable(
    useMemo(
      () => ({
        onSwipedUp: () => onEnter?.(),
        trackMouse: true,
        preventScrollOnSwipe: true,
        delta: 20,
      }),
      [onEnter]
    )
  );

  const handleWheel = (event) => {
    if (event.deltaY > 10) onEnter?.();
  };

  return (
    <div
      {...swipeHandlers}
      className="swipe-zone"
      onWheel={handleWheel}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onEnter?.();
        }
      }}
      aria-label="Swipe up, scroll down, or press enter to start intro"
    >
      <motion.div
        className="swipe-indicator"
        animate={{ y: [10, -10, 10], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <span>Swipe Up / Scroll Down</span>
      </motion.div>

      <button className="intro-cta" type="button" onClick={() => onEnter?.()}>
        Start Intro
      </button>
    </div>
  );
}

export default SwipeEnter;
