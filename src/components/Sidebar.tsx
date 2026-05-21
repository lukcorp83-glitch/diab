import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Database, 
  Utensils, 
  FileText, 
  Settings, 
  X, 
  ChevronDown, 
  Activity, 
  Calculator, 
  Plus, 
  Search, 
  Star, 
  BookOpen,
  History, 
  Brain, 
  Trophy, 
  Sliders, 
  Bell, 
  Pill, 
  Globe, 
  Beaker, 
  HelpCircle, 
  Smartphone, 
  Signal,
  Home, 
  LayoutGrid, 
  Gamepad2, 
  MessageSquare, 
  PawPrint, 
  ShoppingBag,
  Sparkles,
  Cpu,
  Facebook
} from 'lucide-react';
import { cn } from '../lib/utils'; // uses clsx and tailwind-merge
import { APP_VERSION, FACEBOOK_GROUP_URL } from '../constants';
import GlikoSenseIcon from './GlikoSenseIcon';

import Logo from './Logo';
import { Haptics } from '../lib/haptics';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  changeTab: (tab: string) => void;
  onAction?: (action: string) => void;
  theme: 'light' | 'dark';
  isChildMode?: boolean;
}

export default function Sidebar({ isOpen, onClose, activeTab, changeTab, onAction, theme, isChildMode }: SidebarProps) {
  const [expandedItems, setExpandedItems] = useState<{ [key: string]: boolean }>({});

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const menuItems = [
    { 
       id: 'dashboard', 
       label: 'Pulpit & Narzędzia', 
       icon: <LayoutDashboard size={20} />,
       subItems: [
         { id: 'dash_home', label: 'Strona Główna', tab: 'dashboard', icon: <LayoutGrid size={14} /> },
         { id: 'dash_chart', label: 'Wykres Główny', tab: 'chart', icon: <Activity size={14} /> },
         { id: 'bolus_calc', label: 'Kalkulator Bolusa', tab: 'bolus', icon: <Calculator size={14} /> },
         { id: 'add_glucose', label: 'Szybki Pomiar (Cukier)', tab: 'dashboard', action: 'add_glucose', icon: <Plus size={14} /> },
         { id: 'profile_training', label: 'GlikoTrening', tab: 'profile', action: 'training', icon: <Activity size={14} /> }
       ]
    },
    { 
       id: 'database', 
       label: 'Baza Produktów', 
       icon: <Database size={20} />,
       subItems: [
         { id: 'db_search', label: 'Katalog Produktów', tab: 'database', icon: <Search size={14} /> },
         { id: 'db_diets', label: 'Diety & Nawyki', tab: 'diets', icon: <BookOpen size={14} /> },
         { id: 'db_favorites', label: 'Ulubione Produkty', tab: 'database', icon: <Star size={14} /> },
         { id: 'profile_food', label: 'Menedżer Produktów', tab: 'profile', action: 'food', icon: <Settings size={14} /> }
       ]
    },
    { 
       id: 'meal', 
       label: 'Posiłki & Talerz', 
       icon: <Utensils size={20} />,
       subItems: [
         { id: 'meal_plate', label: 'Mój Talerz (Kreator)', tab: 'meal', icon: <Utensils size={14} /> },
         { id: 'meal_today', label: 'Dzisiejsze Posiłki', tab: 'meal', icon: <History size={14} /> },
         { id: 'meal_custom', label: 'Szybkie Wybory', tab: 'meal', icon: <Plus size={14} /> }
       ]
    },
    { 
       id: 'history', 
       label: 'Analiza & Dane', 
       icon: <FileText size={20} />,
       subItems: [
          { id: 'profile_stats', label: 'Statystyki', tab: 'profile', action: 'stats', icon: <Activity size={14} /> },
          { id: 'history_list', label: 'Dziennik Zdarzeń', tab: 'history', icon: <History size={14} /> },
          { id: 'ai_sense', label: 'GlikoSense AI', tab: 'ai', icon: <GlikoSenseIcon size={14} isAnalyzing={activeTab === 'ai'} /> },
          { id: 'assistant_ai', label: 'Czat Gliko', tab: 'assistant', icon: isChildMode ? <Sparkles size={14} /> : <Cpu size={14} /> }
       ]
    },
    ...(isChildMode ? [{ 
       id: 'gliko', 
       label: 'Świat Gliko', 
       icon: <PawPrint size={20} className="text-indigo-500" />,
       subItems: [
          { id: 'gliko_chat', label: 'Rozmowa z Gliko (AI)', tab: 'chat', icon: <MessageSquare size={14} /> },
          { id: 'gliko_shop', label: 'Sklep Gliko', tab: 'profile', action: 'shop', icon: <ShoppingBag size={14} /> },
          { id: 'gliko_arcade', label: 'Salon Gier Gliko', tab: 'games', icon: <Gamepad2 size={14} /> },
          { id: 'achievements', label: 'Nagrody & Grywalizacja', tab: 'achievements', icon: <Trophy size={14} /> }
       ]
    }] : []),
    { 
       id: 'profile', 
       label: 'System & Urządzenia', 
       icon: <Settings size={20} />,
       subItems: [
         { id: 'profile_settings', label: 'Ustawienia Profilu', tab: 'profile', icon: <Sliders size={14} /> },
         { id: 'profile_devices', label: 'Osprzęt & CGM', tab: 'profile', action: 'devices', icon: <Signal size={14} /> },
         { id: 'profile_meds', label: 'Leki & Przypomnienia', tab: 'profile', action: 'meds', icon: <Pill size={14} /> },
         { id: 'profile_tutorial', label: 'Samouczek & Baza Wiedzy', tab: 'profile', action: 'tutorial', icon: <BookOpen size={14} /> },
         { id: 'profile_api', label: 'Integracje (Nightscout)', tab: 'profile', action: 'api', icon: <Globe size={14} /> }, 
         { id: 'profile_simulator', label: 'Symulator Bolusa', tab: 'profile', action: 'simulator', icon: <Beaker size={14} /> }
       ]
    },
    { 
       id: 'community', 
       label: 'Społeczność', 
       icon: <Facebook size={20} className="text-blue-500" />,
       subItems: [
         { id: 'fb_group', label: 'Grupa na Facebooku', action: 'fb_group', icon: <Facebook size={14} /> }
       ]
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100]"
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: '-100%', opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '-100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 250 }}
            className={cn(
              "fixed top-0 left-0 bottom-0 w-[85%] max-w-sm z-[110] flex flex-col p-8 shadow-2xl overflow-y-auto rounded-r-[3rem]",
              theme === 'dark' ? "bg-[#020617]/95 backdrop-blur-2xl border-r border-white/5" : "bg-white/95 backdrop-blur-2xl border-r border-slate-200"
            )}
          >
            {/* Background elements for that 'Neural' feel */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-accent-500/5 blur-[100px] -ml-32 -mt-32 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] -mr-32 -mb-32 pointer-events-none" />

            <div className="flex items-center justify-between mb-10 pb-6 border-b border-slate-200/50 dark:border-slate-800/30 relative">
              <div className="flex items-center gap-3">
                 <Logo className="w-10 h-10 rounded-2xl shadow-lg shadow-accent-600/20" />
                 <div>
                   <h2 className={cn("text-xl font-black tracking-tighter leading-none uppercase font-display", theme === 'dark' ? "text-white" : "text-slate-900")}>
                     GlikoControl
                   </h2>
                 </div>
              </div>
              <button 
                onClick={onClose}
                className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-accent-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-90"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            <div className="flex flex-col gap-3 relative">
              {menuItems.map((item) => {
                const isActive = activeTab === item.id || (item.subItems && item.subItems.some(sub => sub.tab === activeTab));
                const isExpanded = expandedItems[item.id];
                const hasSubs = item.subItems && item.subItems.length > 0;

                return (
                  <div key={item.id} className="flex flex-col">
                    <button
                      onClick={() => {
                        Haptics.light();
                        changeTab(item.id);
                        if (!hasSubs) onClose();
                        else setExpandedItems(prev => ({ ...prev, [item.id]: !isExpanded }));
                      }}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-3xl transition-all font-black text-left group",
                        isActive
                          ? "bg-accent-50 text-accent-600 dark:bg-accent-500/10 dark:text-accent-400"
                          : "text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-900"
                      )}
                    >
                      <div className="flex items-center gap-4">
                         <motion.span 
                           whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
                           className={cn(
                             "p-2.5 rounded-2xl transition-all", 
                             isActive ? "bg-accent-600 text-white shadow-lg shadow-accent-600/25" : "bg-slate-100 dark:bg-slate-800"
                           )}
                         >
                           {React.cloneElement(item.icon as React.ReactElement<any>, { size: 18 })}
                         </motion.span>
                         <span className="text-[10px] uppercase tracking-[0.1em]">{item.label}</span>
                      </div>
                      
                      {hasSubs && (
                        <div className="p-1 rounded-lg">
                          <ChevronDown size={14} className={cn("transition-transform duration-300", isExpanded && "rotate-180")} />
                        </div>
                      )}
                    </button>
                    
                    <AnimatePresence>
                      {hasSubs && isExpanded && (
                         <motion.div 
                            initial={{ opacity: 0, height: 0, y: -10 }}
                            animate={{ opacity: 1, height: 'auto', y: 0 }}
                            exit={{ opacity: 0, height: 0, y: -10 }}
                            className="flex flex-col gap-1 mt-1 pl-12 pr-2 overflow-hidden"
                         >
                            {item.subItems!.map(sub => (
                               <button
                                  key={sub.id}
                                  onClick={() => {
                                    Haptics.light();
                                    if (sub.id === 'fb_group') {
                                      window.open(FACEBOOK_GROUP_URL, '_blank');
                                    } else {
                                      changeTab(sub.tab || item.id);
                                      onAction && onAction(sub.action || sub.id);
                                    }
                                    onClose();
                                  }}
                                  className="flex items-center gap-3 text-left py-3.5 px-4 rounded-2xl text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-accent-600 dark:text-slate-500 dark:hover:text-accent-400 hover:bg-slate-50 dark:hover:bg-accent-500/5 transition-all group"
                               >
                                  <span className="opacity-40 group-hover:opacity-100 transition-opacity">{sub.icon}</span>
                                  {sub.label}
                               </button>
                            ))}
                         </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            <div className="mt-auto space-y-6 pt-10 border-t border-slate-200/50 dark:border-slate-800/30 relative">
              <div className="px-4 py-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 mb-4">
                 <div className="flex items-center gap-2 mb-1">
                    <Facebook size={14} className="text-blue-500" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">Dołącz do nas!</span>
                 </div>
                 <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed">
                    Na naszej grupie Facebook pojawiają się wszystkie najważniejsze informacje i nowości o aplikacji.
                 </p>
                 <button 
                   onClick={() => window.open(FACEBOOK_GROUP_URL, '_blank')}
                   className="mt-2 text-[9px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 hover:underline"
                 >
                   Otwórz grupę →
                 </button>
              </div>
              <button 
                onClick={() => {
                  Haptics.light();
                  onAction && onAction('tutorial');
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-3 py-5 rounded-3xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-black text-[10px] uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-slate-900/10 dark:shadow-white/5"
              >
                <HelpCircle size={16} />
                Poznaj GlikoControl
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
