import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  MessageSquare, 
  User, 
  Sparkles, 
  Trash2, 
  ChevronRight,
  Search,
  Activity,
  Settings as SettingsIcon,
  X,
  Workflow,
  Cpu
} from 'lucide-react';
import { geminiService } from '../services/gemini';
import { cn, calculateIOB, calculateCOB } from '../lib/utils';
import { LogEntry, UserSettings } from '../types';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export default function GlikoAssistant({ 
  user, 
  logs, 
  settings 
}: { 
  user: any; 
  logs: LogEntry[]; 
  settings?: UserSettings 
}) {
  const isChild = settings?.childMode ?? true;
  const assistantName = "Asystent AI";
  const AssistantIcon = isChild ? Sparkles : Cpu;

  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('gliko_assistant_history');
    return saved ? JSON.parse(saved) : [
      {
        id: 'initial',
        role: 'model',
        text: isChild 
          ? `Cześć! Jestem Twoim Wirtualnym Asystentem Gliko. 🧠 Przeanalizowałem Twoje ostatnie dane i jestem gotowy pomóc. O co chcesz zapytać? Mogę przeanalizować trendy, odpowiedzieć na pytania o dietę lub pomóc zrozumieć wyniki.`
          : `Witaj. Jestem Twoim Asystentem AI. Przeanalizowałem dostępne wpisy glikemii i posiłków. W czym mogę Ci dzisiaj pomóc w procesie optymalizacji leczenia? (Interpretacja bazalna, kalkulacja bolusów, raport trendów?)`,
        timestamp: Date.now()
      }
    ];
  });
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('gliko_assistant_history', JSON.stringify(messages));
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
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
      // Usuń powitalne wiadomości modelu, ponieważ Gemini API wymaga, aby pierwszym elementem tablicy components była rola 'user'
      const history = messages
        .filter(m => m.id !== 'initial' && !m.id.startsWith('initial-'))
        .slice(-10)
        .map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
        }));

      const iob = calculateIOB(logs);
      const cob = calculateCOB(logs);
      const lastGlucose = logs.filter(l => l.type === 'glucose').slice(-1)[0]?.value || 0;

      const response = await geminiService.getAssistantResponse(
        messageText, 
        history, 
        logs, 
        settings || { targetMin: 70, targetMax: 140 },
        { iob, cob, glucose: lastGlucose }
      );
      
      const modelMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, modelMessage]);
    } catch (error) {
      console.error("Assistant Error:", error);
    } finally {
      setIsTyping(false);
    }
  };

  const clearChat = () => {
    if (window.confirm('Wyczyścić historię rozmowy z asystentem?')) {
      setMessages([{
        id: 'initial-' + Date.now(),
        role: 'model',
        text: isChild ? `Cześć! W czym mogę Ci dzisiaj pomóc? 🧠` : `Jestem gotowy do dalszej analizy. O co chcesz zapytać?`,
        timestamp: Date.now()
      }]);
    }
  };

  const suggestions = isChild ? [
    "Jak minął mój ostatni dzień?",
    "Czy moje bolusy są skuteczne?",
    "Zinterpretuj moje ostatnie wyniki",
    "Co jeść na kolację przy niskim IG?",
    "Dlaczego mam skoki cukru rano?"
  ] : [
    "Analiza Time In Range (TIR)",
    "Korelacja posiłków z glikemią",
    "Optymalizacja bazy (ISF/WW)",
    "Identyfikacja hipoglikemii reaktywnej",
    "Podsumowanie 24h (eksperckie)"
  ];

  return (
    <div className="flex flex-col h-[75vh] w-full max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
      {/* Header */}
      <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center shadow-lg",
            isChild ? "bg-indigo-500 shadow-indigo-500/20" : "bg-emerald-600 shadow-emerald-500/20"
          )}>
            <AssistantIcon size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">{assistantName}</h2>
            <div className="flex items-center gap-1.5">
              <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isChild ? "bg-indigo-500" : "bg-emerald-400")} />
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">AI Aktywne • Tryb {isChild ? 'Edukacyjny' : 'Ekspercki'}</p>
            </div>
          </div>
        </div>
        <button 
          onClick={clearChat}
          className="p-2.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all text-slate-400 hover:text-rose-500"
          title="Wyczyść rozmowę"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-5 md:p-8 space-y-6 bg-white dark:bg-slate-950/20"
      >
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex gap-4",
                message.role === 'user' ? "flex-row-reverse" : "flex-row"
              )}
            >
              <div className="shrink-0 pt-1">
                {message.role === 'user' ? (
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                    <User size={16} />
                  </div>
                ) : (
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    isChild 
                      ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                      : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                  )}>
                    <AssistantIcon size={16} />
                  </div>
                )}
              </div>
              
              <div className={cn(
                "max-w-[85%] px-5 py-4 rounded-2xl shadow-sm",
                message.role === 'user' 
                  ? "bg-indigo-600 text-white rounded-tr-none" 
                  : "bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-800 rounded-tl-none"
              )}>
                <div 
                  className="text-sm md:text-base leading-relaxed prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: message.text }}
                />
                <p className={cn(
                  "text-[9px] mt-2 opacity-50 font-medium",
                  message.role === 'user' ? "text-right" : "text-left"
                )}>
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {isTyping && (
          <div className="flex gap-4">
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center",
              isChild 
                ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
            )}>
              <AssistantIcon size={16} className="animate-spin-slow" />
            </div>
            <div className="flex gap-1.5 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }} className={cn("w-1.5 h-1.5 rounded-full", isChild ? "bg-indigo-400" : "bg-emerald-400")} />
              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className={cn("w-1.5 h-1.5 rounded-full", isChild ? "bg-indigo-400" : "bg-emerald-400")} />
              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className={cn("w-1.5 h-1.5 rounded-full", isChild ? "bg-indigo-400" : "bg-emerald-400")} />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => handleSend(s)}
              className="whitespace-nowrap px-4 py-2 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-indigo-600 transition-all border border-slate-200 dark:border-slate-700 flex items-center gap-2 shrink-0 shadow-sm"
            >
              <AssistantIcon size={12} className={isChild ? "text-yellow-500" : "text-emerald-500"} /> {s}
            </button>
          ))}
        </div>

        <div className="flex gap-3 mt-1">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Zapytaj o swoje dane lub cukrzycę..."
            className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-2xl py-4 px-6 text-sm transition-all dark:text-white"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isTyping}
            className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-lg active:scale-95",
              input.trim() && !isTyping 
                ? "bg-indigo-600 text-white shadow-indigo-200 dark:shadow-indigo-900/20" 
                : "bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600"
            )}
          >
            <Send size={24} />
          </button>
        </div>
        
        <p className="text-[9px] text-center mt-4 text-slate-400 font-bold uppercase tracking-widest">
          Asystent AI • Zawsze weryfikuj dawkowanie z lekarzem
        </p>
      </div>
    </div>
  );
}
