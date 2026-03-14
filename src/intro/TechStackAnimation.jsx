import { motion } from 'framer-motion';

const STACK = ['Python', 'Machine Learning', 'Deep Learning', 'TensorFlow', 'Data Science'];

function TechStackAnimation() {
  return (
    <motion.div
      className="intro-tech-row"
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
      }}
    >
      {STACK.map((item) => (
        <motion.span
          key={item}
          className="intro-tech-chip"
          variants={{
            hidden: { opacity: 0, y: 20, filter: 'blur(4px)' },
            show: { opacity: 1, y: 0, filter: 'blur(0px)' },
          }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          whileHover={{ y: -3, boxShadow: '0 0 20px rgba(56, 189, 248, 0.45)' }}
        >
          {item}
        </motion.span>
      ))}
    </motion.div>
  );
}

export default TechStackAnimation;
