import { motion } from 'framer-motion';

const techItems = ['Python', 'Machine Learning', 'Deep Learning', 'TensorFlow', 'Data Science'];

function TechStackReveal() {
  return (
    <motion.div
      className="tech-reveal-row"
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.14, delayChildren: 0.8 } },
      }}
    >
      {techItems.map((item) => (
        <motion.div
          key={item}
          className="tech-chip"
          variants={{
            hidden: { opacity: 0, y: 24, filter: 'blur(6px)' },
            show: { opacity: 1, y: 0, filter: 'blur(0px)' },
          }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          {item}
        </motion.div>
      ))}
    </motion.div>
  );
}

export default TechStackReveal;
