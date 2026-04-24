"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

interface LoadingOverlayProps {
  isVisible: boolean;
}

export default function LoadingOverlay({ isVisible }: LoadingOverlayProps) {
  const [progress, setProgress] = useState(0);

  // Simulated progress that slows down as it reaches 99%
  useEffect(() => {
    if (!isVisible) {
      setProgress(0);
      return;
    }

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 99) return 99;
        
        // Random incremental steps to make it look realistic
        let increment = 0;
        if (prev < 30) increment = Math.random() * 2;
        else if (prev < 70) increment = Math.random() * 0.5;
        else if (prev < 90) increment = Math.random() * 0.1;
        else increment = Math.random() * 0.05;

        return Math.min(prev + increment, 99);
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isVisible]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="w-full flex flex-col items-center justify-center p-6"
        >
          {/* STICKER CONTAINER - SMALLER */}
          <div className="relative w-32 h-32 mb-6 flex justify-center items-center">
            <motion.div
              animate={{ 
                scale: [1, 1.05, 1],
                rotate: [-2, 2, -2]
              }}
              transition={{ 
                duration: 4, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
            >
              <img
                src="https://xjiv5yqqnp7bldk3.public.blob.vercel-storage.com/sticker/STK-20260424-WA0011.webp"
                alt="Loading Sticker"
                style={{ width: 120, height: 120, objectFit: "contain" }}
              />
            </motion.div>
            
            {/* PULSING GLOW BEHIND STICKER */}
            <div className="absolute inset-0 bg-blue-500/10 blur-[40px] -z-10 rounded-full animate-pulse" />
          </div>

          {/* PROGRESS PERCENTAGE */}
          <div className="flex flex-col items-center gap-2 mb-6">
            <span className="text-4xl font-bold text-white tracking-tighter tabular-nums">
              {Math.floor(progress)}%
            </span>
            <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                initial={{ width: "0%" }}
                animate={{ width: `${progress}%` }}
                transition={{ ease: "linear" }}
              />
            </div>
            <span className="text-[9px] text-white/40 uppercase tracking-[0.2em] mt-2 text-center max-w-[250px]">
              Jika Kaamu Generate motion control proses kurang lebih 10 menit
            </span>
          </div>

          {/* MARQUEE TEXT */}
          <div className="w-full max-w-[400px] bg-white/5 border-y border-white/10 py-2.5 overflow-hidden flex whitespace-nowrap relative h-9">
            <motion.div
              animate={{ x: [400, -900] }}
              transition={{ 
                duration: 18, 
                repeat: Infinity, 
                ease: "linear" 
              }}
              className="absolute whitespace-nowrap"
            >
              <span className="text-white/70 font-medium tracking-wide text-[13px]">
                Jika Kaamu Generate motion control proses kurang lebih 10 menit • Untuk model lainya 1-5 menit tergantung durasi • Sabar Yah Bosque......
              </span>
            </motion.div>
          </div>

          {/* SUBTEXT */}
          <p className="mt-6 text-white/20 text-[10px] text-center px-4 leading-relaxed uppercase tracking-widest">
            Your video is being processed on our high-performance GPU cluster
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
