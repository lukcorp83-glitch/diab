import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Gamepad2, 
  Gamepad, 
  Puzzle, 
  Flower2, 
  Plane, 
  Brain, 
  ChevronLeft,
  Stars,
  Trophy,
  Zap,
  ShoppingBag
} from 'lucide-react';
import GlikoGarden from './GlikoGarden';
import GlikoMemory from './GlikoMemory';
import PlatePuzzle from './PlatePuzzle';
import GlikoSkyHigher from './GlikoSkyHigher';
import GlikoBackpack from './GlikoBackpack';
import { cn } from '../lib/utils';
import { useTranslation } from "react-i18next";
import i18n from "../i18n";

interface GlikoGamesProps {
  logs: any[];
  user: any;
  setTab: (t: string) => void;
}

export default function GlikoGames({ logs, user, setTab }: GlikoGamesProps) {
    const { t } = useTranslation();
  const [selectedGame, setSelectedGame] = useState<string | null>(null);

  const games = [
    { 
      id: 'garden', 
      name: 'Gliko Garden', 
      desc: i18n.t('auto.podlewaj_rosliny_dobra_glikemi', { defaultValue: "Podlewaj rośliny dobrą glikemią" }), 
      icon: <Flower2 className="text-emerald-500" />,
      tag: 'TIR',
      color: 'emerald' 
    },
    { 
      id: 'skyhigher', 
      name: 'Sky Higher', 
      desc: i18n.t('auto.lec_ponad_chmurami_cukru_kids', { defaultValue: "Leć ponad chmurami cukru (Kids Edition)" }), 
      icon: <Plane className="text-sky-500" />,
      tag: i18n.t('auto.zrecznosc', { defaultValue: "ZRĘCZNOŚĆ" }),
      color: 'sky' 
    },
    { 
      id: 'backpack', 
      name: 'Rzut Plecakiem', 
      desc: 'Traf plecakiem do szafki', 
      icon: <ShoppingBag className="text-indigo-500" />,
      tag: 'WYCZUCIE',
      color: 'indigo' 
    },
    { 
      id: 'plate', 
      name: 'Zagadka Talerzy', 
      desc: i18n.t('auto.zgadnij_gramature_weglowodanow', { defaultValue: "Zgadnij gramaturę węglowodanów" }), 
      icon: <Puzzle className="text-amber-500" />,
      tag: 'WIEDZA',
      color: 'amber' 
    },
    { 
      id: 'memory', 
      name: 'Gliko Memory', 
      desc: i18n.t('auto.cwicz_pamiec_z_gliko', { defaultValue: "Ćwicz pamięć z Gliko" }), 
      icon: <Brain className="text-violet-500" />,
      tag: i18n.t('auto.pamiec', { defaultValue: "PAMIĘĆ" }),
      color: 'violet' 
    },
  ];

  const renderGame = () => {
    switch (selectedGame) {
      case 'garden': return <GlikoGarden logs={logs} />;
      case 'memory': return <GlikoMemory />;
      case 'plate': return <PlatePuzzle />;
      case 'skyhigher': return <GlikoSkyHigher />;
      case 'backpack': return <GlikoBackpack />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col h-full min-h-[500px]">
      <AnimatePresence mode="wait">
        {!selectedGame ? (
          <motion.div 
            key="list"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-xl shadow-indigo-500/20">
              <Stars className="absolute -right-4 -top-4 w-32 h-32 opacity-20 rotate-12" />
              <div className="relative z-10">
                <h2 className="text-2xl font-black italic tracking-tighter mb-2 flex items-center gap-2">
                   
                                                     {t('auto.gliko_arcade', { defaultValue: 'Gliko Arcade' })} <Gamepad2 size={24} />
                </h2>
                <p className="text-xs font-medium text-white/80 max-w-[200px]">{t('auto.graj_ucz_się_i_rozwijaj_swój_ogród_', { defaultValue: 'Graj, ucz się i rozwijaj swój ogród glikemii każdego dnia!' })}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {games.map(game => (
                <button
                  key={game.id}
                  onClick={() => setSelectedGame(game.id)}
                  className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-[2rem] flex items-center gap-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all text-left shadow-sm group active:scale-[0.98]"
                >
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner",
                    game.color === 'emerald' ? 'bg-emerald-50 dark:bg-emerald-500/10' :
                    game.color === 'sky' ? 'bg-sky-50 dark:bg-sky-500/10' :
                    game.color === 'amber' ? 'bg-amber-50 dark:bg-amber-500/10' :
                    'bg-violet-50 dark:bg-violet-500/10'
                  )}>
                    {game.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                       <h3 className="font-black text-sm dark:text-white">{game.name}</h3>
                       <span className={cn(
                         "text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest",
                         game.color === 'emerald' ? 'bg-emerald-100 text-emerald-600' :
                         game.color === 'sky' ? 'bg-sky-100 text-sky-600' :
                         game.color === 'amber' ? 'bg-amber-100 text-amber-600' :
                         'bg-violet-100 text-violet-600'
                       )}>
                         {game.tag}
                       </span>
                    </div>
                    <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{game.desc}</p>
                  </div>
                  <ChevronLeft className="rotate-180 text-slate-300 group-hover:text-slate-500 transition-colors" size={20} />
                </button>
              ))}
            </div>

            <div className="bg-slate-100/50 dark:bg-slate-800/30 p-6 rounded-[2.5rem] border border-dashed border-slate-300 dark:border-slate-700 text-center">
              <Trophy className="text-slate-400 dark:text-slate-600 mx-auto mb-2" size={32} />
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('auto.twoje_rekordy_są_zapisywane_lokalni', { defaultValue: 'Twoje rekordy są zapisywane lokalnie' })}</p>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="game"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex-1 flex flex-col"
          >
            <button 
              onClick={() => setSelectedGame(null)}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 mb-6 active:scale-95 transition-all"
            >
              <ChevronLeft size={16} />  {t('auto.wróć_do_salonu_gier', { defaultValue: 'Wróć do salonu gier' })}
                                          </button>
            {renderGame()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
