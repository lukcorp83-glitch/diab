import React from 'react';
import { cn } from "../../../lib/utils";
import { Droplet } from 'lucide-react';
import { useTranslation } from "react-i18next";
import { Haptics } from '../../../lib/haptics';

export default function QuickMeasurementWidget({
  isEditingLayout,
  setIsGlucoseModalOpen,
}: any) {
  const { t } = useTranslation();

  return (
    <button
      onClick={() => {
        if (!isEditingLayout) {
          Haptics.light();
          setIsGlucoseModalOpen(true);
        }
      }}
      className={cn(
        "bg-rose-500 flex flex-col items-center justify-center gap-2 shadow-2xl shadow-rose-500/40 active:scale-95 group transition-all text-white overflow-hidden relative w-full select-none h-full py-5 rounded-[2.5rem] min-h-[140px]"
      )}
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 blur-[40px] -mr-12 -mt-12 group-hover:bg-white/20 transition-all pointer-events-none"></div>
      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner shrink-0 pointer-events-none">
        <Droplet size={22} />
      </div>
      <span className="font-black text-[12px] uppercase tracking-widest pointer-events-none text-center">
        {t('auto.pomiar', { defaultValue: 'Pomiar' })}
      </span>
    </button>
  );
}
