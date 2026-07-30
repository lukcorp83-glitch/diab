import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

export const MeshBackground = ({
  lastGlucose,
  isGlassmorphic,
}: {
  lastGlucose: number | null;
  isGlassmorphic: boolean;
}) => {
  const isAlert =
    lastGlucose !== null && (lastGlucose < 70 || lastGlucose > 180);
  const isUrgent =
    lastGlucose !== null && (lastGlucose < 55 || lastGlucose > 250);

  if (!isGlassmorphic) {
    if (isAlert || isUrgent) {
      return (
        <div
          className={cn(
            "fixed inset-0 -z-10 transition-colors duration-[2000ms] pointer-events-none opacity-10 dark:opacity-20",
            isUrgent ? "bg-rose-500" : "bg-orange-500",
          )}
        />
      );
    }
    return null;
  }

  return (
    <>
      <div className="mesh-bg">
        <motion.div
          animate={{
            opacity: isUrgent ? 0.8 : isAlert ? 0.6 : 0.4,
          }}
          className={cn(
            "w-full h-full transition-all duration-[2000ms] ease-in-out",
            isAlert || isUrgent ? "mesh-gradient-alert" : "mesh-gradient-1",
          )}
        />
      </div>

      {isGlassmorphic && (
        <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden opacity-100 mix-blend-multiply dark:mix-blend-screen">
          <div
            className="absolute top-10 left-10 w-[25rem] h-[25rem] bg-accent-400/20 dark:bg-accent-500/10 blur-[120px] rounded-full animate-pulse"
            style={{ animationDuration: "8s" }}
          />
          <div
            className="absolute top-40 right-10 w-[25rem] h-[25rem] bg-indigo-400/20 dark:bg-indigo-500/10 blur-[120px] rounded-full animate-pulse"
            style={{ animationDuration: "10s" }}
          />
          <div
            className="absolute bottom-20 left-1/2 -translate-x-1/2 w-[25rem] h-[25rem] bg-emerald-400/20 dark:bg-emerald-500/10 blur-[120px] rounded-full animate-pulse"
            style={{ animationDuration: "12s" }}
          />
        </div>
      )}
    </>
  );
};
