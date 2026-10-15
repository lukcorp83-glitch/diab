import React from 'react';
import { motion } from 'motion/react';
import { Check, X } from 'lucide-react';
import { Haptics } from '../../lib/haptics';
import { cn } from '../../lib/utils';

export interface FilterChipOption {
  id: string;
  label: string;
  count?: number;
}

interface FilterChipsProps {
  options: FilterChipOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  className?: string;
}

export const FilterChips: React.FC<FilterChipsProps> = ({
  options,
  selectedId,
  onSelect,
  className
}) => {
  return (
    <div className={cn("flex items-center gap-2 overflow-x-auto scrollbar-none py-1 select-none", className)}>
      {options.map((opt) => {
        const isSelected = selectedId === opt.id;

        return (
          <motion.button
            key={opt.id}
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              Haptics.tick();
              onSelect(opt.id);
            }}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer border",
              isSelected
                ? "bg-accent-500/15 text-accent-700 dark:text-accent-300 border-accent-500/40 shadow-xs"
                : "bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            {isSelected && (
              <motion.span
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 450, damping: 25 }}
                className="flex items-center justify-center shrink-0"
              >
                <Check size={12} strokeWidth={3} className="text-accent-600 dark:text-accent-400" />
              </motion.span>
            )}
            <span>{opt.label}</span>
            {opt.count !== undefined && (
              <span className={cn(
                "text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ml-0.5",
                isSelected
                  ? "bg-accent-500/20 text-accent-700 dark:text-accent-300"
                  : "bg-slate-200/60 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400"
              )}>
                {opt.count}
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
};

export default FilterChips;
