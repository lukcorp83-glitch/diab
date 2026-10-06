import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { Haptics } from '../../lib/haptics';

export interface SegmentedOption<T extends string | number> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

interface SegmentedButtonProps<T extends string | number> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (val: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export default function SegmentedButton<T extends string | number>({
  options,
  value,
  onChange,
  className,
  size = 'md',
}: SegmentedButtonProps<T>) {
  return (
    <div
      className={cn(
        "relative flex items-center p-1 rounded-full bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/60 dark:border-slate-700/60 select-none",
        className
      )}
    >
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            onClick={() => {
              if (!isSelected) {
                Haptics.tick();
                onChange(option.value);
              }
            }}
            className={cn(
              "relative z-10 flex-1 flex items-center justify-center gap-1.5 rounded-full transition-colors font-black text-center uppercase tracking-tight",
              size === 'sm' ? "py-1.5 px-2 text-[10px]" : "py-2.5 px-3 text-xs",
              isSelected
                ? "text-slate-900 dark:text-white"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            )}
          >
            {isSelected && (
              <motion.div
                layoutId="segmented-indicator"
                transition={{
                  type: "spring",
                  stiffness: 480,
                  damping: 32,
                  mass: 0.6
                }}
                className="absolute inset-0 bg-white dark:bg-slate-700 rounded-full shadow-xs border border-black/5 dark:border-white/10 z-[-1]"
              />
            )}
            {option.icon && (
              <span className="shrink-0">{option.icon}</span>
            )}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
