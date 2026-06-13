import React, { useState } from 'react';
import { Download, Upload, Loader2, FileJson } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { loadLocalLogs, saveLocalLogs } from '../lib/localLogs';

import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getEffectiveUid } from '../lib/utils';
import { UserSettings } from '../types';
import { useTranslation } from "react-i18next";
import i18n from "../i18n";

export default function LocalSync({ 
  settings,
  user
}: { 
  settings: UserSettings,
  user: any
}) {
    const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const lsData: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          lsData[key] = localStorage.getItem(key) || '';
        }
      }
      
      const logs = await loadLocalLogs();

      const exportData = {
        timestamp: Date.now(),
        localStorage: lsData,
        logs: logs,
        settings: settings
      };

      const dataStr = JSON.stringify(exportData);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `GlikoControl_Kopia_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(i18n.t('auto.zapisano_kopie_zapasowa', { defaultValue: "Zapisano kopię zapasową" }));
    } catch (e) {
      console.error(e);
      toast.error(i18n.t('auto.blad_podczas_eksportu', { defaultValue: "Błąd podczas eksportu." }));
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (parsed.localStorage) {
        Object.keys(parsed.localStorage).forEach(key => {
          localStorage.setItem(key, parsed.localStorage[key]);
        });
      }

      if (parsed.logs && Array.isArray(parsed.logs)) {
        await saveLocalLogs(parsed.logs);
      }

      if (parsed.settings && user) {
        await setDoc(
          doc(db, "artifacts", "diacontrolapp", "users", getEffectiveUid(user), "settings", "profile"),
          parsed.settings,
          { merge: true }
        );
      }

      toast.success(i18n.t('auto.pomyslnie_zaimportowano_odswie', { defaultValue: "Pomyślnie zaimportowano. Odświeżam..." }));
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      console.error(err);
      toast.error(i18n.t('auto.blad_formatu_pliku_lub_blad_im', { defaultValue: "Błąd formatu pliku lub błąd importu" }));
    } finally {
      setLoading(false);
      e.target.value = ''; // reset
    }
  };

  return (
    <div className="flex flex-col gap-2 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 glass-target">
      <div className="flex items-center gap-3 mb-2">
        <FileJson className="text-emerald-500" size={20} />
        <span className="text-xs font-bold dark:text-white">{t('auto.kopia_zapasowa_offline_plik', { defaultValue: 'Kopia Zapasowa Offline (Plik)' })}</span>
      </div>
      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mb-2">
        
                      {t('auto.bezpieczny_sposób_na_przeniesienie_', { defaultValue: 'Bezpieczny sposób na przeniesienie dancyh (ustawień, dziennika, układu kafelków) między przeglądarką (PWA) a aplikacją (APK) bez użycia chmury. Dodatkowo działa to jako lokalny backup w razie awarii.' })}
                    </p>

      <div className="grid grid-cols-2 gap-2 mt-2">
        <button 
          onClick={handleExport}
          disabled={loading}
          className="bg-emerald-500 text-white rounded-xl p-3 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} 
           
                            {t('auto.zapisz_plik', { defaultValue: 'Zapisz Plik' })}
                          </button>
        
        <label className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl p-3 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all cursor-pointer">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} 
           
                            {t('auto.wgraj_plik', { defaultValue: 'Wgraj Plik' })}
                            <input 
            type="file" 
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
        </label>
      </div>
    </div>
  );
}
