import React, { ReactNode, useRef, useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform, useAnimation } from 'motion/react';
import { Trash2, AlertCircle, X } from 'lucide-react';

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
  const isMounted = useRef(true);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  // Transform x position to background color or opacity if needed
  const opacity = useTransform(x, [-80, -40, 0], [1, 0.5, 0]);

  const handleDragEnd = async (_: any, info: any) => {
    // Reveal the delete action area
    if (info.offset.x < -40 || info.velocity.x < -400) {
      if (isMounted.current) {
        controls.start({ x: showConfirm ? -180 : -100, transition: { type: 'spring', stiffness: 400, damping: 40 } }).catch(() => {});
      }
    } else {
      if (isMounted.current) {
        controls.start({ x: 0, transition: { type: 'spring', stiffness: 500, damping: 50 } }).catch(() => {});
        setShowConfirm(false); // Reset confirm on close
      }
    }
  };

  const handleDeleteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!showConfirm) {
      setShowConfirm(true);
      if (isMounted.current) {
        controls.start({ x: -180, transition: { type: 'spring', stiffness: 400, damping: 40 } }).catch(() => {});
      }
    } else {
      if (isMounted.current) {
        await controls.start({ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }).catch(() => {});
      }
      onDelete();
      // Reset position in case it stays mounted (e.g. optimistic UI fails)
      setTimeout(() => {
        if (isMounted.current) {
          controls.start({ x: 0, opacity: 1, scale: 1 }).catch(() => {});
          setShowConfirm(false);
        }
      }, 500);
    }
  };

  const handleCancelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirm(false);
    if (isMounted.current) {
      controls.start({ x: -100, transition: { type: 'spring', stiffness: 500, damping: 50 } }).catch(() => {});
    }
  };

  return (
    <div className="relative overflow-hidden rounded-[2rem] mb-2 group">
      {/* Background layer with delete action */}
      <div className="absolute inset-0 bg-gradient-to-l from-rose-600 to-rose-500 flex items-center justify-end">
        <motion.div style={{ opacity }} className="h-full flex items-center justify-end min-w-[220px] px-4">
          {showConfirm ? (
            <div className="flex items-center justify-end gap-2 w-[180px]">
              <span className="text-white font-black text-xs uppercase tracking-wider">Usunąć?</span>
              <button 
                onClick={handleCancelClick}
                className="bg-white/20 p-2 rounded-full text-white active:scale-95 transition-all w-8 h-8 flex items-center justify-center cursor-pointer ml-1"
              >
                <X size={16} />
              </button>
              <button 
                onClick={handleDeleteClick}
                className="bg-white text-rose-600 p-2 py-1.5 rounded-full font-black text-sm px-4 shadow-xl active:scale-95 transition-all cursor-pointer"
              >
                Tak
              </button>
            </div>
          ) : (
            <div
              onClick={handleDeleteClick}
              className="h-full w-[100px] flex items-center justify-center text-white active:scale-95 transition-all cursor-pointer"
            >
              <Trash2 size={24} />
            </div>
          )}
        </motion.div>
      </div>

      {/* Content layer */}
      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: showConfirm ? -180 : -100, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        animate={controls}
        style={{ x }}
        className={`relative z-10 ${bgClass} touch-pan-y cursor-grab active:cursor-grabbing will-change-transform h-full`}
      >
        {children}
      </motion.div>
    </div>
  );
}
