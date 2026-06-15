import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cloud, Plane, Trophy, RotateCcw, AlertTriangle, Zap, Info } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTranslation } from "react-i18next";

export default function GlikoSkyHigher() {
    const { t } = useTranslation();
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameOver'>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem('glikosky_highscore') || 0));
  const [planeY, setPlaneY] = useState(100);
  const [obstacles, setObstacles] = useState<any[]>([]);
  const gameRef = useRef<HTMLDivElement>(null);
  
  const PLANE_SIZE = 40;
  const GAME_HEIGHT = 300;
  const GRAVITY = 1.6;
  const LIFT = -32;

  useEffect(() => {
    let animationId: number;

    if (gameState === 'playing') {
      const update = () => {
        setPlaneY(y => {
          const nextY = y + GRAVITY;
          if (nextY > GAME_HEIGHT - PLANE_SIZE || nextY < 0) {
            setGameState('gameOver');
            return y;
          }
          return nextY;
        });

        setObstacles(obs => {
          // Move obstacles
          const moved = obs.map(o => ({ ...o, x: o.x - 4 }));
          // Filter off-screen
          const filtered = moved.filter(o => o.x > -50);
          
          // Collision check
          const collided = filtered.some(o => 
             o.x < 100 + PLANE_SIZE && o.x + 40 > 100 &&
             ((planeY < o.topHeight) || (planeY + PLANE_SIZE > GAME_HEIGHT - o.bottomHeight))
          );

          if (collided) {
            setGameState('gameOver');
          }

          // Add new
          if (filtered.length < 3 && (!filtered.length || filtered[filtered.length-1].x < 200)) {
            const gap = 160;
            const top = Math.random() * (GAME_HEIGHT - gap - 60) + 30;
            filtered.push({ 
                id: Date.now(), 
                x: 300, 
                topHeight: top, 
                bottomHeight: GAME_HEIGHT - top - gap 
            });
            setScore(s => s + 1);
          }

          return filtered;
        });

        animationId = requestAnimationFrame(update);
      };
      animationId = requestAnimationFrame(update);
    }

    return () => cancelAnimationFrame(animationId);
  }, [gameState, planeY]);

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('glikosky_highscore', String(score));
    }
  }, [score, highScore]);

  const jump = () => {
    if (gameState === 'playing') {
      setPlaneY(y => Math.max(0, y + LIFT));
    } else if (gameState === 'idle' || gameState === 'gameOver') {
      startGame();
    }
  };

  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setPlaneY(100);
    setObstacles([]);
  };

  return (
    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800 glass-target">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-black text-sm dark:text-white flex items-center gap-2">
            <Zap size={16} className="text-sky-500" />  {t('auto.sky_higher', { defaultValue: 'Sky Higher' })}
                                </h3>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{t('auto.leć_wysoko_nad_chmurami_cukru', { defaultValue: i18n.t('auto.lec_wysoko_nad_chmurami_c', { defaultValue: "Leć wysoko nad chmurami cukru" }) })}</p>
        </div>
        <div className="flex items-center gap-3">
           <div className="text-[10px] font-black bg-white dark:bg-slate-800 px-3 py-1 rounded-full shadow-sm text-sky-600">
             
                                   {t('auto.pkt', { defaultValue: 'PKT:' })} {score}
           </div>
           <div className="text-[10px] font-black bg-slate-200 dark:bg-slate-700 px-3 py-1 rounded-full shadow-sm">
             
                                   {t('auto.best', { defaultValue: 'BEST:' })} {highScore}
           </div>
        </div>
      </div>

      <div 
        ref={gameRef}
        onClick={jump}
        className="relative bg-sky-100 dark:bg-sky-950/30 w-full h-[300px] rounded-2xl overflow-hidden cursor-pointer active:scale-[0.99] transition-transform border border-sky-200/50 dark:border-sky-500/20"
      >
        {/* Background Clouds */}
        <div className="absolute inset-0 opacity-30 pointer-events-none">
            <Cloud className="absolute top-10 left-10 text-white" size={40} />
            <Cloud className="absolute top-40 left-60 text-white" size={60} />
            <Cloud className="absolute top-20 left-[200px] text-white" size={30} />
        </div>

        {/* Plane */}
        <motion.div 
          className="absolute left-[100px]"
          animate={{ top: planeY, rotate: gameState === 'playing' ? -15 : 0 }}
          style={{ width: PLANE_SIZE, height: PLANE_SIZE }}
        >
          <Plane className="text-sky-600 dark:text-sky-400 drop-shadow-lg" size={PLANE_SIZE} fill="currentColor" />
        </motion.div>

        {/* Obstacles */}
        {obstacles.map(obs => (
          <React.Fragment key={obs.id}>
             <div 
               className="absolute bg-rose-400/80 dark:bg-rose-500/40 w-[40px] rounded-b-xl border-b-4 border-rose-600/20"
               style={{ left: obs.x, top: 0, height: obs.topHeight }}
             />
             <div 
               className="absolute bg-rose-400/80 dark:bg-rose-500/40 w-[40px] rounded-t-xl border-t-4 border-rose-600/20"
               style={{ left: obs.x, top: GAME_HEIGHT - obs.bottomHeight, height: obs.bottomHeight }}
             />
          </React.Fragment>
        ))}

        {/* Screens */}
        <AnimatePresence>
          {gameState === 'idle' && (
            <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 flex flex-col items-center justify-center bg-sky-600/20 backdrop-blur-sm"
            >
              <Plane size={48} className="text-white mb-4 animate-bounce" />
              <p className="text-white font-black text-xs uppercase tracking-widest bg-sky-600 px-6 py-2 rounded-full">
                
                                              {t('auto.kliknij_aby_wystartować', { defaultValue: i18n.t('auto.kliknij_aby_wystartowac', { defaultValue: "Kliknij aby wystartować" }) })}
                                            </p>
            </motion.div>
          )}

          {gameState === 'gameOver' && (
            <motion.div 
               initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 flex flex-col items-center justify-center bg-rose-600/40 backdrop-blur-md"
            >
              <AlertTriangle size={48} className="text-white mb-4" />
              <h2 className="text-white font-black text-2xl italic mb-1 uppercase tracking-tighter">{t('auto.ups_zjazd', { defaultValue: 'Ups! Zjazd' })}</h2>
              <p className="text-white/80 font-bold text-xs mb-6 uppercase">{t('auto.punkty', { defaultValue: 'Punkty:' })} {score}</p>
              <button 
                onClick={(e) => { e.stopPropagation(); startGame(); }}
                className="bg-white text-rose-600 px-8 py-3 rounded-full font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-transform"
              >
                <RotateCcw size={16} />  {t('auto.ponów_próbę', { defaultValue: i18n.t('auto.ponow_probe', { defaultValue: "Ponów próbę" }) })}
                                            </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-4 flex items-center gap-3 text-slate-400">
         <Info size={14} className="shrink-0" />
         <p className="text-[9px] font-medium leading-tight">{t('auto.omijaj_chmury_wysokich_i_niskich_cu', { defaultValue: i18n.t('auto.omijaj_chmury_wysokich_i', { defaultValue: "Omijaj chmury wysokich i niskich cukrów (czerwone przeszkody). Każdy skok to walka o stabilną glikemię!" }) })}</p>
      </div>
    </div>
  );
}
