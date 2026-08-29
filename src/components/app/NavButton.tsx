import React from "react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";
import { Haptics } from "../../lib/haptics";

export function NavButton({
  active,
  onClick,
  icon,
  label,
  ecoMode,
}: {
  active: boolean;
  onClick: () => void;
  icon: any;
  label: string;
  ecoMode?: boolean;
}) {
  return (
    <button
      onClick={() => {
        Haptics.light();
        onClick();
      }}
      className={cn(
        "flex flex-col items-center gap-1 relative flex-1 max-w-[60px] h-[60px] justify-center transition-colors outline-none z-10 rounded-2xl select-none",
        active
          ? "text-accent-600 dark:text-accent-400"
          : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300",
      )}
    >
      {active && (
        <motion.div
          layoutId={ecoMode ? undefined : "nav-indicator"}
          className="absolute inset-1 rounded-2xl bg-accent-500/10 dark:bg-accent-400/10 -z-10 select-none pointer-events-none"
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
        />
      )}
      <motion.div
        animate={{
          scale: active ? [0.9, 1.1, 1] : 1,
          y: active ? -1 : 0,
        }}
        transition={{ duration: 0.3 }}
        whileTap={{ scale: 0.85 }}
        className="select-none pointer-events-none"
      >
        {React.cloneElement(icon, { size: 20 })}
      </motion.div>
      <motion.span
        animate={{ opacity: active ? 1 : 0.7 }}
        className="text-[7px] font-black uppercase tracking-widest mt-0.5 select-none pointer-events-none"
      >
        {label}
      </motion.span>
    </button>
  );
}
