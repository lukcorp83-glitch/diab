import React, { ReactNode } from 'react';
import { motion, useMotionValue, useTransform, useAnimation } from 'motion/react';
import { Trash2 } from 'lucide-react';

interface SwipeableItemProps {
  children: ReactNode;
  onDelete: () => void;
  id: string;
  key?: string | number;
  bgClass?: string;
}

export default function SwipeableItem({ children, onDelete, id, bgClass = "bg-[#f8fafc] dark:bg-[#020617]" }: SwipeableItemProps) {
  const x = useMotionValue(0);
  const controls = useAnimation();
  
  // Transform x position to background color or opacity if needed
  const opacity = useTransform(x, [-80, -40, 0], [1, 0.5, 0]);
  const scale = useTransform(x, [-80, -40, 0], [1, 0.8, 0.5]);

  const handleDragEnd = async (_: any, info: any) => {
    // Determine if we should delete based on total dragged distance or velocity
    if (info.offset.x < -70 || info.velocity.x < -500) {
      await controls.start({ x: -150, opacity: 0, transition: { duration: 0.2 } });
      onDelete();
      // Use a timeout to reset position if the item wasn't actually removed from DOM
      setTimeout(() => controls.start({ x: 0, opacity: 1 }), 1000);
    } else {
      controls.start({ x: 0, transition: { type: 'spring', stiffness: 500, damping: 50 } });
    }
  };

  return (
    <div className="relative overflow-hidden rounded-[2rem] mb-2 group">
      {/* Background layer with delete action */}
      <div className="absolute inset-0 bg-gradient-to-l from-rose-600 to-rose-500 flex items-center justify-end pr-8">
        <motion.div style={{ opacity, scale }}>
          <Trash2 className="text-white" size={24} />
        </motion.div>
      </div>

      {/* Content layer */}
      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -120, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        animate={controls}
        style={{ x }}
        className={`relative z-10 ${bgClass} touch-pan-y cursor-grab active:cursor-grabbing will-change-transform`}
      >
        {children}
      </motion.div>
    </div>
  );
}
