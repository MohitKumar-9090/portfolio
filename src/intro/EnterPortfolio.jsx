import { motion } from 'framer-motion';

function EnterPortfolio({ onEnter }) {
  return (
    <motion.button
      type="button"
      className="intro-enter-btn"
      onClick={onEnter}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      Enter Portfolio →
    </motion.button>
  );
}

export default EnterPortfolio;
