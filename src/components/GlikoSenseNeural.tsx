import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Cpu, Zap, Shield, TrendingUp, AlertCircle, Heart, Sparkles } from 'lucide-react';
import GlikoSenseIcon from './GlikoSenseIcon';

interface NeuralNode {
  id: number;
  x: number;
  y: number;
  size: number;
}

interface GlikoSenseNeuralProps {
  glucose: number | null;
  trend: string | null;
  isChildMode: boolean;
  petName?: string;
  accuracy?: number;
  datasetSize?: number;
  children?: React.ReactNode;
}

export default function GlikoSenseNeural({ glucose, trend, isChildMode, petName = 'Gliko', accuracy = 88.2, datasetSize, children }: GlikoSenseNeuralProps) {
  // Generate stable random nodes for the background animation
  const nodes = useMemo(() => {
    return Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2
    }));
  }, []);

  const statusColor = useMemo(() => {
    if (!glucose) return 'bg-slate-400';
    if (glucose < 70) return 'bg-rose-500';
    if (glucose > 180) return 'bg-amber-500';
    return 'bg-emerald-500';
  }, [glucose]);

  const glowColor = useMemo(() => {
    if (!glucose) return 'rgba(148, 163, 184, 0.5)';
    if (glucose < 70) return 'rgba(244, 63, 94, 0.5)';
    if (glucose > 180) return 'rgba(245, 158, 11, 0.5)';
    return 'rgba(16, 185, 129, 0.5)';
  }, [glucose]);

  return (
    <div className="relative w-full p-6 rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 overflow-hidden shadow-xl">
      {/* Neural Background Animation */}
      <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none">
        {nodes.map((node, i) => {
          const nextNode = nodes[(i + 1) % nodes.length];
          return (
            <motion.line
              key={`line-${node.id}`}
              x1={`${node.x}%`}
              y1={`${node.y}%`}
              x2={`${nextNode.x}%`}
              y2={`${nextNode.y}%`}
              stroke={statusColor.replace('bg-', '') === 'slate-400' ? '#94a3b8' : statusColor.replace('bg-', '') === 'rose-500' ? '#f43f5e' : statusColor.replace('bg-', '') === 'amber-500' ? '#f59e0b' : '#10b981'}
              strokeWidth="0.5"
              animate={{ opacity: [0.1, 0.4, 0.1] }}
              transition={{ duration: 3, repeat: Infinity, delay: i * 0.2 }}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        {nodes.map((node, i) => (
          <React.Fragment key={node.id}>
            <motion.div
              initial={{ scale: 1, opacity: 0.3 }}
              animate={{ 
                scale: [1, 1.5, 1],
                opacity: [0.3, 0.6, 0.3],
                x: [`${node.x}%`, `${node.x + 2}%`, `${node.x}%`],
                y: [`${node.y}%`, `${node.y - 2}%`, `${node.y}%`]
              }}
              transition={{ 
                duration: 4 + Math.random() * 4, 
                repeat: Infinity,
                ease: "easeInOut" 
              }}
              className={`absolute rounded-full ${statusColor}`}
              style={{ 
                width: node.size, 
                height: node.size,
                left: `${node.x}%`,
                top: `${node.y}%`
              }}
            />
            {/* Flying Data Packet */}
            {i % 3 === 0 && (
              <motion.div
                animate={{ 
                  x: [`${node.x}%`, `${(node.x + 40) % 100}%`],
                  y: [`${node.y}%`, `${(node.y + 30) % 100}%`],
                  opacity: [0, 1, 0]
                }}
                transition={{ duration: 6, repeat: Infinity, delay: Math.random() * 5 }}
                className={`absolute w-1 h-1 rounded-full ${statusColor} blur-[1px]`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${statusColor} bg-opacity-20`}>
              <GlikoSenseIcon size={20} isAnalyzing={true} />
            </div>
            <div>
              <h3 className="text-sm font-black dark:text-white leading-tight">GlikoSense</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {isChildMode ? `Opiekun ${petName}` : 'Analiza Systemowa AI'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1">
               {[1, 2, 3].map(i => (
                 <motion.div 
                   key={`link-${i}`}
                   animate={{ opacity: [0.3, 1, 0.3] }}
                   transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.4 }}
                   className={`w-1 h-3 rounded-full ${statusColor} opacity-40`}
                 />
               ))}
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Live</span>
              {datasetSize !== undefined && datasetSize < 300 && (
                <div className="flex items-center gap-1">
                  <motion.div 
                    animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="w-1 h-1 rounded-full bg-indigo-500"
                  />
                  <span className="text-[7px] font-black text-indigo-500 uppercase tracking-widest">Training...</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {isChildMode ? (
          <div className="space-y-4">
            {children}
            <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
               <div className="flex items-start gap-3">
                 <div className="mt-1">
                   <Heart className="text-rose-500 fill-rose-500" size={16} />
                 </div>
                 <p className="text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
                   {glucose && glucose < 70 
                     ? `GlikoSense czuje, że ${petName} traci siły! Szybko, zjedzmy coś pysznego, żeby go rozweselić. 🍎`
                     : glucose && glucose > 180
                     ? `${petName} pije teraz dużo wody. Może pobawimy się w coś spokojnego? GlikoSense czuwa. 💧`
                     : `GlikoSense świeci na zielono! ${petName} czuje się świetnie i jest gotowy na zabawę! 🌟`}
                 </p>
               </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Zap className="text-indigo-500" size={12} />
                  <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase">Więź</span>
                </div>
                <div className="h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <motion.div animate={{ width: '92%' }} className="h-full bg-indigo-500" />
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Shield className="text-emerald-500" size={12} />
                  <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase">Tarcza</span>
                </div>
                <div className="h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <motion.div animate={{ width: '100%' }} className="h-full bg-emerald-500" />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Key Functions Indicators */}
            <div className="flex flex-wrap gap-2 mb-2">
              {[
                { label: 'Analiza Trendu', active: trend !== 'STABLE' && trend !== null },
                { label: 'Detekcja Anomalii', active: (glucose !== null && (glucose < 70 || glucose > 200)) || (trend?.includes('FAST')) },
                { label: 'Weryfikacja Posiłku', active: false }, // Will be linked to recent logs in next step if needed
                { label: 'Ochrona Hypo', active: glucose !== null && (glucose < 90 || (glucose < 110 && trend?.includes('DOWN'))) }
              ].map(fn => (
                <div 
                  key={fn.label}
                  className={`px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border transition-all ${
                    fn.active 
                      ? `${statusColor} text-white border-transparent shadow-sm` 
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {fn.label}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Stabilność Systemu</div>
                <div className="relative h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: glucose && (glucose > 180 || glucose < 70) ? '60%' : '94%' }}
                    className={`absolute inset-y-0 ${statusColor}`}
                  />
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pewność</div>
                <div className="text-sm font-black dark:text-white">{accuracy}%</div>
              </div>
            </div>

            {datasetSize !== undefined && (
              <div className="space-y-2 px-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                      className="text-indigo-500"
                    >
                      <Sparkles size={10} />
                    </motion.div>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Postęp Nauki:</span>
                  </div>
                  <span className="text-[9px] font-black text-indigo-500">{datasetSize} pkt / 300 pkt</span>
                </div>
                <div className="relative h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (datasetSize / 300) * 100)}%` }}
                    className="absolute inset-y-0 bg-gradient-to-r from-indigo-500 to-purple-500"
                  />
                  {/* Learning Waves */}
                  <motion.div 
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"
                  />
                </div>
                <p className="text-[8px] font-bold text-slate-400 leading-tight">
                  {datasetSize < 50 ? "Model w fazie bazowej. Gromadzę dane..." : 
                   datasetSize < 200 ? "Model uczy się Twoich nawyków. Coraz wyższa precyzja." :
                   "Model wysoko wyuczony. Rozpoznaję subtelne wzorce biologiczne."}
                </p>
              </div>
            )}

            <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <TrendingUp size={12} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Predykcja 30m</span>
                </div>
                <div className="text-lg font-black dark:text-white">
                  {glucose ? Math.round(glucose + (trend?.includes('UP') ? 18 : trend?.includes('DOWN') ? -12 : 0)) : '--'} 
                  <span className="text-[10px] text-slate-400 ml-1">mg/dL</span>
                </div>
              </div>
              <div className="space-y-1 border-l border-slate-200 dark:border-slate-700 pl-4">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <AlertCircle size={12} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Status Rdzenia</span>
                </div>
                <div className="text-lg font-black dark:text-white">
                  {glucose && (glucose > 250 || glucose < 60) ? 'RYZYKO' : 'NOMINALNY'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Neural Activity Pulse */}
        <div className="mt-6 flex justify-center">
          <motion.div
            animate={{ 
              scale: [1, 1.2, 1],
              boxShadow: [
                `0 0 0px ${glowColor}`,
                `0 0 20px ${glowColor}`,
                `0 0 0px ${glowColor}`
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className={`w-3 h-3 rounded-full ${statusColor}`}
          />
        </div>
      </div>
    </div>
  );
}
