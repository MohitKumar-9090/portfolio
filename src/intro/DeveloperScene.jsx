import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ReactTyped } from 'react-typed';
import TechStackAnimation from './TechStackAnimation.jsx';
import EnterPortfolio from './EnterPortfolio.jsx';

const DeveloperSceneCanvas = lazy(() => import('./DeveloperSceneCanvas.jsx'));

function DeveloperScene({ onEnter, reducedMotion }) {
  const [showEnter, setShowEnter] = useState(false);

  const isMobile = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 768px)').matches;
  }, []);

  const lowEndDevice = useMemo(() => {
    const cores = navigator.hardwareConcurrency || 8;
    const memory = navigator.deviceMemory || 8;
    return cores <= 4 || memory <= 4;
  }, []);

  useEffect(() => {
    let container = null;
    let disposed = false;

    const initParticles = async () => {
      if (reducedMotion) return;

      const [{ tsParticles }, { loadFull }] = await Promise.all([
        import('@tsparticles/engine'),
        import('tsparticles'),
      ]);

      await loadFull(tsParticles);
      if (disposed) return;

      container = await tsParticles.load({
        id: 'intro-particles-layer',
        options: {
          fullScreen: { enable: false },
          fpsLimit: 45,
          particles: {
            number: { value: isMobile ? 26 : 50, density: { enable: true, area: 900 } },
            color: { value: ['#38bdf8', '#22d3ee', '#34d399'] },
            links: {
              enable: true,
              color: '#38bdf8',
              opacity: 0.18,
              distance: 120,
              width: 1,
            },
            move: { enable: true, speed: isMobile ? 0.5 : 0.85, outModes: { default: 'bounce' } },
            opacity: { value: 0.4 },
            size: { value: { min: 1, max: 2.8 } },
          },
          detectRetina: true,
        },
      });
    };

    initParticles();

    return () => {
      disposed = true;
      if (container) container.destroy();
    };
  }, [isMobile, reducedMotion]);

  useEffect(() => {
    const delay = reducedMotion || lowEndDevice ? 1200 : 2400;
    const timer = setTimeout(() => setShowEnter(true), delay);
    return () => clearTimeout(timer);
  }, [lowEndDevice, reducedMotion]);

  return (
    <motion.section
      className="intro-panel intro-panel-scene"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reducedMotion ? 0.25 : 0.6 }}
    >
      <div className="intro-scene-bg" />
      {!reducedMotion && <div id="intro-particles-layer" className="intro-particles-layer" aria-hidden="true" />}
      {!isMobile && !lowEndDevice && !reducedMotion && (
        <Suspense fallback={null}>
          <DeveloperSceneCanvas />
        </Suspense>
      )}
      <div className="intro-scene-vignette" aria-hidden="true" />

      <div className="intro-scene-content">
        <motion.h2
          className="intro-dev-heading"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          Hi, I&apos;m Mohit Pandey
        </motion.h2>

        <motion.p
          className="intro-dev-subheading"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }}
        >
          AI/ML Engineer | Problem Solver
        </motion.p>

        <div className="intro-typed-wrap">
          <ReactTyped
            strings={[
              'Building intelligent AI/ML solutions',
              'Turning data into real impact',
              'Python and Machine Learning Engineer',
            ]}
            typeSpeed={40}
            backSpeed={24}
            backDelay={850}
            loop
            showCursor
            className="intro-typed-text"
          />
        </div>

        <TechStackAnimation />
        {showEnter && <EnterPortfolio onEnter={onEnter} />}
      </div>
    </motion.section>
  );
}

export default DeveloperScene;
