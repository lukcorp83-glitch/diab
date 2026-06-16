import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  User, 
  Sparkles, 
  Trash2, 
  Volume2,
  VolumeX,
  Lightbulb,
  Cpu,
  Brain,
  Mic,
  Activity,
  Zap
} from 'lucide-react';
import { geminiService } from '../services/gemini';
import { cn } from '../lib/utils';
import { LogEntry, UserSettings, AssistantMessage } from '../types';
import { SKINS, ACCESSORIES } from '../constants';
import { useTranslation } from "react-i18next";
import i18n from "../i18n";

export default function GlikoAssistant({ 
  user, 
  logs, 
  settings,
  petData,
  onAddToPlate,
  messages,
  setMessages,
  isTyping,
  onSend
}: { 
  user: any; 
  logs: LogEntry[]; 
  settings?: UserSettings;
  petData?: any;
  onAddToPlate?: (item: any) => void;
  messages: AssistantMessage[];
  setMessages: React.Dispatch<React.SetStateAction<AssistantMessage[]>>;
  isTyping: boolean;
  onSend: (text: string) => void;
}) {
    const { t } = useTranslation();
  const isChild = settings?.childMode ?? false;
  const assistantName = isChild ? (petData?.name || "Asystent Gliko") : "Neural Expressive AI";

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'initial',
          role: 'model',
          text: `Witam, jestem Twoim asystentem.`,
          timestamp: Date.now()
        }
      ]);
    }
  }, [messages.length, isChild]);

  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(() => {
    const saved = localStorage.getItem('gliko_assistant_voice');
    return saved !== null ? JSON.parse(saved) : false;
  });
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    localStorage.setItem('gliko_assistant_voice', JSON.stringify(voiceEnabled));
  }, [voiceEnabled]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role === 'model' && Date.now() - lastMsg.timestamp < 2000) {
      speak(lastMsg.text);
    }
  }, [messages]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.lang = 'pl-PL';
      
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
        setTimeout(() => handleSend(transcript), 500);
      };

      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setInput('');
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const speak = (text: string) => {
    if (!voiceEnabled || !window.speechSynthesis) return;
    const cleanText = text.replace(/<[^>]*>/g, '').replace(/\*/g, '');
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'pl-PL';
    utterance.rate = isChild ? 1.1 : 1.0;
    utterance.pitch = isChild ? 1.2 : 0.9;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const handleSend = async (overrideInput?: string) => {
    const messageText = overrideInput || input;
    if (!messageText.trim() || isTyping) return;
    onSend(messageText);
    setInput('');
  };

  const clearChat = () => {
    if (window.confirm(i18n.t('auto.wyczyscic_historie_rozmowy_z_a', { defaultValue: i18n.t('auto.wyczyscic_historie_rozmow', { defaultValue: "Wyczyścić historię rozmowy z asystentem?" }) }))) {
      setMessages([{
        id: 'initial-' + Date.now(),
        role: 'model',
        text: `Witam, jestem Twoim asystentem.`,
        timestamp: Date.now()
      }]);
    }
  };

  const suggestions = isChild ? [
    "Jak rano?",
    "Oblicz jedzenie",
    i18n.t('auto.cos_do_zabawy', { defaultValue: i18n.t('auto.cos_do_zabawy', { defaultValue: "Coś do zabawy" }) }),
    i18n.t('auto.czuje_sie_zle', { defaultValue: i18n.t('auto.czuje_sie_zle', { defaultValue: "Czuję się źle" }) }),
    i18n.t('auto.glodny', { defaultValue: i18n.t('auto.glodny', { defaultValue: "Głodny!" }) })
  ] : [
    "Analiza TIR",
    i18n.t('auto.korelacja_posilkow', { defaultValue: i18n.t('auto.korelacja_posilkow', { defaultValue: "Korelacja posiłków" }) }),
    "Trendy Glikemii",
    "Odczyty Nocne",
    "Model Bazalny"
  ];

  const renderAvatar = (size: 'sm' | 'md' | 'lg' = 'md') => {
    if (!isChild) {
      return null;
    }

    // Children Mode: Render Pet
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
        if (lvl < 5) {
            src = 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Food/Egg.png';
            emoji = '🥚';
        } else if (lvl < 10) {
            src = 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Turtle.png';
            emoji = '🐢'; 
        } else if (lvl < 15) {
            src = 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Sauropod.png';
            emoji = '🦕';
        } else if (lvl < 20) {
            src = 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/T-Rex.png';
            emoji = '🦖';
        } else {
            src = 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Dragon.png';
            emoji = '🐉';
        }
    }

    const currentAccId = petData?.currentAccessory || 'none';
    const currentAccessory = ACCESSORIES.find(a => a.id === currentAccId);

    const containerClasses = cn(
      "relative bg-white/30 dark:bg-[#121212]/50 rounded-full flex items-center justify-center overflow-hidden backdrop-blur-xl",
      size === 'sm' ? "w-10 h-10" : size === 'md' ? "w-14 h-14" : "w-16 h-16"
    );

    const assetSize = size === 'sm' ? "text-xl" : size === 'md' ? "text-3xl" : "text-4xl";

    return (
      <div className={containerClasses}>
        {src && imageError !== src ? (
          <img 
            src={src} 
            alt="Pet" 
            className="w-full h-full object-contain p-1" 
            referrerPolicy="no-referrer" 
            onError={() => setImageError(src)}
          />
        ) : (
          <span className={assetSize}>{emoji || '🐾'}</span>
        )}
        
        {currentAccessory && currentAccessory.id !== 'none' && currentAccessory.imageUrl && (
          <img 
            src={currentAccessory.imageUrl} 
            alt="Accessory" 
            className={cn(
              "absolute pointer-events-none object-contain",
              currentAccessory.id.includes('hat') ? "top-[-10%] left-1/2 -translate-x-1/2 w-1/2 h-1/2" :
              currentAccessory.id.includes('glasses') ? "top-[15%] left-1/2 -translate-x-1/2 w-1/2 h-1/2" :
              "bottom-[10%] left-1/2 -translate-x-1/2 w-1/3 h-1/3"
            )}
            referrerPolicy="no-referrer"
          />
        )}
      </div>
    );
  };

  return (
    <div className={cn(
      "flex flex-col h-full w-full relative",
      "bg-transparent"
    )}>
      {/* Remove the dark forced backgrounds */}

      {/* Header */}
      <div className={cn(
        "p-2 lg:p-4 flex items-center justify-between relative z-10",
        "bg-transparent" 
      )}>
        <div className="flex items-center gap-4">
          {renderAvatar('md')}
        </div>
        <div className="flex items-center gap-2">
           <button 
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={cn(
              "p-3 rounded-full transition-all",
              voiceEnabled 
                ? "bg-accent-500 text-white" 
                : "bg-slate-400/10 dark:bg-slate-800/50 text-slate-500 hover:bg-slate-400/20"
            )}
            title={voiceEnabled ? i18n.t('auto.wycisz_glos', { defaultValue: i18n.t('auto.wycisz_glos', { defaultValue: "Wycisz głos" }) }) : i18n.t('auto.wlacz_glos', { defaultValue: i18n.t('auto.wlacz_glos', { defaultValue: "Włącz głos" }) })}
          >
            {voiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button 
            onClick={clearChat}
            className={cn(
               "p-3 rounded-full transition-all bg-slate-400/10 dark:bg-slate-800/50 hover:bg-rose-500/10 text-slate-500 hover:text-rose-500"
            )}
            title={t('auto.wyczyść_historię', { defaultValue: i18n.t('auto.wyczysc_historie', { defaultValue: "Wyczyść historię" }) })}
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className={cn(
          "flex-1 overflow-y-auto px-4 md:px-8 py-2 space-y-6 relative z-10 no-scrollbar pb-10"
        )}
      >
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={`msg-${message.id}-${message.timestamp}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex gap-4",
                message.role === 'user' ? "flex-row-reverse" : "flex-row"
              )}
            >
              <div className="shrink-0 pt-1">
                {message.role === 'user' ? (
                  <div className={cn(
                     "w-10 h-10 rounded-full flex items-center justify-center",
                     "bg-slate-100 dark:bg-slate-800 text-slate-500"
                  )}>
                    <User size={18} />
                  </div>
                ) : (
                  renderAvatar('sm')
                )}
              </div>
              
              <div className={cn(
                "max-w-[85%] py-2",
                message.role === 'user' 
                    ? "px-5 py-3 bg-slate-100 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 rounded-3xl"
                    : "text-slate-800 dark:text-slate-100"
              )}>
                <div 
                  className={cn(
                    "text-base md:text-lg leading-relaxed prose prose-base max-w-none dark:prose-invert",
                    message.role === 'user' ? "[&_p]:text-slate-900 dark:[&_p]:text-slate-100" : "dark:prose-invert",
                    !isChild && "font-sans"
                  )}
                  dangerouslySetInnerHTML={{ __html: message.text }}
                />
                <div className={cn(
                  "flex items-center gap-2 mt-4",
                  message.role === 'user' ? "justify-end" : "justify-start"
                )}>
                   {message.role === 'model' && (
                     isChild ? <Sparkles size={10} className="text-amber-400 animate-pulse" /> : <Zap size={10} className="text-accent-400" />
                   )}
                   <p className={cn(
                     "text-[9px] opacity-40 font-black uppercase tracking-widest",
                     !isChild && "font-mono opacity-60"
                   )}>
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: !isChild ? '2-digit' : undefined })}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {isTyping && (
          <div className="flex gap-4">
            <div className="shrink-0 pt-1">
              {renderAvatar('sm')}
            </div>
            <div className={cn(
              "flex gap-2 p-4 items-center"
            )}>
              <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1 }} className={cn("w-2 h-2 rounded-full", isChild ? "bg-slate-400" : "bg-slate-500")} />
              <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className={cn("w-2 h-2 rounded-full", isChild ? "bg-slate-400" : "bg-slate-500")} />
              <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className={cn("w-2 h-2 rounded-full", isChild ? "bg-slate-400" : "bg-slate-500")} />
            </div>
          </div>
        )}
      </div>

      {/* Input Section */}
      <div className={cn(
        "p-4 lg:p-6 relative z-10 pb-[100px]",
        "bg-transparent" 
      )}>
        <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
          {suggestions.map((s, i) => (
            <button
              key={`suggestion-${i}`}
              onClick={() => handleSend(s)}
              className={cn(
                "whitespace-nowrap px-4 py-3 rounded-full text-[10px] uppercase tracking-wider flex items-center gap-2 shrink-0 transition-all",
                "bg-white/80 dark:bg-slate-800/80 backdrop-blur-md text-slate-700 dark:text-slate-200 font-black hover:bg-white dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800"
              )}
            >
              {isChild ? <Lightbulb size={12} className="text-amber-500" /> : <Activity size={12} className="text-accent-400" />}
              {s}
            </button>
          ))}
        </div>

        <div className="flex gap-3 mt-2">
          <button
            onClick={toggleListening}
            className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center transition-all shrink-0 border",
              isListening 
                ? "bg-rose-50 text-rose-500 animate-pulse border-rose-200" 
                : "bg-white/80 backdrop-blur-md dark:bg-slate-800/80 text-slate-500 active:scale-95 border-slate-100 dark:border-slate-800"
            )}
            title={t('auto.wybieranie_głosowe', { defaultValue: i18n.t('auto.wybieranie_glosowe', { defaultValue: "Wybieranie głosowe" }) })}
          >
            <Mic size={24} />
          </button>
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={isListening ? i18n.t('auto.slucham_cie', { defaultValue: i18n.t('auto.slucham_cie', { defaultValue: "Słucham Cię..." }) }) : (isChild ? i18n.t('auto.napisz_cos', { defaultValue: i18n.t('auto.napisz_cos', { defaultValue: "Napisz coś..." }) }) : i18n.t('auto.wprowadz_polecenie', { defaultValue: i18n.t('auto.wprowadz_polecenie', { defaultValue: "Wprowadź polecenie..." }) }))}
              className={cn(
                "w-full rounded-full py-4 px-6 text-base md:text-lg transition-all outline-none border",
                "bg-white/80 dark:bg-slate-800/80 backdrop-blur-md focus:bg-white dark:focus:bg-slate-800 text-slate-900 dark:text-white border-slate-100 dark:border-slate-800 focus:border-accent-500/50",
                isListening && "bg-rose-50 border-rose-400 text-rose-600 placeholder:text-rose-400"
              )}
            />
          </div>
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isTyping}
            className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-95 shrink-0 border",
              input.trim() && !isTyping 
                ? "bg-accent-500 text-white shadow-accent-500/20 border-accent-500" 
                : "bg-white/80 backdrop-blur-md dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-800"
            )}
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

