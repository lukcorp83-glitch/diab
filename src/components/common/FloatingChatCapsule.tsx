import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Haptics } from '../../lib/haptics';
import { SKINS, ACCESSORIES } from '../../data/petDatabase';
import GlikoAssistant from '../GlikoAssistant';
import { useTranslation } from 'react-i18next';

interface FloatingChatCapsuleProps {
  settings?: any;
  petData?: any;
  onAddToPlate?: (item: any) => void;
  messages: any[];
  setMessages: React.Dispatch<React.SetStateAction<any[]>>;
  isTyping: boolean;
  onSend: (text: string) => void;
  activeTab: string;
}

export default function FloatingChatCapsule({
  settings,
  petData,
  onAddToPlate,
  messages,
  setMessages,
  isTyping,
  onSend,
  activeTab
}: FloatingChatCapsuleProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const isDraggingRef = useRef(false);

  // Ukryj pigułkę, jeśli wyłączono w ustawieniach lub aktywna jest pełna zakładka asystenta/czatu
  if (settings?.floatingChatEnabled === false) return null;
  if (activeTab === 'assistant' || activeTab === 'chat') return null;

  const isChild = settings?.childMode ?? false;

  // Mini-awatar dla trybu dziecka
  const renderPetIcon = () => {
    let src = '';
    let emoji = '';

    const targetSkin = petData?.skin || 'default';
    const foundSkin = SKINS.find(s => s.id === targetSkin);
    if (foundSkin) {
      emoji = foundSkin.icon;
      if (foundSkin.imageUrl) src = foundSkin.imageUrl;
    }

    if (!src) {
      const lvl = petData?.level || 1;
      if (lvl < 5) src = 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Food/Egg.png';
      else if (lvl < 10) src = 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Turtle.png';
      else if (lvl < 15) src = 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Sauropod.png';
      else if (lvl < 20) src = 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/T-Rex.png';
      else src = 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Dragon.png';
    }

    const currentAccId = petData?.currentAccessory || 'none';
    const currentAccessory = ACCESSORIES.find(a => a.id === currentAccId);

    return (
      <div className="relative w-8 h-8 rounded-full flex items-center justify-center overflow-hidden pointer-events-none">
        {src && !imageError ? (
          <img
            src={src}
            alt="Pet"
            loading="eager"
            decoding="async"
            className="w-full h-full object-contain"
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
          />
        ) : (
          <span className="text-lg">{emoji || '🐾'}</span>
        )}
        {currentAccessory && currentAccessory.id !== 'none' && currentAccessory.imageUrl && (
          <img
            src={currentAccessory.imageUrl}
            alt="Accessory"
            className="absolute top-0 right-0 w-3 h-3 object-contain pointer-events-none"
            referrerPolicy="no-referrer"
          />
        )}
      </div>
    );
  };

  return (
    <>
      {/* Pływający przycisk FAB z obsługą przeciągania (drag) oraz pozycją powyżej dolnej belki */}
      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0.15}
        onDragStart={() => {
          isDraggingRef.current = true;
        }}
        onDragEnd={() => {
          // Krótkie opóźnienie, aby kliknięcie nie odpalało się tuż po zakończeniu gestu przeciągania
          setTimeout(() => {
            isDraggingRef.current = false;
          }, 100);
        }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => {
          if (isDraggingRef.current) return;
          Haptics.light();
          setIsOpen(true);
        }}
        className={cn(
          "gpu-layer will-change-transform fixed bottom-28 right-5 z-40 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center cursor-grab active:cursor-grabbing touch-none select-none",
          "border transition-colors duration-200",
          isChild
            ? "bg-gradient-to-tr from-amber-400 to-orange-500 text-white border-white/40 shadow-orange-500/40"
            : cn(
                "bg-white dark:bg-slate-900 text-slate-800 dark:text-white",
                "border-slate-200/90 dark:border-slate-700/80 shadow-[0_10px_30px_rgba(0,0,0,0.18)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.5)]",
                "hover:border-indigo-500/50 dark:hover:border-indigo-400/50"
              )
        )}
        aria-label={t('auto.asystent_ai', { defaultValue: 'Czat Asystenta' })}
      >
        {isChild ? (
          renderPetIcon()
        ) : (
          <div className="relative flex items-center justify-center pointer-events-none">
            <MessageSquare size={24} className="text-slate-700 dark:text-slate-200" strokeWidth={2.2} />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
          </div>
        )}
      </motion.div>

      {/* Podręczne okno czatu z płynną animacją wejścia i wyjścia */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:justify-end md:p-6">
            {/* Płynne tło (backdrop) z animacją fade */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
              onClick={() => {
                Haptics.light();
                setIsOpen(false);
              }}
            />

            {/* Kontener czatu z animacją sprężynową (Slide up na mobile / Scale + fade na desktopie) */}
            <motion.div
              initial={{ y: "100%", opacity: 0.5, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: "100%", opacity: 0, scale: 0.96 }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className={cn(
                "gpu-layer will-change-transform relative z-10 w-full md:w-[460px] h-[82vh] md:h-[700px] max-h-[90vh]",
                "bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100",
                "rounded-t-[2.2rem] md:rounded-[2.2rem] shadow-2xl overflow-hidden",
                "border border-slate-200 dark:border-slate-800/80 flex flex-col"
              )}
            >
              {/* Uchwyt do przesuwania / zamknięcia na telefonach */}
              <div 
                className="md:hidden w-full flex items-center justify-center pt-2.5 pb-1 cursor-pointer"
                onClick={() => {
                  Haptics.light();
                  setIsOpen(false);
                }}
              >
                <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
              </div>

              {/* Zawartość czatu */}
              <div className="flex-1 overflow-hidden p-3 md:p-4">
                <GlikoAssistant
                  settings={settings}
                  petData={petData}
                  onAddToPlate={onAddToPlate}
                  messages={messages}
                  setMessages={setMessages}
                  isTyping={isTyping}
                  onSend={onSend}
                  onClose={() => setIsOpen(false)}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
