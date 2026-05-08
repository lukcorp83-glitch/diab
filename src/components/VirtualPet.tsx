import { SKINS, PetSkin, ACCESSORIES, BACKGROUNDS, PetAccessory, PetBackground } from '../constants';
import { getEffectiveUid, cn, calculateIOB } from '../lib/utils';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Sparkles, AlertCircle, ShoppingBag, Store, X, Coins, Gamepad2, Target, Trophy, CheckCircle2, Utensils, Mountain, Book, HelpCircle, Activity, Flower2 } from 'lucide-react';
import { doc, onSnapshot, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { LogEntry } from '../types';
import GlikoDiary from './GlikoDiary';
import GlikoQuiz from './GlikoQuiz';
import GlikoGarden from './GlikoGarden';


export default function VirtualPet({ user, logs, glucose, setTab }: { user: any, logs: LogEntry[], glucose: number | null, setTab?: (t: string) => void }) {
  const [petData, setPetData] = useState<{ 
    type: string, 
    name: string, 
    level: number, 
    xp: number, 
    happiness: number, 
    lastFed: number,
    hunger?: number,
    coins?: number,
    skin?: string,
    unlockedSkins?: string[],
    currentAccessory?: string,
    unlockedAccessories?: string[],
    currentBackground?: string,
    unlockedBackgrounds?: string[],
    petCountToday?: number,
    lastPettedDate?: string,
    completedQuests?: string[],
    lastQuestReset?: string,
  } | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showQuests, setShowQuests] = useState(false);
  const [shopTab, setShopTab] = useState<'skins' | 'accessories' | 'backgrounds'>('skins');
  const [showGame, setShowGame] = useState(false);
  const [showDiary, setShowDiary] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [showGarden, setShowGarden] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState<any>(null);
  const [gameState, setGameState] = useState<'idle' | 'aiming' | 'result'>('idle');
  const [gamePower, setGamePower] = useState(0);
  const [gameResult, setGameResult] = useState({ coins: 0, text: '' });
  const gameDirectionRef = useRef(1);
  const gamePowerRef = useRef(0);
  const gameRequestRef = useRef<number | null>(null);
  
  const [reaction, setReaction] = useState<'idle' | 'happy' | 'eating' | 'sad'>('idle');
  const [idleVariant, setIdleVariant] = useState(0);
  const [particles, setParticles] = useState<{id: number, x: number}[]>([]);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [imageError, setImageError] = useState<string | null>(null);
  const [accError, setAccError] = useState<string | null>(null);
  const prevLogsRef = useRef(logs.length);

  useEffect(() => {
    setImageError(null);
    setAccError(null);
  }, [petData?.skin, petData?.level, petData?.currentAccessory, glucose]);

  const triggerParticles = () => {
    const newParticles = Array.from({ length: 3 }).map((_, i) => ({ id: Date.now() + i, x: Math.random() * 40 - 20 }));
    setParticles(prev => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(n => n.id === p.id)));
    }, 2000);
  };

  useEffect(() => {

    if (!user) return;
    const unsub = onSnapshot(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'pet', 'status'), (d) => {
      if (d.exists()) {
        setPetData(d.data() as any);
      } else {
        // Initialize pet
        setDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'pet', 'status'), {
          type: '🐾',
          name: 'Gliko',
          level: 1,
          xp: 0,
          happiness: 100,
          hunger: 100,
          lastFed: Date.now(),
          coins: 0,
          skin: 'default',
          unlockedSkins: ['default'],
          currentAccessory: 'none',
          unlockedAccessories: ['none'],
          currentBackground: 'room',
          unlockedBackgrounds: ['room'],
          petCountToday: 0,
          lastPettedDate: new Date().toISOString().split('T')[0]
        });
      }
    });
    return unsub;
  }, [user]);

  const dailyQuests = useMemo(() => [
    { id: 'pet_3_times', title: `Przyjaciel ${petData?.name || 'Gliko'}`, desc: `Pogłaszcz ${petData?.name || 'Gliko'} 3 razy dzisiaj`, goal: 3, rewardXp: 50, rewardCoins: 10 },
    { id: 'log_3_times', title: 'Dziennikarz', desc: 'Zapisz 3 dowolne wpisy (posiłek, cukier itp.)', goal: 3, rewardXp: 100, rewardCoins: 25 },
    { id: 'check_sugar', title: 'Cukrowy Mistrz', desc: 'Sprawdź cukier rano (5:00 - 10:00)', goal: 1, rewardXp: 150, rewardCoins: 50 },
  ], [petData?.name]);

  const getQuestProgress = (questId: string) => {
    if (!petData) return 0;
    if (questId === 'pet_3_times') return petData.petCountToday || 0;
    if (questId === 'log_3_times') {
      const today = new Date().setHours(0,0,0,0);
      return logs.filter(l => l.timestamp >= today).length;
    }
    if (questId === 'check_sugar') {
      const today = new Date().setHours(0,0,0,0);
      const morningGlucose = logs.filter(l => {
        const d = new Date(l.timestamp);
        const h = d.getHours();
        return l.type === 'glucose' && l.timestamp >= today && h >= 5 && h <= 10;
      });
      return morningGlucose.length > 0 ? 1 : 0;
    }
    return 0;
  };

  const handleClaimQuest = async (questId: string) => {
    if (!user || !petData) return;
    const quest = dailyQuests.find(q => q.id === questId);
    const progress = getQuestProgress(questId);
    
    if (quest && progress >= quest.goal && !(petData.completedQuests || []).includes(questId)) {
      const xpReq = petData.level * 100;
      let newXp = (petData.xp || 0) + quest.rewardXp;
      let newLevel = petData.level;
      
      if (newXp >= xpReq) {
        newLevel++;
        newXp -= xpReq;
      }

      await updateDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'pet', 'status'), {
        xp: newXp,
        level: newLevel,
        coins: (petData.coins || 0) + quest.rewardCoins,
        completedQuests: [...(petData.completedQuests || []), questId],
        happiness: Math.min(100, (petData.happiness || 0) + 15)
      });
      triggerParticles();
      setReaction('happy');
      setTimeout(() => setReaction('idle'), 2000);
    }
  };

  const handleClaimQuestRewards = async (rewardCoins: number, rewardXp: number) => {
    if (!user || !petData) return;
    const xpReq = petData.level * 100;
    let newXp = (petData.xp || 0) + rewardXp;
    let newLevel = petData.level;
    
    if (newXp >= xpReq) {
      newLevel++;
      newXp -= xpReq;
    }

    await updateDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'pet', 'status'), {
      xp: newXp,
      level: newLevel,
      coins: (petData.coins || 0) + rewardCoins,
      happiness: Math.min(100, (petData.happiness || 0) + 15)
    });
    triggerParticles();
    setReaction('happy');
    setShowQuiz(false);
    setTimeout(() => setReaction('idle'), 2000);
  };

  const getReactionEmoji = () => {
    if (glucose !== null) {
      if (glucose < 70) return '😨'; // Przestraszony/Niska glikemia
      if (glucose > 250) return '😴'; // Senny/Wysoka glikemia
    }
    if ((reaction as string) === 'happy') return '😊';
    if ((reaction as string) === 'eating') return '😋';
    if ((reaction as string) === 'playing') return '🎮';
    return '😃';
  };

  // Reset daily quests
  useEffect(() => {
    if (!user || !petData) return;
    const today = new Date().toISOString().split('T')[0];
    if (petData.lastQuestReset !== today) {
      updateDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'pet', 'status'), {
        completedQuests: [],
        lastQuestReset: today
      });
    }
  }, [user, petData?.lastQuestReset]);

  // Handle TIR reward for backgrounds
  useEffect(() => {
    if (!user || !logs.length || !petData) return;
    
    const checkRewards = async () => {
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const recentLogs = logs.filter(l => l.type === 'glucose' && new Date(l.timestamp).getTime() > thirtyDaysAgo);
      
      if (recentLogs.length >= 20) { // Minimum readings for monthly TIR record
        const inRange = recentLogs.filter(l => l.value >= 70 && l.value <= 140).length;
        const tir = (inRange / recentLogs.length) * 100;
        
        const unlocked = petData.unlockedBackgrounds || ['room'];
        const rewardsToUnlock = BACKGROUNDS.filter(bg => 
          bg.rewardTir && 
          tir >= bg.rewardTir && 
          !unlocked.includes(bg.id)
        );
        
        if (rewardsToUnlock.length > 0) {
          await updateDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'pet', 'status'), {
            unlockedBackgrounds: [...unlocked, ...rewardsToUnlock.map(r => r.id)]
          });
          alert(`Gratulacje! Odblokowano nowe tło: ${rewardsToUnlock[0].name} za świetny TIR (${Math.round(tir)}%)!`);
        }
      }
    };
    
    checkRewards();
  }, [logs.length, user, petData?.unlockedBackgrounds]);

  // Auto XP when user logs data
  useEffect(() => {
    if (!user) return;
    if (logs.length > prevLogsRef.current) {
       const rewardUser = async () => {
         try {
           const docRef = doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'pet', 'status');
           const snap = await getDoc(docRef);
           if (snap.exists()) {
             const data = snap.data();
             const currentXp = data.xp || 0;
             const currentLevel = data.level || 1;
             const currentHappiness = data.happiness || 50;
             const xpReq = currentLevel * 100;
             
             let newXp = currentXp + 25;
             let newLevel = currentLevel;
             if (newXp >= xpReq) {
                 newLevel++;
                 newXp = newXp - xpReq;
             }
             
             await updateDoc(docRef, {
                 xp: newXp,
                 level: newLevel,
                 happiness: Math.min(100, currentHappiness + 15),
                 coins: (data.coins || 0) + 15 // Bonus coins for logging
             });
           }
         } catch(e) {
           console.error("Error auto-updating pet:", e);
         }
       };
       rewardUser();
    }
    prevLogsRef.current = logs.length;
  }, [logs.length, user]);

  useEffect(() => {
    return () => {
      if (gameRequestRef.current) cancelAnimationFrame(gameRequestRef.current);
    }
  }, []);

  const glucoseStatusText = useMemo(() => {
    if (glucose === null || !petData) return null;
    if (glucose < 70) return `${petData.name} potrzebuje soku! 🧃`;
    if (glucose > 250) return `${petData.name} jest senny przez wysoki cukier... 💧`;
    return null;
  }, [glucose, petData]);

  const currentIOB = useMemo(() => {
    // Basic IOB calculation for visuals
    const bolusLogs = logs.filter(l => l.type === 'bolus');
    const result = calculateIOB(bolusLogs, 3);
    return typeof result === 'number' ? result : (result as any).iob || 0;
  }, [logs]);

  if (!petData) return null;

  const xpRequired = petData.level * 100;
  const progress = (petData.xp / xpRequired) * 100;
  const todayStr = new Date().toISOString().split('T')[0];
  const petCount = petData.lastPettedDate === todayStr ? (petData.petCountToday || 0) : 0;
  const maxPets = 5;
  const isMaxPetted = petCount >= maxPets;

  const handlePet = async () => {
     if (!user) return;
     if (isMaxPetted) return;

     setReaction('happy');
     triggerParticles();
     setTimeout(() => setReaction('idle'), 1500);

     const newXp = petData.xp + 15;
     let newLevel = petData.level;
     let nextXp = newXp;
     if (newXp >= xpRequired) {
        newLevel++;
        nextXp = newXp - xpRequired;
     }

     await updateDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'pet', 'status'), {
       happiness: Math.min(100, petData.happiness + 20),
       xp: nextXp,
       level: newLevel,
       coins: (petData.coins || 0) + 2,
       petCountToday: petCount + 1,
       lastPettedDate: todayStr
     });
  };

  const handleFeed = async () => {
    if (!user || !petData) return;
    const foodCost = 15;
    if ((petData.coins || 0) < foodCost) {
      alert('Nie masz wystarczająco monet na jedzenie! (Potrzeba 15)');
      return;
    }

    setReaction('eating');
    triggerParticles();
    setTimeout(() => setReaction('idle'), 2000);

    const newXp = petData.xp + 40;
    let newLevel = petData.level;
    let nextXp = newXp;
    if (newXp >= xpRequired) {
       newLevel++;
       nextXp = newXp - xpRequired;
    }

    await updateDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'pet', 'status'), {
      coins: (petData.coins || 0) - foodCost,
      happiness: Math.min(100, petData.happiness + 40),
      hunger: Math.min(100, (petData.hunger || 0) + 50),
      xp: nextXp,
      level: newLevel,
      lastFed: Date.now()
    });
  };

  const updatePetName = async () => {
    if (!tempName.trim()) return;
    await updateDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'pet', 'status'), {
      name: tempName.trim()
    });
    setIsEditingName(false);
  };

  const getPetVisual = (skinId?: string, accessoryId?: string) => {
    let src = '';
    let emoji = '';
    
    // First, check glucose overrides if no specific skin requested
    if (glucose !== null && !skinId) {
      if (glucose < 70) {
        src = 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Cold%20Face.png';
        emoji = '🥶';
      } else if (glucose > 180) {
        src = 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Hot%20Face.png';
        emoji = '🥵';
      }
    }
    
    // Then check skin
    if (!src) {
        const targetSkin = skinId || petData.skin || 'default';
        if (targetSkin !== 'default') {
            const foundSkin = SKINS.find(s => s.id === targetSkin);
            if (foundSkin) {
               emoji = foundSkin.icon;
               if (foundSkin.imageUrl) {
                 src = foundSkin.imageUrl;
               } else if (targetSkin === 'robot') src = 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Robot.png';
               else if (targetSkin === 'alien') src = 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Alien.png';
               else if (targetSkin === 'ghost') src = 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Ghost.png';
               else if (targetSkin === 'ninja') src = 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/People/Ninja.png';
            }
        }
    }

    // Default to level based forms
    if (!src) {
        const lvl = petData.level;
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

    const currentAccId = accessoryId || petData.currentAccessory || 'none';
    const accessory = ACCESSORIES.find(a => a.id === currentAccId);

    if (src && imageError !== src) {
      return (
        <div className="relative aspect-square w-full max-w-full flex items-center justify-center p-1 mx-auto">
          <img 
            src={src} 
            alt="pet" 
            className="w-full h-full object-contain drop-shadow-xl relative z-10" 
            referrerPolicy="no-referrer"
            onError={() => setImageError(src)}
          />
          {accessory && accessory.imageUrl && accError !== accessory.imageUrl ? (
             <img 
               src={accessory.imageUrl} 
               alt="accessory" 
               className={`absolute z-20 w-1/2 h-1/2 object-contain pointer-events-none drop-shadow-md ${
                 accessory.id.includes('hat') ? 'top-[-10%] left-1/2 -translate-x-1/2' : 
                 accessory.id.includes('glasses') ? 'top-[25%] left-1/2 -translate-x-1/2 scale-110' :
                 accessory.id.includes('crown') ? 'top-[-18%] left-1/2 -translate-x-1/2 scale-125' :
                 accessory.id.includes('ribbon') ? 'top-[5%] right-[5%]' :
                 'bottom-[5%] left-1/2 -translate-x-1/2'
               }`}
               referrerPolicy="no-referrer"
               onError={() => setAccError(accessory.imageUrl)}
             />
          ) : (
            accessory && accessory.icon && accessory.id !== 'none' && (
              <span className={`absolute z-20 pointer-events-none ${
                accessory.id.includes('hat') ? 'top-[-10%] left-1/2 -translate-x-1/2 text-2xl' : 
                accessory.id.includes('glasses') ? 'top-[25%] left-1/2 -translate-x-1/2 text-xl' :
                accessory.id.includes('crown') ? 'top-[-20%] left-1/2 -translate-x-1/2 text-3xl' :
                accessory.id.includes('ribbon') ? 'top-[0%] right-[0%] text-xl' :
                'bottom-[5%] left-1/2 -translate-x-1/2 text-xl'
              }`}>
                {accessory.icon}
              </span>
            )
          )}
        </div>
      );
    }

    return (
      <div className="relative aspect-square w-full max-w-full flex items-center justify-center p-1 mx-auto font-emoji text-3xl drop-shadow-lg">
        {emoji || '🐾'}
        {accessory && accessory.icon && accessory.id !== 'none' && (
          <span className={`absolute pointer-events-none ${
             accessory.id.includes('hat') ? 'top-[-10%] left-1/2 -translate-x-1/2 text-2xl' : 
             accessory.id.includes('glasses') ? 'top-[20%] left-1/2 -translate-x-1/2 text-xl' :
             accessory.id.includes('crown') ? 'top-[-20%] left-1/2 -translate-x-1/2 text-3xl' :
             accessory.id.includes('ribbon') ? 'top-[0%] right-[0%] text-xl' :
             'bottom-[0%] left-1/2 -translate-x-1/2 text-xl'
          }`}>
            {accessory.icon}
          </span>
        )}
      </div>
    );
  };

  const getPetMessage = () => {
    if (glucose !== null) {
      if (glucose < 70) {
        const texts = [
          'Brrr, zamarzam! Potrzebuję węgla ratunkowego! 🥶',
          'Słuchaj, cukier nam spada! Czas na małą przekąskę? 🍎',
          'Oj, coś słabo się czuję. Ratujmy sytuację węglami! 📉',
          'Hipo alarm! Gdzie jest soczek?! 🧃',
        ];
        return texts[Math.floor(Math.random() * texts.length)];
      }
      if (glucose > 180) {
        const texts = [
          'Uff, ale gorąco! Ten cukier mnie obciąża... 🥵',
          'Wysoko latamy! Czas na korektę, bo zaraz pęknę! 🚀',
          'Czuję się jak balon wypełniony syropem. Zbijmy to! 🎈',
          'Piękny cukier, szkoda że nie w normie! Czas na bolus? 💉',
        ];
        return texts[Math.floor(Math.random() * texts.length)];
      }
    }
    if (petData.happiness < 30) {
      const texts = [
        'Smutno mi bez Ciebie... Pogłaszcz mnie! 🥺',
        'Zostałem sam... Pamiętasz o moich głaskach? ❤️',
        'Czuję się zaniedbany. Pobawisz się ze mną? 🏠',
      ];
      return texts[Math.floor(Math.random() * texts.length)];
    }
    if (petData.happiness < 60) {
      const texts = [
        'Pobawimy się? Brakuje mi trochę atencji! 🎾',
        'Jest okej, ale mogłoby być weselej! 🙂',
        'Co tam u Ciebie? Mnie trochę nudno. 💤',
      ];
      return texts[Math.floor(Math.random() * texts.length)];
    }
    
    const texts = [
      'Czuję się dzisiaj absolutnie fantastycznie! ✨',
      'Mamy świetny dzień! Tak trzymać! 😊',
      'Jestem pełen energii! Razem damy radę! 💪',
      'Wyglądasz dzisiaj super! Ja też się tak czuję! 😎',
      'TIR w normie? Ja mam nastrój na 100%! 📈',
    ];
    return texts[Math.floor(Math.random() * texts.length)];
  };

  const getPetAnimation = (): any => {
    if (reaction === 'eating') return {
        scale: [1, 1.2, 1, 1.2, 1],
        rotateZ: [0, 5, -5, 5, 0],
        transition: { duration: 0.5, repeat: 3 }
    };
    if (reaction === 'happy') return { 
        y: [0, -20, 0], 
        rotateZ: [0, -15, 15, -15, 15, 0], 
        scale: [1, 1.25, 1], 
        transition: { duration: 0.6, ease: "easeOut" } 
    };
    
    if (glucose !== null) {
      if (glucose < 70) return { 
          x: [-4, 4, -4, 4, 0], 
          rotateZ: [-2, 2, -2, 2, 0], 
          transition: { repeat: Infinity, duration: 0.3, ease: "linear" } 
      }; // Trzęsie się z zimna (hipo)
      if (glucose > 180) return { 
          y: [0, 6, 0], 
          scale: [1, 1.05, 1], 
          transition: { repeat: Infinity, duration: 2.5, ease: "easeInOut" } 
      }; // Czuć ciężko (hiper)
    }
    
    // Zwykłe stany (dodajemy więcej "oddechu" i obrotów 3D)
    if (petData.happiness < 30) return { 
        y: [0, 3, 0], 
        rotateZ: [-2, 2, -2], 
        scale: [1, 0.95, 1],
        transition: { repeat: Infinity, duration: 3, ease: "easeInOut" } 
    };
    if (petData.happiness > 80) return { 
        y: [0, -10, 0], 
        scale: [1, 1.15, 1], 
        rotateZ: [-8, 8, -8], 
        transition: { repeat: Infinity, duration: 1.2, ease: "easeInOut" } 
    };
    
    // Domyślny idle animation - warianty o bardzo różnym charakterze
    const variants = [
      // 1. Spokojne oddychanie ("Calm breathing")
      { y: [0, -4, 0], scale: [1, 1.05, 1], rotateZ: [-2, 2, -2], transition: { repeat: Infinity, duration: 3, ease: "easeInOut" } },
      
      // 2. Rozglądanie się (Efekt pseudo-3D "Looking around")
      { x: [0, -8, 0, 8, 0], rotateY: [0, -20, 0, 20, 0], transition: { repeat: Infinity, duration: 4, ease: "easeInOut" } },
      
      // 3. Radosne podskoki ("Bouncy")
      { y: [0, -12, 0, -6, 0], rotateZ: [0, -8, 8, -4, 0], scale: [1, 1.1, 0.95, 1.05, 1], transition: { repeat: Infinity, duration: 2, ease: "easeOut" } },
      
      // 4. Latanie w "nieważkości" ("Zero-G floating")
      { y: [0, -15, -5, -12, 0], x: [0, 8, -6, 4, 0], rotateZ: [-5, 6, -3, 4, -5], transition: { repeat: Infinity, duration: 6, ease: "easeInOut" } }
    ];
    
    return variants[idleVariant] || variants[0];
  };

  const handleBuySkin = async (skin: PetSkin) => {
     if (!user || (petData.unlockedSkins || []).includes(skin.id)) return;
     if (skin.unlockedBy) {
        alert("Ta skórka jest specjalna! Odblokuj ją zdobywając osiągnięcia w zakładce Profil.");
        return;
     }
     if ((petData.coins || 0) < skin.price) return;
     
     const unlocked = petData.unlockedSkins || ['default'];
     await updateDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'pet', 'status'), {
        coins: (petData.coins || 0) - skin.price,
        unlockedSkins: [...unlocked, skin.id],
        skin: skin.id
     });
  };

  const handleEquipSkin = async (skinId: string) => {
     if (!user) return;
     await updateDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'pet', 'status'), {
        skin: skinId
     });
  };

  const handleBuyAccessory = async (acc: PetAccessory) => {
    if (!user || (petData.unlockedAccessories || []).includes(acc.id)) return;
    if ((petData.coins || 0) < acc.price) return;
    
    const unlocked = petData.unlockedAccessories || ['none'];
    await updateDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'pet', 'status'), {
       coins: (petData.coins || 0) - acc.price,
       unlockedAccessories: [...unlocked, acc.id],
       currentAccessory: acc.id
    });
  };

  const handleEquipAccessory = async (accId: string) => {
    if (!user) return;
    await updateDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'pet', 'status'), {
       currentAccessory: accId
    });
  };

  const handleBuyBackground = async (bg: PetBackground) => {
    if (!user || (petData.unlockedBackgrounds || []).includes(bg.id)) return;
    if (bg.rewardTir) {
      alert(`To tło jest specjalne! Utrzymaj TIR powyżej ${bg.rewardTir}% przez dłuższy czas, aby je otrzymać.`);
      return;
    }
    if ((petData.coins || 0) < bg.price) return;
    
    const unlocked = petData.unlockedBackgrounds || ['room'];
    await updateDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'pet', 'status'), {
       coins: (petData.coins || 0) - bg.price,
       unlockedBackgrounds: [...unlocked, bg.id],
       currentBackground: bg.id
    });
  };

  const handleEquipBackground = async (bgId: string) => {
    if (!user) return;
    await updateDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'pet', 'status'), {
       currentBackground: bgId
    });
  };

  const currentBg = BACKGROUNDS.find(b => b.id === (petData?.currentBackground || 'room')) || BACKGROUNDS[0];
  
  const energyLevel = Math.max(0, Math.min(100, (1 - currentIOB / 10) * 100)); // Just a visual scale

  const startMiniGame = () => {
    setShowGame(true);
    setGameState('aiming');
    setGamePower(0);
    setGameResult({ coins: 0, text: '' });
    gamePowerRef.current = 0;
    gameDirectionRef.current = 1;
    
    const animate = () => {
      gamePowerRef.current += gameDirectionRef.current * 2;
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

  const throwBall = async () => {
    if (gameState !== 'aiming' || !user) return;
    if (gameRequestRef.current) cancelAnimationFrame(gameRequestRef.current);
    
    setGameState('result');
    const finalPower = gamePowerRef.current;
    let earnedCoins = 1;
    let msg = 'Pudło! +1 moneta';
    
    if (finalPower >= 75 && finalPower <= 85) {
      earnedCoins = 10;
      msg = 'W dziesiątkę! +10 monet';
      setReaction('happy');
      triggerParticles();
    } else if (finalPower >= 60 && finalPower <= 100) {
      earnedCoins = 5;
      msg = 'Świetny rzut! +5 monet';
      setReaction('happy');
    }
    
    setGameResult({ coins: earnedCoins, text: msg });
    
    try {
      await updateDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'pet', 'status'), {
         coins: (petData.coins || 0) + earnedCoins,
         happiness: Math.min(100, petData.happiness + 5)
      });
    } catch(e) {
      console.error('Error saving game result', e);
    }
    
    setTimeout(() => {
        setReaction('idle');
    }, 2000);
  };

  return (
    <div className="fixed bottom-24 left-6 z-40">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, x: -20, y: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: -20, y: 20 }}
            className="absolute bottom-16 left-0 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 w-[280px] overflow-hidden"
          >
            {showGame ? (
              <div className="p-4">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                   <h4 className="font-black text-sm flex items-center gap-2 dark:text-white"><Gamepad2 size={16} className="text-indigo-500" /> Rzut Plecakiem</h4>
                   <div className="flex items-center gap-3">
                     <span className="text-xs font-bold text-amber-500 flex items-center gap-1 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full"><Coins size={12} /> {petData.coins || 0}</span>
                     <button onClick={() => setShowGame(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={16} /></button>
                   </div>
                </div>
                
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 flex flex-col items-center justify-center min-h-[160px] relative overflow-hidden border border-slate-100 dark:border-slate-800">
                   {gameState === 'idle' && (
                     <div className="text-center">
                       <Gamepad2 size={32} className="mx-auto text-indigo-400 mb-2 opacity-50" />
                       <p className="text-xs text-slate-500 mb-3 font-medium">Rzuć piłką w odpowiednim momencie by zdobyć monety!</p>
                       <button onClick={startMiniGame} className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-md shadow-indigo-500/20">ZAGRAJ</button>
                     </div>
                   )}
                   
                   {(gameState === 'aiming' || gameState === 'result') && (
                     <div className="w-full flex flex-col items-center">
                       <div className="w-full h-4 bg-slate-200 dark:bg-slate-700 rounded-full relative mb-4 overflow-hidden shadow-inner">
                         {/* Zielona strefa (75-85) */}
                         <div className="absolute top-0 bottom-0 left-[75%] w-[10%] bg-emerald-400"></div>
                         {/* Żółta strefa (60-75 i 85-100) */}
                         <div className="absolute top-0 bottom-0 left-[60%] w-[15%] bg-amber-400"></div>
                         <div className="absolute top-0 bottom-0 left-[85%] w-[15%] bg-amber-400"></div>
                         
                         {/* Wskaźnik */}
                         <div 
                           className="absolute top-0 bottom-0 w-1.5 bg-slate-800 dark:bg-white rounded-full shadow-sm"
                           style={{ left: `${gamePower}%`, transform: 'translateX(-50%)' }}
                         ></div>
                       </div>
                       
                       {gameState === 'aiming' ? (
                          <button onClick={throwBall} className="w-full bg-indigo-500 focus:bg-indigo-600 text-white font-bold text-sm px-4 py-3 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 outline-none"><Target size={16} /> RZUĆ!</button>
                       ) : (
                          <div className="w-full text-center py-2 animate-in fade-in slide-in-from-bottom-2">
                             <div className="flex justify-center mb-1">
                                {gameResult.coins === 10 ? <Trophy size={24} className="text-amber-500" /> : <Coins size={24} className="text-amber-500" />}
                             </div>
                             <p className="font-black text-sm dark:text-white">{gameResult.text}</p>
                             <button onClick={() => setGameState('idle')} className="mt-3 text-[10px] text-slate-500 font-bold hover:text-slate-800 dark:hover:text-white uppercase tracking-wider">Zagraj ponownie</button>
                          </div>
                       )}
                     </div>
                   )}
                </div>
              </div>
            ) : showQuests ? (
               <div className="p-4">
                 <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <h4 className="font-black text-sm flex items-center gap-2 dark:text-white"><Trophy size={16} className="text-emerald-500" /> Misje Dnia</h4>
                    <button onClick={() => setShowQuests(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={16} /></button>
                 </div>
                 
                 <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 no-scrollbar pb-2">
                    {dailyQuests.map(quest => {
                      const progress = getQuestProgress(quest.id);
                      const isCompleted = (petData.completedQuests || []).includes(quest.id);
                      const canClaim = progress >= quest.goal && !isCompleted;
                      
                      return (
                        <div key={quest.id} className={cn("p-3 rounded-2xl border transition-all", isCompleted ? 'bg-emerald-50 dark:bg-emerald-500/5 border-emerald-500/20 opacity-60' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800')}>
                           <div className="flex justify-between items-start mb-2">
                             <div className="pr-2">
                               <h5 className="text-[11px] font-black dark:text-white leading-tight">{quest.title}</h5>
                               <p className="text-[9px] text-slate-500 font-medium">{quest.desc}</p>
                             </div>
                             <div className="text-right shrink-0">
                               <div className="flex items-center gap-1 text-[9px] font-black text-amber-500"><Coins size={10} /> +{quest.rewardCoins}</div>
                               <div className="flex items-center gap-1 text-[9px] font-black text-accent-500"><Sparkles size={10} /> +{quest.rewardXp}</div>
                             </div>
                           </div>
                           
                           <div className="space-y-1">
                             <div className="flex justify-between text-[8px] font-bold text-slate-400 lowercase">
                               <span>Postęp</span>
                               <span>{progress} / {quest.goal}</span>
                             </div>
                             <div className="h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                               <motion.div 
                                 initial={{ width: 0 }}
                                 animate={{ width: `${Math.min(100, (progress/quest.goal)*100)}%` }}
                                 className="h-full bg-emerald-500" 
                               />
                             </div>
                           </div>
                           
                           {canClaim && (
                             <button 
                               onClick={() => handleClaimQuest(quest.id)}
                               className="w-full mt-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[10px] py-1.5 rounded-xl shadow-lg shadow-emerald-500/20 uppercase tracking-widest active:scale-95 transition-all"
                             >
                               Odbierz
                             </button>
                           )}
                           
                           {isCompleted && <div className="text-emerald-500 text-center mt-2 flex justify-center"><CheckCircle2 size={16} /></div>}
                        </div>
                      );
                    })}
                 </div>
               </div>
            ) : showGarden ? (
              <div className="p-4">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h4 className="font-black text-sm flex items-center gap-2 dark:text-white"><Flower2 size={16} className="text-emerald-500" /> Twój Ogród</h4>
                  <button onClick={() => setShowGarden(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={16} /></button>
                </div>
                <div className="max-h-[400px] overflow-y-auto no-scrollbar">
                  <GlikoGarden logs={logs} />
                </div>
              </div>
            ) : showDiary ? (
              <div className="p-4">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h4 className="font-black text-sm flex items-center gap-2 dark:text-white"><Book size={16} className="text-indigo-500" /> Dziennik {petData.name}</h4>
                  <button onClick={() => setShowDiary(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={16} /></button>
                </div>
                <div className="max-h-[350px] overflow-y-auto pr-1 no-scrollbar">
                  <GlikoDiary logs={logs} petName={petData.name} />
                </div>
              </div>
            ) : showQuiz ? (
              <div className="p-4">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h4 className="font-black text-sm flex items-center gap-2 dark:text-white"><HelpCircle size={16} className="text-amber-500" /> Quiz Edu</h4>
                  <button onClick={() => setShowQuiz(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={16} /></button>
                </div>
                <div className="max-h-[400px] overflow-y-auto no-scrollbar">
                  <GlikoQuiz onComplete={handleClaimQuestRewards} />
                </div>
              </div>
            ) : showShop ? (
              <div className="p-4">
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                   <h4 className="font-black text-sm flex items-center gap-2 dark:text-white"><Store size={16} className="text-accent-500" /> Sklepik</h4>
                   <div className="flex items-center gap-3">
                     <span className="text-xs font-bold text-amber-500 flex items-center gap-1 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full"><Coins size={12} /> {petData.coins || 0}</span>
                     <button onClick={() => setShowShop(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={16} /></button>
                   </div>
                </div>

                <div className="flex gap-1 mb-3 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                  <button 
                    onClick={() => setShopTab('skins')}
                    className={`flex-1 text-[9px] font-black py-1.5 rounded-md transition-all ${shopTab === 'skins' ? 'bg-white dark:bg-slate-700 text-accent-500 shadow-sm' : 'text-slate-500'}`}
                  >
                    SKÓRKI
                  </button>
                  <button 
                    onClick={() => setShopTab('accessories')}
                    className={`flex-1 text-[9px] font-black py-1.5 rounded-md transition-all ${shopTab === 'accessories' ? 'bg-white dark:bg-slate-700 text-accent-500 shadow-sm' : 'text-slate-500'}`}
                  >
                    DODATKI
                  </button>
                  <button 
                    onClick={() => setShopTab('backgrounds')}
                    className={`flex-1 text-[9px] font-black py-1.5 rounded-md transition-all ${shopTab === 'backgrounds' ? 'bg-white dark:bg-slate-700 text-accent-500 shadow-sm' : 'text-slate-500'}`}
                  >
                    TŁA
                  </button>
                </div>
                
                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1 pb-2 custom-scrollbar">
                    {shopTab === 'skins' && SKINS.map(skin => {
                      const isUnlocked = (petData.unlockedSkins || ['default']).includes(skin.id);
                      const isEquipped = (petData.skin || 'default') === skin.id;
                      const canAfford = (petData.coins || 0) >= skin.price;
                      const isAchievementSkin = !!skin.unlockedBy;

                      return (
                        <div key={skin.id} className={`flex items-center justify-between p-2 rounded-xl border ${isEquipped ? 'border-accent-500 bg-accent-50 dark:bg-accent-500/5' : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50'}`}>
                          <div className="flex items-center gap-2">
                             <div className="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
                               {skin.imageUrl ? (
                                  <img 
                                    src={skin.imageUrl} 
                                    alt={skin.name} 
                                    className="w-6 h-6 object-contain" 
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                      const p = (e.target as HTMLElement).parentElement;
                                      if (p && !p.querySelector('.fallback-icon')) {
                                        const s = document.createElement('span');
                                        s.className = 'text-xl fallback-icon';
                                        s.innerText = skin.icon;
                                        p.appendChild(s);
                                      }
                                    }}
                                  />
                                ) : (
                                  <span className="text-xl">{skin.icon}</span>
                                )}
                             </div>
                             <div>
                                <p className="text-[10px] font-black dark:text-white capitalize">{skin.name}</p>
                                {!isUnlocked && (
                                  isAchievementSkin 
                                    ? <span className="text-[9px] font-bold text-accent-500 flex items-center gap-1"><Trophy size={10} /> Specjalna</span>
                                    : <span className="text-[9px] font-semibold text-amber-500 flex items-center gap-1"><Coins size={10} /> {skin.price}</span>
                                )}
                             </div>
                          </div>
                          <div>
                             {isEquipped ? (
                                <span className="text-[8px] font-black text-white bg-accent-500 px-2 py-1 rounded-full">UZYWASZ</span>
                             ) : isUnlocked ? (
                                <button onClick={() => handleEquipSkin(skin.id)} className="text-[8px] font-black text-slate-100 bg-slate-900 dark:bg-slate-100 dark:text-slate-900 px-2 py-1 rounded-full shadow-sm hover:scale-105 active:scale-95 transition-all">WYBIERZ</button>
                             ) : (
                                <button 
                                  disabled={!canAfford || isAchievementSkin} 
                                  onClick={() => handleBuySkin(skin)} 
                                  className={`text-[8px] font-black px-2 py-1 rounded-full shadow-sm transition-all ${
                                    canAfford && !isAchievementSkin 
                                      ? 'bg-amber-400 text-amber-950 hover:scale-105' 
                                      : 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed'
                                  }`}
                                >
                                  KUP
                                </button>
                             )}
                          </div>
                        </div>
                      );
                    })}

                    {shopTab === 'accessories' && ACCESSORIES.map(acc => {
                      const isUnlocked = (petData.unlockedAccessories || ['none']).includes(acc.id);
                      const isEquipped = (petData.currentAccessory || 'none') === acc.id;
                      const canAfford = (petData.coins || 0) >= acc.price;

                      return (
                        <div key={acc.id} className={`flex items-center justify-between p-2 rounded-xl border ${isEquipped ? 'border-accent-500 bg-accent-50 dark:bg-accent-500/5' : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50'}`}>
                          <div className="flex items-center gap-2">
                             <div className="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
                               {acc.imageUrl ? (
                                  <img 
                                    src={acc.imageUrl} 
                                    alt={acc.name} 
                                    className="w-6 h-6 object-contain" 
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                      const p = (e.target as HTMLElement).parentElement;
                                      if (p && !p.querySelector('.fallback-icon')) {
                                        const s = document.createElement('span');
                                        s.className = 'text-xl fallback-icon';
                                        s.innerText = acc.icon;
                                        p.appendChild(s);
                                      }
                                    }}
                                  />
                                ) : (
                                  <span className="text-xl">{acc.icon}</span>
                                )}
                             </div>
                             <div>
                                <p className="text-[10px] font-black dark:text-white capitalize">{acc.name}</p>
                                {!isUnlocked && <span className="text-[9px] font-semibold text-amber-500 flex items-center gap-1"><Coins size={10} /> {acc.price}</span>}
                             </div>
                          </div>
                          <div>
                             {isEquipped ? (
                                <span className="text-[8px] font-black text-white bg-accent-500 px-2 py-1 rounded-full">NOSISZ</span>
                             ) : isUnlocked ? (
                                <button onClick={() => handleEquipAccessory(acc.id)} className="text-[8px] font-black text-slate-100 bg-slate-900 dark:bg-slate-100 dark:text-slate-900 px-2 py-1 rounded-full shadow-sm hover:scale-105 active:scale-95 transition-all">ZAŁÓŻ</button>
                             ) : (
                                <button 
                                  disabled={!canAfford} 
                                  onClick={() => handleBuyAccessory(acc)} 
                                  className={`text-[8px] font-black px-2 py-1 rounded-full shadow-sm transition-all ${
                                    canAfford 
                                      ? 'bg-amber-400 text-amber-950 hover:scale-105' 
                                      : 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed'
                                  }`}
                                >
                                  KUP
                                </button>
                             )}
                          </div>
                        </div>
                      );
                    })}

                    {shopTab === 'backgrounds' && BACKGROUNDS.map(bg => {
                      const isUnlocked = (petData.unlockedBackgrounds || ['room']).includes(bg.id);
                      const isEquipped = (petData.currentBackground || 'room') === bg.id;
                      const canAfford = (petData.coins || 0) >= bg.price;
                      const isReward = !!bg.rewardTir;

                      return (
                        <div key={bg.id} className={`flex items-center justify-between p-2 rounded-xl border ${isEquipped ? 'border-accent-500 bg-accent-50 dark:bg-accent-500/5' : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50'}`}>
                          <div className="flex items-center gap-2">
                             <div className={`w-10 h-10 flex items-center justify-center bg-gradient-to-br ${bg.gradient} rounded-lg shadow-sm border border-slate-100 dark:border-slate-700`}>
                                <span className="text-xl">{bg.icon}</span>
                             </div>
                             <div>
                                <p className="text-[10px] font-black dark:text-white capitalize">{bg.name}</p>
                                {!isUnlocked && (
                                  isReward 
                                    ? <span className="text-[9px] font-bold text-accent-500 flex items-center gap-1"><Trophy size={10} /> TBR {bg.rewardTir}%</span>
                                    : <span className="text-[9px] font-semibold text-amber-500 flex items-center gap-1"><Coins size={10} /> {bg.price}</span>
                                )}
                             </div>
                          </div>
                          <div>
                             {isEquipped ? (
                                <span className="text-[8px] font-black text-white bg-accent-500 px-2 py-1 rounded-full">USTAWIONE</span>
                             ) : isUnlocked ? (
                                <button onClick={() => handleEquipBackground(bg.id)} className="text-[8px] font-black text-slate-100 bg-slate-900 dark:bg-slate-100 dark:text-slate-900 px-2 py-1 rounded-full shadow-sm hover:scale-105 active:scale-95 transition-all">USTAW</button>
                             ) : (
                                <button 
                                  disabled={!canAfford || isReward} 
                                  onClick={() => handleBuyBackground(bg)} 
                                  className={`text-[8px] font-black px-2 py-1 rounded-full shadow-sm transition-all ${
                                    canAfford && !isReward
                                      ? 'bg-amber-400 text-amber-950 hover:scale-105' 
                                      : 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed'
                                  }`}
                                >
                                  {isReward ? 'CEL' : 'KUP'}
                                </button>
                             )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ) : (
              <div className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-1">
                      {isEditingName ? (
                        <div className="flex items-center gap-1">
                          <input 
                            value={tempName}
                            onChange={(e) => setTempName(e.target.value)}
                            className="bg-slate-50 dark:bg-slate-800 border-b-2 border-accent-500 font-black text-sm outline-none px-1 w-24 dark:text-white"
                            autoFocus
                          />
                          <button onClick={updatePetName} className="text-emerald-500 hover:scale-110 transition-transform"><CheckCircle2 size={16} /></button>
                          <button onClick={() => setIsEditingName(false)} className="text-rose-500 hover:scale-110 transition-transform"><X size={16} /></button>
                        </div>
                      ) : (
                        <h4 
                          className="font-black text-sm dark:text-white flex items-center gap-1 cursor-pointer hover:text-accent-500 transition-colors" 
                          onClick={() => { setTempName(petData.name); setIsEditingName(true); }}
                        >
                          {petData.name} <span className="text-[10px] opacity-30 group-hover:opacity-100">✎</span> <span className="text-xs font-bold text-accent-500 bg-accent-50 dark:bg-accent-500/10 px-1.5 py-0.5 rounded-md">Lvl {petData.level}</span>
                        </h4>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest font-black">Twój przyjaciel</p>
                  </div>
                </div>

                {/* Energy Bar (IOB) */}
                <div className="mt-1 mb-4 space-y-1">
                  <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-slate-400">
                    <span className="flex items-center gap-1"><Activity size={8} className="text-amber-500" /> Energia {petData.name} (IOB)</span>
                    <span>{energyLevel.toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${energyLevel}%` }}
                      className={cn("h-full transition-colors", energyLevel < 30 ? "bg-rose-500" : energyLevel < 70 ? "bg-amber-500" : "bg-emerald-500")}
                    />
                  </div>
                </div>

                {glucoseStatusText && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mb-4 text-[9px] font-black text-rose-500 italic bg-rose-50 dark:bg-rose-500/10 px-2.5 py-1.5 rounded-xl border border-rose-100 dark:border-rose-500/20 flex items-center gap-2"
                  >
                    <AlertCircle size={10} /> {glucoseStatusText}
                  </motion.div>
                )}

                <div className="flex justify-center mb-6 relative">
                  <div className="absolute inset-0 bg-accent-500/5 blur-3xl rounded-full scale-150"></div>
                  <motion.div
                    animate={reaction !== 'idle' ? { scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] } : {}}
                    className="relative z-10 select-none flex flex-col items-center gap-2 cursor-pointer"
                    onClick={handlePet}
                  >
                    <div className="text-5xl">{getReactionEmoji()}</div>
                    <div className="scale-125 origin-bottom">
                      {getPetVisual()}
                    </div>
                  </motion.div>
                </div>

                <div className={`p-2.5 rounded-xl mb-4 border border-slate-100 dark:border-slate-800 relative bg-gradient-to-br ${currentBg.gradient} shadow-inner`}>
                  <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_70%)] pointer-events-none"></div>
                  {currentBg.id === 'space' && <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 pointer-events-none"></div>}
                  <div className="absolute -left-1 top-3 w-0 h-0 border-t-[6px] border-t-transparent border-r-[6px] border-r-white/20 border-b-[6px] border-b-transparent"></div>
                  <p className="text-[11px] font-bold text-slate-700 dark:text-white drop-shadow-sm italic flex items-center justify-between relative z-10">
                    <span>"{getPetMessage()}"</span>
                    <span className="flex items-center gap-1 text-amber-500 font-bold bg-white/80 dark:bg-slate-900/80 px-1.5 py-0.5 rounded backdrop-blur-sm shadow-sm border border-white/20"><Coins size={10} /> {petData.coins || 0}</span>
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-[9px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                      <span>Doświadczenie</span>
                      <span>{petData.xp} / {xpRequired} XP</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-[9px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                      <span>Humor</span>
                      <span className="flex items-center gap-0.5"><Heart size={8} className={petData.happiness > 30 ? "text-rose-500" : "text-slate-400"} fill="currentColor" /> {petData.happiness}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${petData.happiness > 30 ? 'bg-rose-400' : 'bg-slate-400'}`} style={{ width: `${petData.happiness}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[9px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                      <span>Nasycenie</span>
                      <span className="flex items-center gap-0.5"><Utensils size={8} className="text-amber-600" /> {petData.hunger || 0}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${petData.hunger || 0}%` }} />
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-2 overflow-x-auto no-scrollbar">
                  <button 
                    onClick={handleFeed}
                    className="flex-1 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-[10px] py-2.5 px-3 rounded-xl flex items-center justify-center gap-1 active:scale-95 transition-all whitespace-nowrap"
                  >
                    <Utensils size={12} /> Jedzenie (15)
                  </button>
                  <button 
                    onClick={handlePet}
                    disabled={isMaxPetted}
                    className={`flex-1 font-bold text-[10px] py-2.5 px-3 rounded-xl flex items-center justify-center gap-1 transition-all whitespace-nowrap ${isMaxPetted ? 'bg-slate-100 text-slate-400 dark:bg-slate-800/50 dark:text-slate-500 cursor-not-allowed opacity-60' : 'bg-accent-50 dark:bg-accent-500/10 text-accent-600 dark:text-accent-400 active:scale-95 hover:bg-accent-100 dark:hover:bg-accent-500/20'}`}
                    title={isMaxPetted ? "Limit głaskania osiągnięty" : "Pogłaszcz zwierzaka"}
                  >
                    <Sparkles size={12} className={isMaxPetted ? "" : "animate-pulse"} /> 
                    {isMaxPetted ? 'Limit głaskania' : `Głaskanie (${petCount}/${maxPets})`}
                  </button>
                   <button 
                    onClick={() => { 
                      if (setTab) {
                        setTab('games');
                        setIsOpen(false);
                      } else {
                        setShowShop(false); 
                        setShowGame(true); 
                        setGameState('idle'); 
                      }
                    }}
                    className="flex-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-[10px] py-2.5 px-3 rounded-xl flex items-center justify-center gap-1 active:scale-95 transition-all whitespace-nowrap"
                  >
                    <Gamepad2 size={12} /> Gry
                  </button>
                  <button 
                    onClick={() => { setShowShop(true); setShowQuests(false); setShowGame(false); }}
                    className="flex-1 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-[10px] py-2.5 rounded-xl flex items-center justify-center gap-1 active:scale-95 transition-all"
                  >
                    <ShoppingBag size={12} /> Sklep
                  </button>
                  <button 
                    onClick={() => { setShowQuests(true); setShowShop(false); setShowGame(false); setShowDiary(false); setShowQuiz(false); }}
                    className="flex-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] py-2.5 rounded-xl flex items-center justify-center gap-1 active:scale-95 transition-all"
                  >
                    <Trophy size={12} /> Misje
                  </button>
                </div>
                
                <div className="flex gap-2 mb-2">
                  <button 
                    onClick={() => { setShowDiary(true); setShowShop(false); setShowQuests(false); setShowGame(false); setShowQuiz(false); }}
                    className="flex-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-[10px] py-2.5 rounded-xl flex items-center justify-center gap-1 active:scale-95 transition-all"
                  >
                    <Book size={12} /> Dziennik
                  </button>
                  <button 
                    onClick={() => { setShowQuiz(true); setShowShop(false); setShowQuests(false); setShowGame(false); setShowDiary(false); setShowGarden(false); }}
                    className="flex-1 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-[10px] py-2.5 rounded-xl flex items-center justify-center gap-1 active:scale-95 transition-all"
                  >
                    <HelpCircle size={12} /> Quiz
                  </button>
                  <button 
                    onClick={() => { setShowGarden(true); setShowShop(false); setShowQuests(false); setShowGame(false); setShowDiary(false); setShowQuiz(false); }}
                    className="flex-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] py-2.5 rounded-xl flex items-center justify-center gap-1 active:scale-95 transition-all"
                  >
                    <Flower2 size={12} /> Ogród
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {particles.map(p => (
           <motion.div
             key={p.id}
             initial={{ opacity: 1, y: 0, x: p.x, scale: 0.5 }}
             animate={{ opacity: 0, y: -60, x: p.x + (Math.random() * 20 - 10), scale: 1.5 }}
             exit={{ opacity: 0 }}
             transition={{ duration: 1.2, ease: "easeOut" }}
             className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none z-50 text-rose-500"
           >
             <Heart size={16} fill="currentColor" />
           </motion.div>
        ))}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`w-16 h-16 ${isOpen ? 'bg-slate-100 dark:bg-slate-700 scale-95 border-emerald-400 dark:border-emerald-500' : 'bg-gradient-to-br from-white to-accent-100 dark:from-slate-700 dark:to-slate-900 border-accent-200 dark:border-slate-600 shadow-[inset_0_-4px_8px_rgba(0,0,0,0.1),_0_8px_30px_rgba(0,0,0,0.15)] dark:shadow-[inset_0_-4px_8px_rgba(0,0,0,0.3),_0_8px_30px_rgba(0,0,0,0.4)]'} rounded-full border-4 flex flex-col items-center justify-center relative z-10 transition-colors duration-300 overflow-hidden`}
        onClick={() => {
           if (!isOpen) setIdleVariant(Math.floor(Math.random() * 4));
           setIsOpen(!isOpen);
           if (isOpen) {
             setShowShop(false);
             setShowGame(false);
             if (gameRequestRef.current) cancelAnimationFrame(gameRequestRef.current);
           }
        }}
      >
        {/* Adds a glossy highlight to the icon background to make it look like a 3D bubble */}
        <div className="absolute top-0 right-1 w-6 h-4 bg-white/40 dark:bg-white/10 rounded-full blur-[2px] rotate-[30deg]"></div>
        <motion.div 
           className="text-3xl drop-shadow-sm origin-bottom"
           animate={getPetAnimation()}
        >
          {getPetVisual()}
        </motion.div>
        {petData.happiness < 50 && (
           <span className="absolute -top-1 -right-1 bg-rose-500 rounded-full w-4 h-4 flex items-center justify-center text-[8px] text-white font-bold border-2 border-white dark:border-slate-800">!</span>
        )}
        {glucose !== null && (glucose > 180 || glucose < 70) && (
           <span className="absolute -bottom-1 -left-1 bg-amber-500 rounded-full w-5 h-5 flex items-center justify-center text-white border-2 border-white dark:border-slate-800"><AlertCircle size={10} /></span>
        )}
      </motion.button>
    </div>
  );
}
