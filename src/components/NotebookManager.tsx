import { toast } from "react-hot-toast";
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Book, X, Plus, Trash, Clock, Save, Bell } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc, deleteDoc, doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getEffectiveUid } from '../lib/utils';
import { cn } from '../lib/utils';

interface Note {
  id: string;
  content: string;
  reminderDate: string; // ISO string 
  createdAt?: number;
}

export default function NotebookManager({ user }: { user: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'notes'|'compendium'>('notes');
  const [notes, setNotes] = useState<Note[]>([]);
  const [newContent, setNewContent] = useState('');
  const [newReminder, setNewReminder] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (!user) return;
    const uid = getEffectiveUid(user);
    const q = collection(db, 'artifacts', 'diacontrolapp', 'users', uid, 'notebook');
    const unsub = onSnapshot(q, (snapshot) => {
      const arr: Note[] = [];
      snapshot.forEach(d => {
        arr.push({ id: d.id, ...d.data() } as Note);
      });
      arr.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setNotes(arr);
    });
    return () => unsub();
  }, [user]);

  // Check reminders (very basic checker)
  useEffect(() => {
    const interval = setInterval(() => {
      if (notes.length === 0) return;
      const now = new Date();
      notes.forEach(n => {
        if (n.reminderDate) {
          const d = new Date(n.reminderDate);
          if (now.getTime() >= d.getTime()) { 
             // we could use the notificationService here or browser alert
             if (Notification.permission === 'granted') {
               new Notification('GlikoControl Przypomnienie', { body: n.content });
             } else {
               toast(`Przypomnienie: ${n.content}`);
             }
             // Optional: remove reminder after showing
             if (user) {
                const uid = getEffectiveUid(user);
                updateDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', uid, 'notebook', n.id), { reminderDate: '' });
             }
          }
        }
      });
    }, 60000);
    return () => clearInterval(interval);
  }, [notes, user]);

  useEffect(() => {
    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }, []);

  const addNote = async () => {
    if (!newContent.trim() || !user) return;
    setIsAdding(true);
    try {
      const uid = getEffectiveUid(user);
      await addDoc(collection(db, 'artifacts', 'diacontrolapp', 'users', uid, 'notebook'), {
        content: newContent.trim(),
        reminderDate: newReminder,
        createdAt: Date.now()
      });
      setNewContent('');
      setNewReminder('');
      setIsAdding(false);
    } catch (e) {
      console.error(e);
      setIsAdding(false);
    }
  };

  const deleteNote = async (id: string) => {
    if (!user) return;
    try {
      const uid = getEffectiveUid(user);
      await deleteDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', uid, 'notebook', id));
    } catch (e) {
      console.error(e);
    }
  };

  const compendium = [
    {
      title: 'Cele Glikemiczne (rekomendacje PTD)',
      content: 'Dla większości pacjentów z cukrzycą:\n- Na czczo i przed posiłkiem: 70–110 mg/dL.\n- 2 godziny po posiłku: < 140 mg/dL.\n- Czas w zakresie docelowym (TIR 70-180 mg/dL): min. 70% czasu.\n- HbA1c (hemoglobina glikowana): ≤ 7% (w wybranych grupach i u kobiet w ciąży normy są bardziej restrykcyjne).',
    },
    {
      title: 'Hipoglikemia (Niedocukrzenie)',
      content: 'Poziom cukru < 70 mg/dL (dla pacjentów zdrowych normy są głębsze, dla diabetyków to granica alarmowa).\nObjawy: poty, drżenie rąk, przyspieszone bicie serca, zmieszanie, ogromny głód.\nLeczenie (Reguła 15/15): Zjedz/wypij 15g węglowodanów prostych (np. pół szklanki soku, 3 tabletki glukozy). Odczekaj 15 minut i zmierz cukier. Powtórz jeśli nadal < 70 mg/dL.',
    },
    {
      title: 'Hiperglikemia i Kwasica Ketonowa',
      content: 'Hiperglikemia to przedłużający się wysoki poziom cukru (np. >200 mg/dL). Jeśli cukier przekracza 250 mg/dL i towarzyszą temu objawy (bóle brzucha, mdłości, suchość w ustach, ciągłe oddawanie moczu), ZBADAJ KETONY z krwi lub moczu.\nBrak insuliny powoduje spalanie tłuszczu i uwalnianie ciał ketonowych. Kwasica ketonowa to stan zagrażający życiu wymagający szybkiego nawodnienia i podania insuliny.',
    },
    {
      title: 'Hemoglobina Glikowana (HbA1c)',
      content: 'Wskaźnik odzwierciedlający średnie stężenie glukozy we krwi z ostatnich ok. 3 miesięcy. Wynik podawany jest w %. \nDocelowo u większości młodych dorosłych to poniżej 7%, a w cukrzycy typu 1 często dąży się do <6.5%. \nHbA1c koreluje z ryzykiem wystąpienia przewlekłych powikłań cukrzycowych.',
    },
    {
      title: 'Węglowodany i WBT',
      content: '1 g węglowodanów przyswajalnych podnosi cukier szybko. W celach obliczeniowych często stosuje się Wymienniki Węglowodanowe (WW): 1 WW = 10g węglowodanów.\n1 Wymiennik Białkowo-Tłuszczowy (WBT) = 100 kcal pochodzących z białek i tłuszczów. Przyswaja się dłużej (do kilku godzin), dlatego w przypadku tłustych i bogatych w białko posiłków (np. pizza) stosuje się bolusy przedłużone/złożone na pompie.',
    },
    {
      title: 'Indeks (IG) i Ładunek (ŁG) Glikemiczny',
      content: 'Indeks Glikemiczny (IG) mówi o tym, jak SZYBKO dany produkt podnosi cukier we krwi (0-100). Niski IG < 55, Wysoki > 70.\nŁadunek Glikemiczny (ŁG) uwzględnia dodatkowo wielkość porcji, dając lepszy obraz wpływu posiłku na glikemię. Unikaj potraw o wysokim IG i ŁG na pusty żołądek.',
    },
    {
      title: 'Czas wyczekiwania na posiłek (Pre-bolus)',
      content: 'W cukrzycy typu 1 podanie insuliny szybkodziałającej wymaga odczekania ("pre-bolus") zanim zacznie działać, by zgrać szczyt działania insuliny ze wchłanianiem z jelit.\nDla IG wysokiego: 15-20 min. Dla IG średniego: 10-15 min. Dla niskiego IG lu posiłków białkowo-tłuszczowych: od razu przed lub po posiłku (w zależności od startowego poziomu cukru).',
    },
    {
      title: 'Zasada działania insuliny bazowej i bolusów',
      content: 'Baza: Insulina ciągła, odpowiadająca za pokrycie uwalniania glukozy przez wątrobę między posiłkami i w nocy (w pompie podawana w mikrodawkach ułamkowych co kilka minut, z pena jako zastrzyk długodziałający).\nBolus posiłkowy (na jedzenie): pokrywa węglowodany i ew. WBT z posiłku.\nBolus korekcyjny: dawka insuliny obniżająca "zły", zbyt wysoki cukier do poziomu docelowego.',
    },
    {
      title: 'Aktywność fizyczna',
      content: 'Wysiłek tlenowy (aerobowy: np. bieg, rower) spala cukier i zazwyczaj silnie obniża glikemię. Wymaga zabezpieczenia węglowodanami przed lub zmniejszenia insuliny bazowej.\nWysiłek beztlenowy (anaerobowy: sprinterski, siłowy) powoduje wyrzut adrenaliny i może powodować nagły wzrost glikemii u niektórych osób, a nagłe spadki długo po wysiłku.',
    },
    {
      title: 'Wpływ stresu, upału i infekcji',
      content: 'Infekcja (przeziębienie, gorączka) niemal zawsze zwiększa zapotrzebowanie na insulinę (insulinooporność chorobowa) o 20-50% ze względu na walkę układu immunologicznego.\nStres: wyrzut kortyzolu powoduje oporność na insulinę, dając tzw. "cukry stresowe".\nUpały i gorące kąpiele: poprawiają ukrwienie skóry, co przyspiesza wchłanianie i działanie insuliny (ryzyko hipoglikemii).',
    },
    {
      title: 'Zasady rotacji miejsc wkłucia',
      content: 'Insulinę podaje się do tkanki podskórnej. Regularna rotacja miejsc wkłuć (brzuch, uda, pośladki, ramiona) zapobiega powstawaniu zrostów i lipohipertrofii.\nWstrzykiwanie w zrosty powoduje że insulina gorzej i bardzo powoli się wchłania, co jest częstą przyczyną "skakania" i niewyjaśnionych wahań cukru.',
    },
    {
      title: 'Efekt Brzasku i Zjawisko Somogyi',
      content: 'Efekt brzasku: Naturalny, uwarunkowany hormonalnie (hormon wzrostu, kortyzol) wzrost glikemii we wczesnych godzinach porannych (zwykle 3:00 - 8:00), bez uprzedniego niedocukrzenia.\nZjawisko Somogyi (zjawisko z odbicia): Poranna hiperglikemia będąca reakcją obronną organizmu na niewykryte, głębokie niedocukrzenie wymuszające wyrzut hormonów stresu w nocy. Wymaga obniżenia bazy nocnej, w przeciwieństwie do efektu brzasku, który wymaga jej zwiększenia.',
    },
    {
      title: 'Glukagon (Zastrzyk Ratunkowy / Donosowy)',
      content: 'Hormon przeciwstawny do insuliny. Stosowany w ciężkiej hipoglikemii, gdy pacjent jest nieprzytomny, ma drgawki lub nie może połykać. Uwalnia zmagazynowaną w wątrobie glukozę (glikogen). \nJak użyć: Postępuj zgodnie z instrukcją (zastrzyk domięśniowy lub proszek do nosa typu Baqsimi). Po wybudzeniu i poprawie stanu (gdy może połykać), zjedz węglowodany złożone, aby uzupełnić rezerwy wątroby (ryzyko nawrotu hipoglikemii).',
    },
    {
      title: 'Alkohol a Cukrzyca',
      content: 'Alkohol (szczególnie wysokoprocentowy) blokuje uwalnianie glukozy przez wątrobę, co GWAŁTOWNIE ZWIĘKSZA RYZYKO CIĘŻKIEJ HIPOGLIKEMII. Ten efekt może trwać nawet do kilkunastu godzin po spożyciu.\nNigdy nie pij alkoholu na pusty żołądek. Przed pójściem spać upewnij się, że zjadłeś dodatkową porcję węglowodanów złożonych, by zapobiec spadkowi nocnemu. Ważne: glukagon może nie zadziałać podczas upojenia alkoholowego, gdyż wątroba jest zajęta metabolizowaniem alkoholu.',
    },
    {
      title: 'Wpływ hormonów płciowych a glikemia',
      content: 'Kobiety w 2. fazie cyklu (np. 1-2 tygodnie przed okresem) zmagają się z wysokim progesteronem, który wywołuje insulinooporność. Zapotrzebowanie na insulinę może wzrosnąć nawet o 20-30%.\nW 1. i 2. dniu cyklu zapotrzebowanie drastycznie i gwałtownie spada – rośnie duże ryzyko hipoglikemii!',
    },
    {
      title: 'Tłuszcze, Białka i "Efekt Pizzy"',
      content: 'Tłuszcze i białka opóźniają opróżnianie żołądka, co spowalnia wchłanianie węglowodanów. Posilki z ich dużą ilością (pizza, fast-food) powodują, że glukoza uwalnia się do krwi nawet do 8 godzin po zjedzeniu. Wymaga to najczęściej zastosowania bolusa przedłużonego lub złożonego krok po kroku.',
    },
    {
      title: 'Błonnik pokarmowy',
      content: 'Błonnik (włókno pokarmowe) nie ulega trawieniu i wchłanianiu w przewodzie pokarmowym. Spożywanie produktów bogatych w błonnik (warzywa, pieczywo pełnoziarniste, płatki owsiane) znacznie obniża całkowity Ładunek Glikemiczny posiłku i zapobiega gwałtownym skokom cukru po jedzeniu.',
    },
    {
      title: 'Przechowywanie insuliny',
      content: 'Zapas insuliny ZAWSZE przechowujemy w lodówce (2-8°C). Nie wolno jej zamrażać! \nRozpoczętego pena (wstrzykiwacz) z insuliną lub fiolkę używaną do pompy nosimy w temperaturze pokojowej (do 25-30°C) i musimy zużyć zazwyczaj w ciągu 28 dni (lub 4 tygodni). Insulina wystawiona na mróz lub upał traci swoje właściwości i staje się woda.',
    },
    {
      title: 'Systemy CGM (Ciągły Monitoring Glikemii)',
      content: 'Sensory (np. Dexcom, Freestyle Libre) mierzą cukier w płynie śródmiąższowym (nie we krwi). Dlatego występuje opóźnienie rzędu 5-15 minut w stosunku do pomiaru z palca z glukometru. Strzałki trendu mówią nie tylko jaki masz cukier teraz, ale jaki będziesz miał za 15-30 minut.',
    },
    {
      title: 'Profile działania insulin analogowych',
      content: 'Analogi szybkodziałające (np. Novorapid, Humalog, Fiasp, Lyumjev): dają początek działania po ok. 5-15 min, szczyt działania osiągają w 1-2h i działają całkowicie do 3-4 godzin.\nAnalogi długodziałające (np. Lantus, Levemir, Tresiba, Toujeo): działają od kilkunastu godzin aż do 42h na bardzo płaskim (bezszczytowym) poziomie, stanowiąc bazę wstrzykiwaną z penów raz lub dwa razy na dobę.',
    },
    {
      title: 'Zasady podczas podróży z Cukrzycą',
      content: 'Do samolotu: insulinę i osprzęt ratujący życie ZAWSZE bierzemy do bagażu podręcznego (w luku bagażowym insulina by zamarzła). Warto mieć przy sobie pisemne zaświadczenie o chorobie (po polsku i angielsku). Gdy przekraczamy kilka stref czasowych, dawkę bazy z penów trzeba odpowiednio skrócić lub nakładać, a pożywienie dopasować do rytmu sen-czuwanie.',
    }
  ];

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="relative p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-blue-400 border border-transparent dark:border-slate-700 transition-all hover:scale-105 active:scale-95"
      >
        <Book size={18} />
        {notes.some(n => !!n.reminderDate) && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full border-2 border-slate-100 dark:border-slate-800"></span>
        )}
      </button>

      {isOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white dark:bg-slate-950 sm:p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full h-full sm:h-[90vh] sm:max-w-md bg-white dark:bg-slate-900 sm:rounded-3xl shadow-2xl relative z-10 sm:border border-slate-200 dark:border-slate-800 flex flex-col pt-safe pb-safe"
          >
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/50">
              <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2 text-lg">
                <Book className="text-blue-500" size={20} /> Mój Notatnik
              </h3>
              <button onClick={() => setIsOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-white dark:bg-slate-800 shadow-sm rounded-full transition-colors active:scale-90">
                <X size={20} />
              </button>
            </div>

            <div className="flex bg-slate-100 dark:bg-slate-950 p-1">
              <button 
                onClick={() => setActiveTab('notes')}
                className={cn(
                  "flex-1 py-3 text-xs font-bold rounded-xl transition-all text-center",
                  activeTab === 'notes' ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                Notatki
              </button>
              <button 
                onClick={() => setActiveTab('compendium')}
                className={cn(
                  "flex-1 py-3 text-xs font-bold rounded-xl transition-all text-center",
                  activeTab === 'compendium' ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                Kompendium
              </button>
            </div>

            {activeTab === 'notes' ? (
              <>
                <div className="p-4 space-y-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0">
                  <div>
                    <textarea 
                      placeholder="Nowa notatka lub wpis..."
                      value={newContent}
                      onChange={e => setNewContent(e.target.value)}
                      className="w-full p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm font-medium dark:text-white resize-none min-h-[100px] shadow-sm transition-all"
                    />
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                        <Clock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="datetime-local"
                          value={newReminder}
                          onChange={e => setNewReminder(e.target.value)}
                          className="w-full pl-11 p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-blue-500 text-sm font-bold text-slate-600 dark:text-slate-300 shadow-sm transition-all"
                        />
                    </div>
                    <button 
                      onClick={addNote}
                      disabled={isAdding || !newContent.trim()}
                      className="bg-blue-600 text-white px-6 rounded-xl font-bold flex items-center justify-center disabled:opacity-50 transition-all active:scale-95 shadow-md shadow-blue-500/20"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-900/50">
                  {notes.length === 0 ? (
                    <div className="text-center p-8 mt-10 text-slate-400 flex flex-col items-center">
                      <Book size={48} className="mb-4 text-slate-200 dark:text-slate-800" />
                      <p className="text-sm font-black text-slate-500 dark:text-slate-400">Brak notatek</p>
                      <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mt-1">Tutaj zapiszesz ważne uwagi.</p>
                    </div>
                  ) : (
                    notes.map(note => (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={note.id} className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm relative group">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 whitespace-pre-wrap pr-8 leading-relaxed">{note.content}</p>
                        
                        {note.reminderDate && (
                          <div className="flex items-center gap-1.5 mt-3 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 w-fit px-2.5 py-1.5 rounded-lg border border-blue-100 dark:border-blue-800/50">
                            <Bell size={12} />
                            Przypomnienie: {new Date(note.reminderDate).toLocaleString('pl-PL', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}
                          </div>
                        )}
                        
                        <button 
                          onClick={() => deleteNote(note.id)}
                          className="absolute top-4 right-4 p-2 text-slate-300 dark:text-slate-600 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all sm:opacity-0 group-hover:opacity-100"
                        >
                          <Trash size={16} />
                        </button>
                        
                        {note.createdAt && (
                          <div className="text-[10px] text-slate-400 font-bold uppercase mt-4 tracking-wider">
                            Utworzono: {new Date(note.createdAt).toLocaleDateString()}
                          </div>
                        )}
                      </motion.div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="p-6 rounded-3xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 mb-6">
                  <h4 className="text-base font-black text-blue-900 dark:text-blue-100 mb-2">Wiedza o cukrzycy</h4>
                  <p className="text-sm font-medium text-blue-800/80 dark:text-blue-200/80 leading-relaxed">
                    Krótkie przypomnienie najważniejszych zasad i pojęć edukacyjnych z wiarygodnych źródeł PTD.
                  </p>
                </div>
                {compendium.map((item, i) => (
                  <div key={`notebook-skeleton-${i}`} className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm relative">
                    <h5 className="font-black text-slate-800 dark:text-slate-100 text-sm mb-2">{item.title}</h5>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed whitespace-pre-wrap">{item.content}</p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>,
        document.body
      )}
    </>
  );
}
