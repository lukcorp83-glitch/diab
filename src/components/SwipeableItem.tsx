import React, { ReactNode, useRef, useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform, useAnimation } from 'motion/react';
import { Trash2, AlertCircle, X } from 'lucide-react';
import { Haptics } from '../lib/haptics';
import { cn } from '../lib/utils';
import { useTranslation } from "react-i18next";

interface SwipeableItemProps {
  children: ReactNode;
  onDelete: () => void;
  id: string;
  key?: string | number;
  bgClass?: string;
  actionIcon?: ReactNode;
  actionColor?: string;
  noConfirm?: boolean;
}

export default function SwipeableItem({ 
  children, 
  onDelete, 
  id, 
  bgClass = "bg-[#f8fafc] dark:bg-[#020617]",
  actionIcon = <Trash2 size={24} />,
  actionColor = "from-slate-600 to-slate-500",
  noConfirm = false
}: SwipeableItemProps) {
    const { t } = useTranslation();
  const x = useMotionValue(0);
  const controls = useAnimation();
  const isMounted = useRef(true);
  const lastTickX = useRef(0);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    isMounted.current = true;
    
    // Subscribe to x changes for haptic gear effect
    const unsubscribe = x.on('change', (latest) => {
      const diff = Math.abs(latest - lastTickX.current);
      if (diff > 15) { // Tick every 15 pixels for a more distinct mechanical feel
        Haptics.tick();
        lastTickX.current = latest;
      }
    });

    return () => {
      isMounted.current = false;
      unsubscribe();
    };
  }, [x]);
  
  // Transform x position to background color or opacity if needed
  const opacity = useTransform(x, [-80, -40, 0], [1, 0.5, 0]);

  const handleDragEnd = async (_: any, info: any) => {
    // Reveal the delete action area
    const threshold = noConfirm ? -40 : -40;
    if (info.offset.x < threshold || info.velocity.x < -400) {
      if (isMounted.current) {
        Haptics.selection();
        if (noConfirm) {
           onDelete();
           controls.start({ x: 0, transition: { type: 'spring', stiffness: 500, damping: 50 } }).catch(() => {});
        } else {
           controls.start({ x: showConfirm ? -180 : -100, transition: { type: 'spring', stiffness: 400, damping: 40 } }).catch(() => {});
        }
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
    if (noConfirm) {
      Haptics.medium();
      onDelete();
      return;
    }

    if (!showConfirm) {
      Haptics.medium();
      setShowConfirm(true);
      if (isMounted.current) {
        controls.start({ x: -180, transition: { type: 'spring', stiffness: 400, damping: 40 } }).catch(() => {});
      }
    } else {
      Haptics.impact();
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
    Haptics.light();
    setShowConfirm(false);
    if (isMounted.current) {
      controls.start({ x: -100, transition: { type: 'spring', stiffness: 500, damping: 50 } }).catch(() => {});
    }
  };

  return (
    <div className="relative overflow-hidden rounded-[2rem] mb-2 group">
      {/* Background layer with delete action */}
      <div className={cn("absolute inset-0 bg-gradient-to-l flex items-center justify-end", actionColor)}>
        <motion.div style={{ opacity }} className="h-full flex items-center justify-end min-w-[220px] px-4">
          {showConfirm && !noConfirm ? (
            <div className="flex items-center justify-end gap-2 w-[180px]">
              <span className="text-white font-black text-xs uppercase tracking-wider">{t('auto.pewny', { defaultValue: 'Pewny?' })}</span>
              <button 
                onClick={handleCancelClick}
                className="bg-white/20 p-2 rounded-full text-white active:scale-95 transition-all w-8 h-8 flex items-center justify-center cursor-pointer ml-1"
              >
                <X size={16} />
              </button>
              <button 
                onClick={handleDeleteClick}
                className="bg-white text-slate-600 p-2 py-1.5 rounded-full font-black text-sm px-4 shadow-xl active:scale-95 transition-all cursor-pointer"
              >
                
                                              {t('auto.tak', { defaultValue: 'Tak' })}
                                            </button>
            </div>
          ) : (
            <div
              onClick={handleDeleteClick}
              className="h-full w-[100px] flex items-center justify-center text-white active:scale-95 transition-all cursor-pointer"
            >
              {actionIcon}
            </div>
          )}
        </motion.div>
      </div>

      {/* Content layer */}
      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: noConfirm ? -100 : (showConfirm ? -180 : -100), right: 0 }}
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
