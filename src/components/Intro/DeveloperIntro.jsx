import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import TechStackReveal from './TechStackReveal.jsx';

function DeveloperIntro({ onComplete }) {
  const [showEnter, setShowEnter] = useState(false);
  const [showStack, setShowStack] = useState(false);

  useEffect(() => {
    const stackTimer = setTimeout(() => setShowStack(true), 1300);
    const enterTimer = setTimeout(() => setShowEnter(true), 3200);
    return () => {
      clearTimeout(stackTimer);
      clearTimeout(enterTimer);
    };
  }, []);

  return (
    <div className="developer-intro">
      <div className="intro-particles" aria-hidden="true" />
      <div className="intro-grid-overlay" aria-hidden="true" />

      <div className="intro-content-layer">
        <motion.div
          className="intro-browser-shell"
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        >
          <div className="intro-browser-topbar">
            <div className="intro-browser-dots">
              <span />
              <span />
              <span />
            </div>
            <div className="intro-browser-url">https://mohitpandey.dev/intro</div>
          </div>

          <div className="intro-browser-content">
            <div className="intro-browser-left">
              <p className="intro-kicker">Frontend + Java Development</p>
              <h2 className="developer-title">Designing Realistic Modern Web Experiences</h2>
              <p className="developer-subtitle">
                Clean UI, smooth interactions, and performance-focused development.
              </p>
            </div>

            <div className="intro-browser-right">
              <div className="intro-stat-card">
                <span className="intro-stat-label">Projects Built</span>
                <strong>15+</strong>
              </div>
              <div className="intro-stat-card">
                <span className="intro-stat-label">Core Stack</span>
                <strong>React | Java</strong>
              </div>
              <div className="intro-stat-card">
                <span className="intro-stat-label">Focus</span>
                <strong>UI + Problem Solving</strong>
              </div>
            </div>
          </div>
        </motion.div>

        {showStack && (
          <>
            <TechStackReveal />
            <p className="intro-helper-text">Swipe-inspired cinematic intro, realistic webpage style.</p>
          </>
        )}

        {showEnter && (
          <motion.button
            type="button"
            className="enter-portfolio-btn"
            onClick={onComplete}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            Enter Portfolio
          </motion.button>
        )}
      </div>
    </div>
  );
}

export default DeveloperIntro;
