import { motion } from 'framer-motion';

export default function Dice({ values, rolling = false }) {
  return (
    <div className="flex gap-4 justify-center my-4">
      {values.map((val, i) => (
        <motion.div
          key={i}
          animate={rolling ? { rotate: 360 } : { rotate: 0 }}
          transition={{ duration: 0.4, repeat: rolling ? Infinity : 0 }}
          className="w-16 h-16 bg-white rounded-xl shadow-lg flex items-center justify-center text-2xl font-bold text-black"
        >
          {val === 0 ? '?' : val}
        </motion.div>
      ))}
    </div>
  );
}