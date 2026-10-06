import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { Haptics } from '../../lib/haptics';

interface PixelAlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  icon?: LucideIcon;
  variant?: 'primary' | 'danger' | 'warning' | 'amber';
  children?: React.ReactNode;
}

export const PixelAlertDialog: React.FC<PixelAlertDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Zatwierdź',
  cancelLabel = 'Anuluj',
  icon: Icon,
  variant = 'primary',
  children
}) => {
  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          iconBg: 'bg-red-500/15 text-red-500 dark:bg-red-500/20 dark:text-red-400',
          confirmBtn: 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20'
        };
      case 'warning':
      case 'amber':
        return {
          iconBg: 'bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
          confirmBtn: 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20'
        };
      case 'primary':
      default:
        return {
          iconBg: 'bg-sky-500/15 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400',
          confirmBtn: 'bg-sky-500 hover:bg-sky-600 text-white shadow-lg shadow-sky-500/20'
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={() => {
          Haptics.tick();
          onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
          className="bg-white dark:bg-slate-900 rounded-[2.25rem] p-6 max-w-sm w-full shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4 text-center relative overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {Icon && (
            <div className={`w-14 h-14 rounded-full ${styles.iconBg} flex items-center justify-center mx-auto transition-transform`}>
              <Icon size={28} strokeWidth={2.2} />
            </div>
          )}

          <div className="space-y-1.5">
            <h3 className="text-lg font-black tracking-tight text-slate-800 dark:text-white">
              {title}
            </h3>
            {description && (
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {description}
              </p>
            )}
          </div>

          {children && (
            <div className="text-left w-full">
              {children}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                Haptics.tick();
                onClose();
              }}
              className="flex-1 py-3 px-4 rounded-full border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95 cursor-pointer"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={() => {
                Haptics.medium();
                onConfirm();
              }}
              className={`flex-1 py-3 px-4 rounded-full font-black text-xs transition-all active:scale-95 cursor-pointer ${styles.confirmBtn}`}
            >
              {confirmLabel}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
export default PixelAlertDialog;
