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
  Home, 
  LayoutGrid, 
  Gamepad2, 
  MessageSquare, 
  PawPrint, 
  ShoppingBag,
  Sparkles,
  Cpu
} from 'lucide-react';
import { cn } from '../lib/utils'; // uses clsx and tailwind-merge
import { APP_VERSION } from '../constants';

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
         { id: 'bolus_calc', label: 'Kalkulator Bolusa', tab: 'bolus', icon: <Calculator size={14} /> },
         { id: 'add_glucose', label: 'Szybki Pomiar (Cukier)', tab: 'dashboard', action: 'add_glucose', icon: <Plus size={14} /> }
       ]
    },
    { 
       id: 'database', 
       label: 'Baza Produktów', 
       icon: <Database size={20} />,
       subItems: [
         { id: 'db_search', label: 'Katalog Produktów', tab: 'database', icon: <Search size={14} /> },
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
          { id: 'history_list', label: 'Dziennik Zdarzeń', tab: 'history', icon: <History size={14} /> },
          { id: 'ai_sense', label: 'GlikoSense AI', tab: 'ai', icon: <Brain size={14} /> },
          { id: 'assistant_ai', label: 'Asystent AI', tab: 'assistant', icon: isChildMode ? <Sparkles size={14} /> : <Cpu size={14} /> }
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
         { id: 'profile_devices', label: 'Osprzęt & CGM', tab: 'profile', action: 'devices', icon: <Smartphone size={14} /> },
         { id: 'profile_meds', label: 'Leki & Przypomnienia', tab: 'profile', action: 'meds', icon: <Pill size={14} /> },
         { id: 'profile_api', label: 'Integracje (Nightscout)', tab: 'profile', action: 'api', icon: <Globe size={14} /> }, 
         { id: 'profile_simulator', label: 'Symulator Bolusa', tab: 'profile', action: 'simulator', icon: <Beaker size={14} /> }
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
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              "fixed top-0 left-0 bottom-0 w-3/4 max-w-sm z-[110] flex flex-col p-6 shadow-2xl overflow-y-auto",
              theme === 'dark' ? "bg-slate-950 border-r border-slate-800" : "bg-white border-r border-slate-200"
            )}
          >
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className={cn("text-xl font-black tracking-tight", theme === 'dark' ? "text-white" : "text-slate-900")}>
                Menu
              </h2>
              <button 
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-accent-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {menuItems.map((item) => {
                const isActive = activeTab === item.id || (item.subItems && item.subItems.some(sub => sub.tab === activeTab));
                const isExpanded = expandedItems[item.id];
                const hasSubs = item.subItems && item.subItems.length > 0;

                return (
                  <div key={item.id} className="flex flex-col">
                    <button
                      onClick={() => {
                        changeTab(item.id);
                        if (!hasSubs) onClose();
                        else setExpandedItems(prev => ({ ...prev, [item.id]: true }));
                      }}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-2xl transition-all font-bold text-left",
                        isActive
                          ? "bg-accent-50 text-accent-600 dark:bg-accent-900/20 dark:text-accent-400"
                          : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50"
                      )}
                    >
                      <div className="flex items-center gap-4">
                         <span className={cn("p-2 rounded-xl", isActive ? "bg-accent-100 dark:bg-accent-900/50" : "bg-slate-100 dark:bg-slate-800")}>
                           {item.icon}
                         </span>
                         <span className="text-sm uppercase tracking-widest">{item.label}</span>
                      </div>
                      
                      {hasSubs && (
                        <div 
                          onClick={(e) => toggleExpand(item.id, e)}
                          className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                        >
                          <ChevronDown size={16} className={cn("transition-transform", isExpanded && "rotate-180")} />
                        </div>
                      )}
                    </button>
                    
                    {hasSubs && isExpanded && (
                       <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="flex flex-col gap-1 mt-1 pl-14 pr-2 overflow-hidden"
                       >
                          {item.subItems!.map(sub => (
                             <button
                                key={sub.id}
                                onClick={() => {
                                  changeTab(sub.tab || item.id);
                                  onAction && onAction(sub.action || sub.id);
                                  onClose();
                                }}
                                className="flex items-center gap-3 text-left py-3 px-3 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                             >
                                <span className="opacity-60">{sub.icon}</span>
                                {sub.label}
                             </button>
                          ))}
                       </motion.div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-auto space-y-4 pt-6 border-t border-slate-200 dark:border-slate-800">
              <button 
                onClick={() => {
                  onAction && onAction('tutorial');
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-accent-50 dark:bg-accent-500/10 text-accent-600 dark:text-accent-400 font-black text-[10px] uppercase tracking-widest hover:bg-accent-100 transition-all border border-accent-100 dark:border-accent-800/30 shadow-sm"
              >
                <HelpCircle size={18} />
                Pomoc / Tutorial
              </button>

              <div className="text-center">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                  GlikoControl v{APP_VERSION}
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
