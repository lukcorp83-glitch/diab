import i18n from '../i18n';
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, Target, Trophy, Coins, RotateCcw, Info, Zap } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTranslation } from "react-i18next";

export default function GlikoBackpack() {
    const { t } = useTranslation();
  const [gameState, setGameState] = useState<'idle' | 'aiming' | 'result'>('idle');
  const [gamePower, setGamePower] = useState(0);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem('glikobackpack_highscore') || 0));
  const [resultMsg, setResultMsg] = useState('');
  
  const gameDirectionRef = useRef(1);
  const gamePowerRef = useRef(0);
  const gameRequestRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (gameRequestRef.current) cancelAnimationFrame(gameRequestRef.current);
    }
  }, []);

  const spawnParticles = () => {
    // Logic for particles could go here if needed
  };

  const startMiniGame = () => {
    setGameState('aiming');
    setGamePower(0);
    setResultMsg('');
    gamePowerRef.current = 0;
    gameDirectionRef.current = 1;
    
    const animate = () => {
      gamePowerRef.current += gameDirectionRef.current * 2.5; // Speed adjustment
      if (gamePowerRef.current >= 100) {
        gamePowerRef.current = 100;
        gameDirectionRef.current = -1;
      } else if (gamePowerRef.current <= 0) {
        gamePowerRef.current = 0;
        gameDirectionRef.current = 1;
      }
      setGamePower(gamePowerRef.current);
      gameRequestRef.current = requestAnimationFrame(animate);
    };
    gameRequestRef.current = requestAnimationFrame(animate);
  };

  const throwBackpack = () => {
    if (gameState !== 'aiming') return;
    if (gameRequestRef.current) cancelAnimationFrame(gameRequestRef.current);
    
    setGameState('result');
    const finalPower = gamePowerRef.current;
    let earnedPoints = 0;
    let msg = '';
    
    if (finalPower >= 75 && finalPower <= 85) {
      earnedPoints = 50;
      msg = i18n.t('auto.idealnie_plecak_wyladowal_w_sz', { defaultValue: "IDEALNIE! Plecak wylądował w szafce! 🎒✨" });
    } else if (finalPower >= 60 && finalPower <= 100) {
      earnedPoints = 20;
      msg = 'Dobry rzut! Plecak jest blisko. 🎒👍';
    } else {
      earnedPoints = 5;
      msg = i18n.t('auto.ojej_plecak_wyladowal_na_podlo', { defaultValue: "Ojej, plecak wylądował na podłodze! 🎒💨" });
    }
    
    setScore(s => s + earnedPoints);
    setResultMsg(msg);

    if (score + earnedPoints > highScore) {
      const newHigh = score + earnedPoints;
      setHighScore(newHigh);
      localStorage.setItem('glikobackpack_highscore', String(newHigh));
    }
  };

  return (
    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800 glass-target">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-black text-sm dark:text-white flex items-center gap-2">
            <ShoppingBag size={16} className="text-indigo-500" />  {t('auto.rzut_plecakiem', { defaultValue: 'Rzut Plecakiem' })}
                                </h3>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{t('auto.traf_do_szafki_w_odpowiednim_momenc', { defaultValue: 'Traf do szafki w odpowiednim momencie' })}</p>
        </div>
        <div className="flex items-center gap-3">
           <div className="text-[10px] font-black bg-white dark:bg-slate-800 px-3 py-1 rounded-full shadow-sm text-indigo-600">
             
                                   {t('auto.pkt', { defaultValue: 'PKT:' })} {score}
           </div>
           <div className="text-[10px] font-black bg-slate-200 dark:bg-slate-700 px-3 py-1 rounded-full shadow-sm">
             
                                   {t('auto.best', { defaultValue: 'BEST:' })} {highScore}
           </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center min-h-[220px] relative overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm glass-target">
         {gameState === 'idle' && (
           <div className="text-center">
             <ShoppingBag size={48} className="mx-auto text-indigo-400 mb-4 animate-bounce" />
             <p className="text-xs text-slate-500 mb-6 font-medium max-w-[200px]">{t('auto.wyceluj_i_rzuć_plecakiem_prosto_do_', { defaultValue: 'Wyceluj i rzuć plecakiem prosto do szkolnej szafki!' })}</p>
             <button 
                onClick={startMiniGame} 
                className="bg-indigo-500 hover:bg-indigo-600 text-white font-black text-xs px-8 py-3 rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-indigo-500/20 uppercase tracking-widest"
             >
                
                                          {t('auto.zagraj', { defaultValue: 'ZAGRAJ' })}
                                       </button>
           </div>
         )}
         
         {(gameState === 'aiming' || gameState === 'result') && (
           <div className="w-full flex flex-col items-center">
             <div className="mb-8 relative">
                <motion.div
                  animate={gameState === 'result' ? { 
                    y: [0, -100, -20], 
                    x: [0, 50, 100],
                    rotate: [0, 360],
                    scale: [1, 1.2, 1] 
                  } : {}}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                >
                   <ShoppingBag size={40} className="text-indigo-500 drop-shadow-lg" />
                </motion.div>
             </div>

             <div className="w-full h-6 bg-slate-100 dark:bg-slate-700 rounded-full relative mb-6 overflow-hidden shadow-inner border border-slate-200 dark:border-slate-600">
               {/* Zielona strefa (75-85) */}
               <div className="absolute top-0 bottom-0 left-[75%] w-[10%] bg-emerald-400/50"></div>
               {/* Żółta strefa (60-75 i 85-100) */}
               <div className="absolute top-0 bottom-0 left-[60%] w-[15%] bg-amber-400/30"></div>
               <div className="absolute top-0 bottom-0 left-[85%] w-[15%] bg-amber-400/30"></div>
               
               {/* Wskaźnik */}
               <motion.div 
                 className="absolute top-0 bottom-0 w-1 bg-slate-800 dark:bg-white rounded-full shadow-md z-10"
                 style={{ left: `${gamePower}%` }}
               />
             </div>
             
             {gameState === 'aiming' ? (
                <button 
                   onClick={throwBackpack} 
                   className="w-full bg-indigo-500 text-white font-black text-sm py-4 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-2 uppercase tracking-[0.2em] outline-none"
                >
                   <Target size={20} />  {t('auto.rzuć', { defaultValue: 'RZUĆ!' })}
                                              </button>
             ) : (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  className="w-full text-center"
                >
                   <p className="font-black text-lg dark:text-white mb-2 italic tracking-tight">{resultMsg}</p>
                   <div className="flex justify-center gap-4 mb-4">
                      <div className="flex items-center gap-1 text-amber-500 font-black">
                         <Zap size={16} /> +{resultMsg.includes('IDEALNIE') ? 50 : resultMsg.includes('Dobry') ? 20 : 5}  {t('auto.pkt', { defaultValue: 'pkt' })}
                                                                </div>
                   </div>
                   <button 
                     onClick={() => setGameState('idle')} 
                     className="bg-slate-800 dark:bg-white dark:text-slate-900 text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-transform"
                   >
                     
                                                           {t('auto.graj_ponownie', { defaultValue: 'Graj Ponownie' })}
                                                         </button>
                </motion.div>
             )}
           </div>
         )}
      </div>

      <div className="mt-4 flex items-center gap-3 text-slate-400">
         <Info size={14} className="shrink-0" />
         <p className="text-[9px] font-medium leading-tight">{t('auto.uchwyć_moment_gdy_wskaźnik_znajduje', { defaultValue: 'Uchwyć moment, gdy wskaźnik znajduje się w zielonej strefie, aby trafić idealnie do szafki!' })}</p>
      </div>
    </div>
  );
}
