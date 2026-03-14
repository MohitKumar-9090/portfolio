import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import SwipeEnter from './SwipeEnter.jsx';
import DeveloperIntro from './DeveloperIntro.jsx';
import './intro.css';

function IntroScreen({ onComplete }) {
  const [started, setStarted] = useState(false);

  return (
    <div className="intro-overlay" role="dialog" aria-modal="true" aria-label="Portfolio intro">
      <AnimatePresence mode="wait">
        {!started ? (
          <motion.div
            key="welcome"
            className="intro-welcome-wrap"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          >
            <h1 className="intro-title">Welcome to Mohit Pandey&apos;s Portfolio</h1>
            <p className="intro-subtitle">Swipe to Enter</p>
            <SwipeEnter onEnter={() => setStarted(true)} />
          </motion.div>
        ) : (
          <motion.div
            key="developer"
            className="intro-developer-wrap"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <DeveloperIntro onComplete={onComplete} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default IntroScreen;
