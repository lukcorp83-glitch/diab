import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  MessageCircle, 
  Sparkles, 
  User, 
  Bot, 
  Trash2, 
  ChevronRight,
  Heart,
  Lightbulb,
  Zap,
  PawPrint,
  Mic,
  MicOff,
  Volume2,
  VolumeX
} from 'lucide-react';
import { geminiService } from '../services/gemini';
import { cn } from '../lib/utils';
import { Virtuoso } from 'react-virtuoso';
import { SKINS, ACCESSORIES } from '../constants';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export default function GlikoChat({ petData, settings }: { petData: any, settings?: any }) {
  const isKidMode = settings?.childMode ?? true;
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(() => {
    const saved = localStorage.getItem('gliko_voice_enabled');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [imageError, setImageError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    localStorage.setItem('gliko_voice_enabled', JSON.stringify(voiceEnabled));
  }, [voiceEnabled]);

  // Initialize Speech Recognition
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
        // Automatically send after voice input
        setTimeout(() => {
           handleSend(transcript);
        }, 500);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
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
    
    // Clean up text: remove asterisks for smoother reading
    const cleanText = text.replace(/\*/g, '');
    
    // Stop any current speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'pl-PL';
    utterance.rate = 1.1; // Slightly faster and more energetic
    utterance.pitch = 1.2; // Higher pitch for a "pet" voice
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
  };

  const toggleVoice = () => {
    const newValue = !voiceEnabled;
    setVoiceEnabled(newValue);
    if (!newValue && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const renderPetAvatar = (size: 'sm' | 'md' | 'lg' = 'md') => {
    if (!isKidMode) {
      const containerClasses = cn(
        "relative bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-inner overflow-hidden border-2 border-indigo-200/50",
        size === 'sm' ? "w-10 h-10" : size === 'md' ? "w-14 h-14 md:w-16 md:h-16" : "w-20 h-20"
      );
      return (
        <div className={containerClasses}>
          <Bot size={size === 'sm' ? 20 : size === 'md' ? 28 : 36} className="text-white" />
        </div>
      );
    }
    // Logic extracted from VirtualPet.tsx to be consistent
    const getPetVisual = () => {
      let src = '';
      let emoji = '';
      
      // skins check
      const targetSkin = petData?.skin || 'default';
      const foundSkin = SKINS.find(s => s.id === targetSkin);
      if (foundSkin) {
          emoji = foundSkin.icon;
          if (foundSkin.imageUrl) {
            src = foundSkin.imageUrl;
          } 
      }

      // Default to level based forms if no special imageUrl found
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
      return { src, emoji };
    };

    const { src, emoji } = getPetVisual();
    const currentAccId = petData?.currentAccessory || 'none';
    const currentAccessory = ACCESSORIES.find(a => a.id === currentAccId);

    const containerClasses = cn(
      "relative bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-inner overflow-hidden border-2 border-white/50",
      size === 'sm' ? "w-10 h-10" : size === 'md' ? "w-14 h-14 md:w-16 md:h-16" : "w-20 h-20"
    );

    const assetSize = size === 'sm' ? "text-xl" : size === 'md' ? "text-3xl" : "text-5xl";

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
              "absolute pointer-events-none",
              currentAccessory.id.includes('hat') ? "top-[-10%] left-1/2 -translate-x-1/2 w-1/2 h-1/2" :
              currentAccessory.id.includes('glasses') ? "top-[20%] left-1/2 -translate-x-1/2 w-1/2 h-1/2" :
              currentAccessory.id.includes('crown') ? "top-[-20%] left-1/2 -translate-x-1/2 w-1/2 h-1/2" :
              "bottom-[10%] left-1/2 -translate-x-1/2 w-1/3 h-1/3"
            )}
            referrerPolicy="no-referrer"
          />
        )}
      </div>
    );
  };
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('gliko_chat_history');
    return saved ? JSON.parse(saved) : [
      {
        id: 'initial',
        role: 'model',
        text: !isKidMode ? 'Witaj, w czym mogę Ci pomóc w analizie Twojej glikemii?' : `Cześć! Jestem ${petData?.name || 'Gliko'}! 🐾 Bardzo się cieszę, że ze mną rozmawiasz. O czym dzisiaj pogadamy? Mogę Ci opowiedzieć o cukrzycy, albo po prostu dotrzymać towarzystwa! ✨`,
        timestamp: Date.now()
      }
    ];
  });
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const virtuosoRef = useRef<any>(null);

  useEffect(() => {
    localStorage.setItem('gliko_chat_history', JSON.stringify(messages));
  }, [messages]);

  const handleSend = async (overrideInput?: string) => {
    const messageText = overrideInput || input;
    if (!messageText.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: messageText.trim(),
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      // Prepare history for API (Gemini format)
      const history = messages.slice(-10).map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const response = await geminiService.getGlikoChatResponse(messageText, history, petData);
      
      let cleanResponse = response;
      const plateActionMatches = Array.from(response.matchAll(/<plate_action>([\s\S]*?)<\/plate_action>/g));
      
      for (const match of plateActionMatches) {
        try {
          const actionData = JSON.parse(match[1]);
          if (actionData.action === 'add' && actionData.item) {
             window.dispatchEvent(new CustomEvent('ai_plate_action', { detail: actionData }));
          }
        } catch (e) {
          console.error("GlikoChat Plate Action Error:", e);
        }
      }
      
      const appActionMatches = Array.from(response.matchAll(/<app_action>([\s\S]*?)<\/app_action>/g));
      for (const match of appActionMatches) {
        try {
          const actionData = JSON.parse(match[1]);
          window.dispatchEvent(new CustomEvent('ai_app_action', { detail: actionData }));
        } catch (e) {
          console.error("GlikoChat App Action Error:", e);
        }
      }
      
      if (plateActionMatches.length > 0) {
         cleanResponse = cleanResponse.replace(/<plate_action>[\s\S]*?<\/plate_action>/g, '').trim();
      }
      if (appActionMatches.length > 0) {
         cleanResponse = cleanResponse.replace(/<app_action>[\s\S]*?<\/app_action>/g, '').trim();
      }

      const modelMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: cleanResponse,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, modelMessage]);
      
      // Speak the response if voice is enabled
      speak(cleanResponse);
    } catch (error) {
      console.error("Chat Error:", error);
    } finally {
      setIsTyping(false);
    }
  };

  const clearChat = () => {
    if (window.confirm('Czy na pewno chcesz wyczyścić naszą rozmowę? 🐾')) {
      const initialMessage: Message = {
        id: 'initial-' + Date.now(),
        role: 'model',
        text: !isKidMode ? 'Wyczyściłem rozmowę. W czym mogę pomóc?' : `Cześć znowu! ✨ O czym chcesz teraz pogadać?`,
        timestamp: Date.now()
      };
      setMessages([initialMessage]);
    }
  };

  const suggestions = [
    "Co to jest insulina?",
    "Opowiedz mi żart!",
    "Jak dbać o poziom cukru?",
    "Pobawmy się!",
    "Dlaczego jestem zmęczony?"
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] landscape:h-[calc(100vh-80px)] md:h-[75vh] w-full max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl overflow-hidden border-4 border-indigo-100 dark:border-indigo-900/30">
      {/* Header */}
      <div className="p-3 landscape:py-2 md:p-6 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white flex items-center justify-between shadow-lg relative overflow-hidden shrink-0">
        {/* Animated bubbles in the background */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-pink-400/20 rounded-full -ml-10 -mb-10 blur-xl" />
        
        <div className="flex items-center gap-3 landscape:gap-2 relative z-10">
          <div className="landscape:hidden">{renderPetAvatar('md')}</div>
          <div className="hidden landscape:block">{renderPetAvatar('sm')}</div>
          <div>
            <h2 className="text-xl landscape:text-lg md:text-2xl font-black flex items-center gap-2">
              {(!isKidMode) ? 'Asystent Medyczny' : (petData?.name || 'Gliko')}
              <Sparkles size={16} className="text-yellow-300 animate-pulse" />
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={toggleVoice}
            className="p-3 hover:bg-white/20 rounded-2xl transition-all text-white/80 hover:text-white bg-white/10 border border-white/20 shadow-sm glass-target"
            title={voiceEnabled ? "Wycisz głos" : "Włącz głos"}
          >
            {voiceEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
          <button 
            onClick={clearChat}
            className="p-3 hover:bg-white/20 rounded-2xl transition-all text-white/80 hover:text-white bg-white/10 border border-white/20 shadow-sm glass-target"
            title="Wyczyść rozmowę"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <Virtuoso
        ref={virtuosoRef}
        className="flex-1 bg-slate-50/50 dark:bg-slate-900/50 scroll-smooth"
        data={messages}
        initialTopMostItemIndex={messages.length - 1}
        followOutput="smooth"
        itemContent={(index, message) => {
          const isLatest = index >= messages.length - 2;
          return (
            <div className="px-4 md:px-6 py-3">
              <motion.div
                key={`chat-${message.id}-${message.timestamp}`}
                initial={isLatest ? { opacity: 0, y: 30, scale: 0.9 } : false}
                animate={{ opacity: 1, y: 0, scale: 1 }}
              className={cn(
                "flex items-end gap-3",
                message.role === 'user' ? "flex-row-reverse" : "flex-row"
              )}
            >
              <div className={cn(
                "shrink-0 transform transition-transform hover:scale-110",
                message.role === 'user' ? "" : ""
              )}>
                {message.role === 'user' ? (
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-br-none shadow-lg">
                    <User size={20} />
                  </div>
                ) : (
                  renderPetAvatar('sm')
                )}
              </div>
              
              <div className={cn(
                "max-w-[85%] md:max-w-[75%] rounded-[2rem] px-5 py-4 shadow-md border-2",
                message.role === 'user' 
                  ? "bg-white dark:bg-indigo-900 text-slate-800 dark:text-white border-indigo-100 dark:border-indigo-800 rounded-tr-none" 
                  : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-purple-100 dark:border-slate-700 rounded-tl-none font-medium"
              )}>
                <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap">{message.text}</p>
                <div className={cn(
                  "flex items-center gap-2 mt-2",
                  message.role === 'user' ? "justify-end" : "justify-start"
                )}>
                  {message.role === 'model' && <Heart size={10} className="text-pink-500 fill-pink-500" />}
                  <span className="text-[9px] opacity-40 font-bold uppercase tracking-wider">
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        );
      }}
        components={{
          Footer: () => (
            isTyping ? (
              <div className="px-4 md:px-6 pb-6 pt-3">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-3 text-pink-500 ml-13"
                >
                  <div className="flex gap-1.5 p-3 bg-white dark:bg-slate-800 rounded-full shadow-sm">
                    <motion.span animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-1.5 h-1.5 bg-current rounded-full" />
                    <motion.span animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-1.5 h-1.5 bg-current rounded-full" />
                    <motion.span animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-1.5 h-1.5 bg-current rounded-full" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{!isKidMode ? 'Analizuję...' : (petData?.name || 'Gliko') + ' myśli...'}</span>
                </motion.div>
              </div>
            ) : <div className="h-6" />
          ),
          Header: () => <div className="h-6" />
        }}
      />

      {/* Input */}
      <div className="p-3 landscape:py-2 md:p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
        {/* Quick Suggestions container */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-2 landscape:pb-2 landscape:mb-0 no-scrollbar">
          {suggestions.map((s, i) => (
            <motion.button
              key={`typing-${i}`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setInput(s)}
              className="whitespace-nowrap px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl text-[10px] font-black uppercase tracking-wider hover:bg-white dark:hover:bg-indigo-500/20 transition-all border-2 border-indigo-100 dark:border-indigo-500/20 flex items-center gap-2 shrink-0 shadow-sm glass-target"
            >
              <Lightbulb size={12} className="text-yellow-500" /> {s}
            </motion.button>
          ))}
        </div>

        <div className="flex gap-3 landscape:gap-2">
          <div className="flex-1 relative group flex gap-2">
            <button
              onClick={toggleListening}
              className={cn(
                "w-14 h-14 landscape:w-10 landscape:h-10 rounded-2xl flex items-center justify-center transition-all shadow-md active:scale-95 group shrink-0",
                isListening 
                  ? "bg-rose-500 text-white animate-pulse" 
                  : "bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-indigo-500"
              )}
              title="Rozmowa głosowa"
            >
              {isListening ? <Mic size={24} className="landscape:w-5 landscape:h-5" /> : <Mic size={24} className="landscape:w-5 landscape:h-5" />}
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={isListening ? "Słucham Cię..." : "Zapytaj AI"}
              className={cn(
                "w-full bg-slate-100 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-400 rounded-[1.5rem] py-4 landscape:py-2 pl-6 pr-6 text-sm focus:ring-0 transition-all dark:text-white font-medium italic shadow-inner",
                isListening && "border-rose-400 placeholder-rose-400"
              )}
            />
          </div>
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isTyping}
            className={cn(
              "w-14 h-14 landscape:w-10 landscape:h-10 rounded-[1.25rem] flex items-center justify-center transition-all shadow-xl active:scale-95 group",
              input.trim() && !isTyping 
                ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white hover:shadow-indigo-500/40" 
                : "bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-700 cursor-not-allowed shadow-none"
            )}
          >
            <Send size={24} className={cn("transition-transform landscape:w-5 landscape:h-5", input.trim() && "group-hover:translate-x-1 group-hover:-translate-y-1")} />
          </button>
        </div>
        
        <div className="flex items-center justify-center gap-3 mt-4 landscape:hidden">
           <div className="h-px bg-slate-100 dark:bg-slate-800 flex-1" />
           <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] whitespace-nowrap">
              Zawsze słuchaj rodziców ✨
           </p>
           <div className="h-px bg-slate-100 dark:bg-slate-800 flex-1" />
        </div>
      </div>
    </div>
  );
}
