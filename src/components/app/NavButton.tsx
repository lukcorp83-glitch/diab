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
        "flex flex-col items-center gap-1 relative flex-1 max-w-[60px] h-full justify-center transition-colors outline-none",
        active
          ? "text-accent-600 dark:text-accent-400"
          : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300",
      )}
    >
      <motion.div
        animate={{
          scale: active ? [0.8, 1.2, 1] : 1,
          y: active ? -2 : 0,
        }}
        transition={{ duration: 0.3 }}
        whileTap={{ scale: 0.8 }}
      >
        {React.cloneElement(icon, { size: 20 })}
      </motion.div>
      <motion.span
        animate={{ opacity: active ? 1 : 0.7 }}
        className="text-[7px] font-black uppercase tracking-widest mt-0.5"
      >
        {label}
      </motion.span>
      {active && (
        <motion.div
          layoutId={ecoMode ? undefined : "nav-indicator"}
          className="absolute bottom-2 w-1 h-1 rounded-full bg-accent-600 dark:bg-accent-400"
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      )}
    </button>
  );
}
