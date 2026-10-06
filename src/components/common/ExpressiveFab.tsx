import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { Haptics } from '../../lib/haptics';

interface ExpressiveFabProps {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  expanded?: boolean;
  className?: string;
  color?: string;
}

export default function ExpressiveFab({
  label,
  icon,
  onClick,
  expanded = true,
  className,
  color = "bg-accent-600 hover:bg-accent-500 text-white shadow-xl shadow-accent-600/30"
}: ExpressiveFabProps) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.92 }}
      onClick={() => {
        Haptics.light();
        onClick();
      }}
      transition={{
        type: "spring",
        stiffness: 420,
        damping: 28,
        mass: 0.7
      }}
      className={cn(
        "flex items-center justify-center gap-2.5 rounded-full select-none cursor-pointer transition-colors z-40 active:brightness-95",
        expanded ? "px-5 py-3.5" : "w-14 h-14 p-0",
        color,
        className
      )}
    >
      <span className="shrink-0 flex items-center justify-center">
        {icon}
      </span>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="text-xs font-black uppercase tracking-wider overflow-hidden whitespace-nowrap leading-none"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
