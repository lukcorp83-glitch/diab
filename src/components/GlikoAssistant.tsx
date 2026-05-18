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
  Cpu,
  Volume2,
  VolumeX,
  Lightbulb,
  Zap,
  Brain,
  History,
  TrendingDown,
  TrendingUp,
  Clock,
  ArrowRight,
  Mic,
  MicOff
} from 'lucide-react';
import GlikoSenseIcon from './GlikoSenseIcon';
import { geminiService } from '../services/gemini';
import { cn, calculateIOB, calculateCOB } from '../lib/utils';
import { LogEntry, UserSettings, AssistantMessage } from '../types';
import { toast } from 'react-hot-toast';

export default function GlikoAssistant({ 
  user, 
  logs, 
  settings,
  onAddToPlate,
  messages,
  setMessages,
  isTyping,
  onSend
}: { 
  user: any; 
  logs: LogEntry[]; 
  settings?: UserSettings;
  onAddToPlate?: (item: any) => void;
  messages: AssistantMessage[];
  setMessages: React.Dispatch<React.SetStateAction<AssistantMessage[]>>;
  isTyping: boolean;
  onSend: (text: string) => void;
}) {
  const isChild = settings?.childMode ?? true;
  const assistantName = "Asystent AI";

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'initial',
          role: 'model',
          text: isChild 
            ? `Cześć! Jestem Twoim Wirtualnym Asystentem Gliko. 🧠 Przeanalizowałem Twoje ostatnie dane i jestem gotowy pomóc. O co chcesz zapytać?`
            : `Witaj. Jestem Twoim Asystentem AI. Przeanalizowałem dostępne wpisy glikemii i posiłków. Jak mogę wspomóc Cię w optymalizacji terapii?`,
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
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const AssistantIcon = isChild ? Sparkles : Brain;

  useEffect(() => {
    localStorage.setItem('gliko_assistant_voice', JSON.stringify(voiceEnabled));
  }, [voiceEnabled]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    // Speak last message if it's from model and component was mounted recently
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role === 'model' && Date.now() - lastMsg.timestamp < 2000) {
      speak(lastMsg.text);
    }
  }, [messages]);

  // Speech Recognition Setup
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
    utterance.rate = 1.0;
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
    "Jak rano?",
    "Oblicz bolus",
    "Co na kolację?",
    "Czuję się źle",
    "Kiedy sport?"
  ] : [
    "Analiza TIR",
    "Korelacja posiłków",
    "Optymalizacja bazy",
    "Ryzyko hipo",
    "Podsumowanie 24h"
  ];

  return (
    <div className="flex flex-col h-[75vh] w-full max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
      {/* Header */}
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg",
            isChild ? "bg-indigo-500 shadow-indigo-500/20" : "bg-emerald-600 shadow-emerald-500/20"
          )}>
            <AssistantIcon size={24} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight leading-none">{assistantName}</h2>
            <div className="flex items-center gap-2 mt-1.5">
              <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isChild ? "bg-indigo-500" : "bg-emerald-400")} />
              <p className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest">
                AI Aktywne
              </p>
              <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
              <p className={cn("text-[9px] font-black uppercase tracking-widest", geminiService.getAiStatus().color)}>
                {geminiService.getAiStatus().label}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <button 
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={cn(
              "p-3 rounded-2xl transition-all border",
              voiceEnabled ? "bg-indigo-500 text-white border-indigo-400" : "bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700"
            )}
            title={voiceEnabled ? "Wycisz głos" : "Włącz głos"}
          >
            {voiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button 
            onClick={clearChat}
            className="p-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-2xl transition-all text-slate-400 hover:text-rose-500 border border-slate-200 dark:border-slate-700"
            title="Wyczyść historię"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-5 md:p-8 space-y-6 bg-white dark:bg-slate-950/20"
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
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 border border-slate-200 dark:border-slate-700">
                    <User size={18} />
                  </div>
                ) : (
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm",
                    isChild 
                      ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                      : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                  )}>
                    <AssistantIcon size={18} />
                  </div>
                )}
              </div>
              
              <div className={cn(
                "max-w-[85%] px-6 py-4 rounded-[2rem] shadow-sm",
                message.role === 'user' 
                  ? "bg-indigo-600 text-white rounded-tr-none shadow-indigo-500/10" 
                  : "bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-800 rounded-tl-none"
              )}>
                <div 
                  className="text-sm md:text-base leading-relaxed prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: message.text }}
                />
                <div className={cn(
                  "flex items-center gap-2 mt-4",
                  message.role === 'user' ? "justify-end" : "justify-start"
                )}>
                   {message.role === 'model' && <Sparkles size={10} className="text-amber-400 animate-pulse" />}
                   <p className="text-[9px] opacity-40 font-black uppercase tracking-widest">
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {isTyping && (
          <div className="flex gap-4">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center",
              isChild 
                ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
            )}>
              <AssistantIcon size={18} className="animate-spin-slow" />
            </div>
            <div className="flex gap-2 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 items-center">
              <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1 }} className={cn("w-1.5 h-1.5 rounded-full", isChild ? "bg-indigo-400" : "bg-emerald-400")} />
              <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className={cn("w-1.5 h-1.5 rounded-full", isChild ? "bg-indigo-400" : "bg-emerald-400")} />
              <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className={cn("w-1.5 h-1.5 rounded-full", isChild ? "bg-indigo-400" : "bg-emerald-400")} />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Analiza danych...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Section */}
      <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
          {suggestions.map((s, i) => (
            <button
              key={`suggestion-${i}`}
              onClick={() => handleSend(s)}
              className="whitespace-nowrap px-4 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-wider hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all border border-slate-200 dark:border-slate-700 flex items-center gap-2 shrink-0 shadow-sm"
            >
              <Lightbulb size={12} className="text-amber-500" /> {s}
            </button>
          ))}
        </div>

        <div className="flex gap-3 mt-2">
          <button
            onClick={toggleListening}
            className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center transition-all bg-slate-100 dark:bg-slate-800 shadow-lg active:scale-95 border-2 border-transparent shrink-0",
              isListening ? "border-rose-500 text-rose-500 animate-pulse" : "text-slate-400"
            )}
            title="Wybieranie głosowe"
          >
            <Mic size={24} />
          </button>
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={isListening ? "Słucham Cię..." : "Zapytaj AI"}
              className={cn(
                "w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 rounded-[1.5rem] py-4 px-6 text-sm transition-all dark:text-white shadow-inner outline-none",
                isListening && "border-rose-400"
              )}
            />
          </div>
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isTyping}
            className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-xl active:scale-95 shrink-0",
              input.trim() && !isTyping 
                ? "bg-indigo-600 text-white shadow-indigo-500/20" 
                : "bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600"
            )}
          >
            <Send size={24} />
          </button>
        </div>
        
        <div className="flex flex-col items-center justify-center gap-1 mt-4">
           <div className="flex items-center justify-center gap-4 w-full">
              <div className="h-px bg-slate-100 dark:bg-slate-800 flex-1" />
              <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] whitespace-nowrap">
                 System Wspomagania Decyzji • GlikoSense
              </p>
              <div className="h-px bg-slate-100 dark:bg-slate-800 flex-1" />
           </div>
           <p className="text-[9px] text-center text-rose-500/60 dark:text-rose-400/40 font-black uppercase tracking-widest mt-1">
             Asystent AI • Zawsze weryfikuj dawkowanie z lekarzem
           </p>
        </div>
      </div>
    </div>
  );
}
