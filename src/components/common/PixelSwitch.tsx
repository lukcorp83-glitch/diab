import React from 'react';
import { motion } from 'motion/react';
import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Haptics } from '../../lib/haptics';

interface PixelSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  activeColor?: string;
  className?: string;
  ariaLabel?: string;
}

/**
 * PixelSwitch - Material 3 / Google Pixel style toggle switch
 * Features:
 * - Spring-animated sliding thumb
 * - Thumb grows when ON with crisp Checkmark icon
 * - Thumb shrinks when OFF
 * - Native Android haptic feedback on every toggle
 */
export default function PixelSwitch({
  checked,
  onChange,
  disabled = false,
  activeColor = "bg-accent-500",
  className,
  ariaLabel,
}: PixelSwitchProps) {
  const handleToggle = () => {
    if (disabled) return;
    Haptics.light();
    onChange(!checked);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={handleToggle}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 focus:outline-none select-none cursor-pointer",
        checked
          ? activeColor
          : "bg-slate-200 dark:bg-slate-700 border-2 border-slate-300/80 dark:border-slate-600/60",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={cn(
          "pointer-events-none flex items-center justify-center rounded-full shadow-md transition-all",
          checked
            ? "h-6 w-6 translate-x-5 bg-white text-slate-800"
            : "h-4.5 w-4.5 translate-x-0.5 bg-slate-400 dark:bg-slate-300"
        )}
      >
        {checked && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Check size={13} strokeWidth={3.5} className="text-slate-800" />
          </motion.div>
        )}
      </motion.span>
    </button>
  );
}
