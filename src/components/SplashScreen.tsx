import { motion } from 'motion/react';
import { useEffect } from 'react';

const FLAME_PATH_1 = "M50 0C50 0 92 40 92 75C92 98.2 73.2 117 50 117C26.8 117 8 98.2 8 75C8 40 50 0 50 0Z";
const FLAME_PATH_2 = "M50 5C50 5 88 45 88 78C88 97.3 71 114 50 114C29 114 12 97.3 12 78C12 45 50 5 50 5Z";
const INNER_GLOW_PATH = "M50 25C50 25 78 55 78 80C78 95.5 65.5 108 50 108C34.5 108 22 95.5 22 80C22 55 50 25 50 25Z";

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  useEffect(() => {
    const timer = setTimeout(onFinish, 3000);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onFinish}
      className="fixed inset-0 z-[1000] bg-[#F5F5F0] dark:bg-[#0F0F0E] flex flex-col items-center justify-center cursor-pointer"
    >
      <div className="relative w-48 h-48">
        {/* Outer Flame */}
        <motion.svg
          viewBox="0 0 100 120"
          className="absolute inset-0 w-full h-full text-orange-600/20 fill-current"
          animate={{ 
            scale: [1, 1.05, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ repeat: Infinity, duration: 3 }}
        >
          <path d={FLAME_PATH_1} />
        </motion.svg>

        {/* Middle Flame */}
        <motion.svg
          viewBox="0 0 100 120"
          className="absolute inset-0 w-full h-full text-orange-500 fill-current"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ 
            scale: [0.95, 1, 0.95],
            opacity: 1
          }}
          transition={{ 
            scale: { repeat: Infinity, duration: 2, ease: "easeInOut" },
            opacity: { duration: 0.8 }
          }}
        >
          <path d={FLAME_PATH_2} />
        </motion.svg>

        {/* Inner Glow */}
        <motion.svg
          viewBox="0 0 100 120"
          className="absolute inset-0 w-full h-full text-yellow-400/80 fill-current"
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.5, 0.8, 0.5]
          }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
        >
          <path d={INNER_GLOW_PATH} />
        </motion.svg>

        {/* Eyes & Smile (from previous icon style) */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="absolute inset-0 flex flex-col items-center justify-center pt-10"
        >
           <div className="flex gap-4 mb-1">
              <div className="w-2.5 h-2.5 bg-black rounded-full" />
              <div className="w-2.5 h-2.5 bg-black rounded-full" />
           </div>
           <div className="w-6 h-2 border-b-4 border-black rounded-full" />
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="mt-8 text-center"
      >
        <h1 className="text-3xl font-serif font-bold text-[#1A1A1A] dark:text-[#F5F5F0] tracking-tight">FireCard</h1>
        <p className="text-sm font-bold text-[#5A5A40]/40 dark:text-[#A0A080]/40 uppercase tracking-[0.3em] mt-2">Archivio Locale Sicuro</p>
      </motion.div>
    </motion.div>
  );
}
