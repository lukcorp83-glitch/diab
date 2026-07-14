import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, BookOpen, Utensils, Heart, Info, Clock, AlertTriangle, Check, X } from 'lucide-react';
import { Haptics } from '../lib/haptics';
import { User } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserSettings } from '../types';
import { getEffectiveUid } from '../lib/utils';
import { toast } from 'react-hot-toast';
import DietManager from './DietManager';
import HydrationWidget from './HydrationWidget';
import DietScoreWidget from './DietScoreWidget';
import { useTranslation } from "react-i18next";
import i18n from "../i18n";

interface DietsProps {
  user: User;
  setTab: (tab: string) => void;
  settings?: UserSettings;
  logs?: any[];
}

const DIET_TYPES = [
  {
    id: 'plate',
    name: 'Talerz Diabetologiczny',
    icon: <Utensils size={24} className="text-blue-500" />,
    color: 'bg-blue-500',
    description: i18n.t('auto.najbardziej_uniwersalna_metoda', { defaultValue: i18n.t('auto.najbardziej_uniwersalna_m', { defaultValue: "Najbardziej uniwersalna metoda zbilansowanych posiłków na oko. Dzieli talerz na połowę, ćwierć i ćwierć." }) }),
    principles: [
      '1/2 talerza: Warzywa (najlepiej surowe lub gotowane na parze)',
      i18n.t('auto.1_4_talerza_zrodlo_bialka_chud', { defaultValue: i18n.t('auto.1_4_talerza_zrodlo_bialka', { defaultValue: "1/4 talerza: Źródło białka (chude mięso, ryby, jaja, tofu, naczyniowe)" }) }),
      i18n.t('auto.1_4_talerza_weglowodany_zlozon', { defaultValue: i18n.t('auto.1_4_talerza_weglowodany_z', { defaultValue: "1/4 talerza: Węglowodany złożone (kasze, brązowy ryż, ciemny makaron)" }) }),
      i18n.t('auto.dodatek_zdrowe_tluszcze_oliwa', { defaultValue: i18n.t('auto.dodatek_zdrowe_tluszcze_o', { defaultValue: "Dodatek: Zdrowe tłuszcze (oliwa, awokado, orzechy)" }) })
    ],
    pros: [i18n.t('auto.latwa_do_wdrozenia', { defaultValue: i18n.t('auto.latwa_do_wdrozenia', { defaultValue: "Łatwa do wdrożenia" }) }), 'Nie wymaga liczenia kalorii', i18n.t('auto.przystepna_na_miescie', { defaultValue: i18n.t('auto.przystepna_na_miescie', { defaultValue: "Przystępna na mieście" }) })],
    cons: [i18n.t('auto.mniej_precyzyjna_przy_duzych_w', { defaultValue: i18n.t('auto.mniej_precyzyjna_przy_duz', { defaultValue: "Mniej precyzyjna przy dużych wahaniach cukru" }) })],
    tips: i18n.t('auto.idealna_metoda_dla_dzieci_i_do', { defaultValue: i18n.t('auto.idealna_metoda_dla_dzieci', { defaultValue: "Idealna metoda dla dzieci i dorosłych na początek przygody z pompą i liczeniem." }) })
  },
  {
    id: 'keto',
    name: i18n.t('auto.dieta_niskoweglowodanowa_keto', { defaultValue: i18n.t('auto.dieta_niskoweglowodanowa', { defaultValue: "Dieta Niskowęglowodanowa / Keto" }) }),
    icon: <Heart size={24} className="text-red-500" />,
    color: 'bg-red-500',
    description: i18n.t('auto.minimalizuje_spozycie_weglowod', { defaultValue: i18n.t('auto.minimalizuje_spozycie_weg', { defaultValue: "Minimalizuje spożycie węglowodanów, zmuszając organizm do czerpania energii z tłuszczu i ułatwiając płaskie wykresy." }) }),
    principles: [
      i18n.t('auto.weglowodany_ponizej_50_100g_lo', { defaultValue: i18n.t('auto.weglowodany_ponizej_50_10', { defaultValue: "Węglowodany poniżej 50-100g (Low-Carb) lub 20-30g (Keto) na dobę" }) }),
      i18n.t('auto.wysokie_spozycie_zdrowych_tlus', { defaultValue: i18n.t('auto.wysokie_spozycie_zdrowych', { defaultValue: "Wysokie spożycie zdrowych tłuszczów (orzechy, oliwa, masło, awokado)" }) }),
      i18n.t('auto.umiarkowane_spozycie_bialka', { defaultValue: i18n.t('auto.umiarkowane_spozycie_bial', { defaultValue: "Umiarkowane spożycie białka" }) })
    ],
    pros: [i18n.t('auto.mniej_skokow_glikemii_po_posil', { defaultValue: i18n.t('auto.mniej_skokow_glikemii_po', { defaultValue: "Mniej skoków glikemii po posiłkach" }) }), i18n.t('auto.mniejsze_dawki_insuliny_mniej', { defaultValue: i18n.t('auto.mniejsze_dawki_insuliny_m', { defaultValue: "Mniejsze dawki insuliny (mniej błędów pomiarowych)" }) })],
    cons: [i18n.t('auto.moze_wymagac_dluzszego_ustawia', { defaultValue: i18n.t('auto.moze_wymagac_dluzszego_us', { defaultValue: "Może wymagać dłuższego ustawiania bazy (tzw. Wymienniki Białkowo-Tłuszczowe)" }) }), i18n.t('auto.ryzyko_ketozy_i_kwasicy_wymaga', { defaultValue: i18n.t('auto.ryzyko_ketozy_i_kwasicy_w', { defaultValue: "Ryzyko ketozy i kwasicy (wymaga kontroli ciał ketonowych)" }) }), 'Trudna dla dzieci w okresie wzrostu'],
    tips: i18n.t('auto.uzywajac_pompy_wbt_wymienniki', { defaultValue: i18n.t('auto.uzywajac_pompy_wbt_wymien', { defaultValue: "Używając pompy, WBT (Wymienniki Białkowo-Tłuszczowe) powinieneś podawać jako Bolus Przedłużony, np. na 2-4 godziny." }) })
  },
  {
    id: 'dash',
    name: i18n.t('auto.dash_srodziemnomorska', { defaultValue: i18n.t('auto.dash_srodziemnomorska', { defaultValue: "DASH / Śródziemnomorska" }) }),
    icon: <BookOpen size={24} className="text-green-500" />,
    color: 'bg-green-500',
    description: i18n.t('auto.diety_ukierunkowane_na_zdrowie', { defaultValue: i18n.t('auto.diety_ukierunkowane_na_zd', { defaultValue: "Diety ukierunkowane na zdrowie sercowo-naczyniowe, często polecane w cukrzycy jako ogólny złoty standard." }) }),
    principles: [
      i18n.t('auto.duzo_warzyw_owocow_szczegolnie', { defaultValue: i18n.t('auto.duzo_warzyw_owocow_szczeg', { defaultValue: "Dużo warzyw, owoców (szczególnie jagodowych ze względu na niski reżim GI)" }) }),
      i18n.t('auto.oliwa_z_oliwek_jako_glowne_zro', { defaultValue: i18n.t('auto.oliwa_z_oliwek_jako_glown', { defaultValue: "Oliwa z oliwek jako główne źródło tłuszczu" }) }),
      i18n.t('auto.ryby_drob_ograniczone_czerwone', { defaultValue: i18n.t('auto.ryby_drob_ograniczone_cze', { defaultValue: "Ryby, drób, ograniczone czerwone mięso" }) }),
      i18n.t('auto.ograniczona_podaz_soli_dash', { defaultValue: i18n.t('auto.ograniczona_podaz_soli_da', { defaultValue: "Ograniczona podaż soli (DASH)" }) })
    ],
    pros: [i18n.t('auto.najzdrowszy_profil_lipidowy_na', { defaultValue: i18n.t('auto.najzdrowszy_profil_lipido', { defaultValue: "Najzdrowszy profil lipidowy na przyszłość" }) }), i18n.t('auto.zalecana_przez_wiekszosc_towar', { defaultValue: i18n.t('auto.zalecana_przez_wiekszosc', { defaultValue: "Zalecana przez większość towarzystw diabetologicznych" }) })],
    cons: [i18n.t('auto.wiecej_weglowodanow_wymaga_pre', { defaultValue: i18n.t('auto.wiecej_weglowodanow_wymag', { defaultValue: "Więcej węglowodanów wymaga precyzyjnego liczenia (WW i WBT)" }) })],
    tips: i18n.t('auto.aby_nie_podbijac_wagi_i_unikna', { defaultValue: i18n.t('auto.aby_nie_podbijac_wagi_i_u', { defaultValue: "Aby nie podbijać wagi i uniknąć skoków, owoc zjadaj zaraz po posiłku białkowym, a nie osobno (opóźni to skok cukru)." }) })
  },
  {
    id: 'if',
    name: 'Intermittent Fasting (Post Przerywany)',
    icon: <Clock size={24} className="text-purple-500" />,
    color: 'bg-purple-500',
    description: i18n.t('auto.niespozywanie_posilkow_przez_k', { defaultValue: i18n.t('auto.niespozywanie_posilkow_pr', { defaultValue: "Niespożywanie posiłków przez konkretne okno czasowe (np. 16 godzin postu, 8 godzin jedzenia)." }) }),
    principles: [
      'Najpopularniejszy wariant: 16/8. Jesz np. od 10:00 do 18:00.',
      'W czasie postu: woda, czarna kawa polecane.'
    ],
    pros: [i18n.t('auto.pomaga_w_redukcji_insulinoopor', { defaultValue: i18n.t('auto.pomaga_w_redukcji_insulin', { defaultValue: "Pomaga w redukcji insulinooporności" }) }), i18n.t('auto.baza_nocna_czesto_stabilizuje', { defaultValue: i18n.t('auto.baza_nocna_czesto_stabili', { defaultValue: "Baza nocna często stabilizuje się lepiej bez późnego posiłku" }) })],
    cons: [i18n.t('auto.ryzyko_hipoglikemii_u_diabetyk', { defaultValue: i18n.t('auto.ryzyko_hipoglikemii_u_dia', { defaultValue: "Ryzyko hipoglikemii - u diabetyków z pompą należy BARDZO OSTRZEŻNIE dobierać bazę" }) }), i18n.t('auto.mozliwe_zjawisko_brzasku_skok', { defaultValue: i18n.t('auto.mozliwe_zjawisko_brzasku', { defaultValue: "Możliwe zjawisko \"brzasku\" - skok cukru rano mimo braku jedzenia" }) })],
    tips: i18n.t('auto.jezeli_rano_mocno_skacze_cukie', { defaultValue: i18n.t('auto.jezeli_rano_mocno_skacze', { defaultValue: "Jeżeli rano mocno skacze cukier (tzw. brzask), przedłużony bolus nocny i dobrze ustawiona baza to podstawa. Nie polecane dla dzieci." }) })
  },
  {
    id: 'gluten',
    name: 'Bezglutenowa / Przy Celiakii',
    icon: <AlertTriangle size={24} className="text-orange-500" />,
    color: 'bg-orange-500',
    description: i18n.t('auto.celiakia_wystepuje_statystyczn', { defaultValue: i18n.t('auto.celiakia_wystepuje_statys', { defaultValue: "Celiakia występuje statystycznie częściej u osób z CT1. Wymaga całkowitego wykluczenia glutenu." }) }),
    principles: [
      i18n.t('auto.brak_pszenicy_zyta_jeczmienia', { defaultValue: i18n.t('auto.brak_pszenicy_zyta_jeczmi', { defaultValue: "Brak: pszenicy, żyta, jęczmienia, owsa (niecertyfikowanego)" }) }),
      i18n.t('auto.zastepniki_maki_kukurydziane_r', { defaultValue: i18n.t('auto.zastepniki_maki_kukurydzi', { defaultValue: "Zastępniki: mąki kukurydziane, ryżowe, gryczane" }) })
    ],
    pros: [i18n.t('auto.kluczowa_u_zdiagnozowanych_pac', { defaultValue: i18n.t('auto.kluczowa_u_zdiagnozowanyc', { defaultValue: "Kluczowa u zdiagnozowanych pacjentów z celiakią i rygorystycznie poprawia trawienie oraz glikemie, jeśli były wchłonięcia" }) })],
    cons: [i18n.t('auto.zastepniki_chleba_np_ryzowe_ku', { defaultValue: i18n.t('auto.zastepniki_chleba_np_ryzo', { defaultValue: "Zastępniki chleba (np. ryżowe/kukurydziane) często mają o wiele wyższy Indeks Glikemiczny, powodując większe skoki glikemii!" }) })],
    tips: i18n.t('auto.produkty_gluten_free_bywaja_pe', { defaultValue: i18n.t('auto.produkty_gluten_free_bywa', { defaultValue: "Produkty \"Gluten Free\" bywają pełne cukru dodanego i mąki o ułatwionym wchłanianiu. Zawsze czytaj makro, przeliczaj i obserwuj czas działania insuliny!" }) })
  }
];

export function Diets({ user, setTab, settings, logs = [] }: DietsProps) {
    const { t } = useTranslation();
  const [selectedDiet, setSelectedDiet] = useState<typeof DIET_TYPES[0] | null>(null);

  const toggleDiet = async (dietId: string) => {
    Haptics.medium();
    if (!settings) return;
    try {
      const isActivating = settings.activeDiet !== dietId;
      const updates = {
        activeDiet: isActivating ? dietId : null,
        dietStartDate: isActivating ? Date.now() : null
      };
      await setDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'settings', 'profile'), updates, { merge: true });
      
      if (isActivating) {
        toast.success(`Aktywowano dietę: ${DIET_TYPES.find(d => d.id === dietId)?.name}`);
        setSelectedDiet(null); // Return to dashboard view
      } else {
        toast.success(i18n.t('auto.zakonczono_diete', { defaultValue: i18n.t('auto.zakonczono_diete', { defaultValue: "Zakończono dietę." }) }));
      }
    } catch (e) {
      console.error(e);
      toast.error(i18n.t('auto.blad_podczas_zmiany_diety', { defaultValue: i18n.t('auto.blad_podczas_zmiany_diety', { defaultValue: "Błąd podczas zmiany diety" }) }));
    }
  };

  if (settings?.activeDiet) {
    const activeDietData = DIET_TYPES.find(d => d.id === settings.activeDiet);
    const startDate = settings.dietStartDate || Date.now();
    const daysActive = Math.floor((Date.now() - startDate) / (1000 * 60 * 60 * 24));
    
    // Obliczanie kalorii spożytych dzisiaj
    const today = new Date();
    today.setHours(0,0,0,0);
    const todayLogs = (logs || []).filter(l =>
      l.timestamp >= today.getTime() &&
      (l.type === 'meal' || (l.type === 'bolus' && l.linkedMeal?.carbs))
    );
    let consumedCalories = 0;
    todayLogs.forEach(log => {
      // calories: bezpośrednio zapisane lub policzone z makroskładników
      const cal = log.calories || log.linkedMeal?.calories || 0;
      if (cal > 0) {
        consumedCalories += cal;
      } else {
        // dla type=meal: carbs w polu 'value', protein i fat bezpośrednio
        const carbs = log.type === 'meal'
          ? (log.value || log.carbs || log.linkedMeal?.carbs || 0)
          : (log.carbs || log.linkedMeal?.carbs || 0);
        const pro = log.protein || log.linkedMeal?.protein || 0;
        const fat = log.fat || log.linkedMeal?.fat || 0;
        if (carbs > 0 || pro > 0 || fat > 0) {
          consumedCalories += (carbs * 4) + (pro * 4) + (fat * 9);
        }
      }
    });
    consumedCalories = Math.round(consumedCalories);
    
    if (activeDietData) {
      return (
        <div className="w-full max-w-md mx-auto space-y-4 p-4 pb-32">
          <div className="flex items-center gap-3 mb-6">
            <div className={`p-3 rounded-2xl bg-white dark:bg-slate-800 shadow-sm ${activeDietData.color.replace('bg-', 'text-')}`}>
              {activeDietData.icon}
            </div>
            <div className="flex flex-col">
              <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">{t('auto.zarządzanie_dietą', { defaultValue: i18n.t('auto.zarzadzanie_dieta', { defaultValue: "Zarządzanie Dietą" }) })}</h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{activeDietData.name}</p>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-xl border border-slate-100 dark:border-slate-800 relative overflow-hidden">
            <div className={`absolute -right-12 -top-12 w-48 h-48 rounded-full opacity-[0.03] ${activeDietData.color}`} />
            
            <div className="space-y-6 relative z-10">
               
               <div className="grid grid-cols-3 gap-3">
                 <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center glass-target">
                   <span className="text-2xl font-black text-slate-900 dark:text-white mb-1">{daysActive}</span>
                   <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{t('auto.dni_na_diecie', { defaultValue: 'Dni na diecie' })}</span>
                 </div>
                 <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center glass-target">
                   <span className="text-2xl font-black text-slate-900 dark:text-white mb-1">{consumedCalories}</span>
                   <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{t('auto.kcal_dzis', { defaultValue: 'Kcal dziś' })}</span>
                 </div>
                 <button 
                  onClick={() => {
                    Haptics.selection();
                    setTab('meal');
                  }}
                  className="bg-sky-50 dark:bg-sky-900/20 hover:bg-sky-100 dark:hover:bg-sky-900/40 transition-colors rounded-2xl p-4 border border-sky-100 dark:border-sky-800/30 flex flex-col items-center justify-center text-center group cursor-pointer"
                 >
                   <Utensils size={20} className="text-sky-500 mb-2 group-hover:scale-110 transition-transform" />
                   <span className="text-[9px] font-black uppercase tracking-widest text-sky-600 dark:text-sky-400">{t('auto.talerz_i_baza', { defaultValue: 'Talerz i Baza' })}</span>
                 </button>
               </div>

               <div>
                 <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white mb-2">{t('auto.twój_cel_na_dziś', { defaultValue: i18n.t('auto.twoj_cel_na_dzis', { defaultValue: "Twój cel na dziś" }) })}</h3>
                 <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                   {activeDietData.description}
                 </p>
               </div>
               
               <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 glass-target">
                 <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                    
                                                  {t('auto.główne_zasady', { defaultValue: i18n.t('auto.glowne_zasady', { defaultValue: "Główne Zasady" }) })}
                                               </h4>
                 <ul className="space-y-2">
                   {activeDietData.principles.map((p, i) => (
                      <li key={i} className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-start gap-2">
                        <span className="text-blue-500 mt-0.5">•</span> <span>{p}</span>
                      </li>
                   ))}
                 </ul>
               </div>
               
               <div 
                 onClick={() => {
                   Haptics.selection();
                   setTab('chat');
                 }}
                 className="bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-4 border border-indigo-100 dark:border-indigo-800/30 cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
               >
                   <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-2 flex items-center gap-1.5">
                     <Info size={12} />  {t('auto.wsparcie_gliko_ai', { defaultValue: 'Wsparcie Gliko AI' })}
                                                 </h4>
                   <p className="text-xs font-medium text-indigo-900 dark:text-indigo-200 leading-relaxed">
                     
                                                   {t('auto.asystent_ai_uwzględnia_dietę', { defaultValue: i18n.t('auto.asystent_ai_uwzglednia_di', { defaultValue: "Asystent AI uwzględnia dietę" }) })} {activeDietData.name}  {t('auto.podczas_swoich_analiz_i_rekomendacj', { defaultValue: i18n.t('auto.podczas_swoich_analiz_i_r', { defaultValue: "podczas swoich analiz i rekomendacji posiłków. Otwórz czat aby zapytać o poradę!" }) })}
                                                 </p>
               </div>
               
               <HydrationWidget user={user} tdee={settings.tdee} />
               
               <DietScoreWidget user={user} activeDiet={settings.activeDiet} settings={settings} />

               <DietManager user={user} settings={settings} activeDietData={activeDietData} />
               
               <div className="pt-2">
                 <button
                    onClick={() => toggleDiet(activeDietData.id)}
                    className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/30 hover:bg-rose-100 dark:hover:bg-rose-900/40"
                  >
                   <X size={18} />
                   
                                                 {t('auto.zrezygnuj_z_diety', { defaultValue: 'Zrezygnuj z diety' })}
                                               </button>
               </div>
            </div>
          </div>
        </div>
      );
    }
  }

  if (selectedDiet) {
    return (
      <div className="w-full max-w-md mx-auto space-y-4 p-4 pb-32">
        <div className="flex items-center gap-3 mb-6">
          <button 
            onClick={() => {
              Haptics.light();
              setSelectedDiet(null);
            }} 
            className="p-2 bg-white rounded-full shadow-sm hover:scale-105 transition-transform"
          >
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div className="flex flex-col">
            <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">{selectedDiet.name}</h2>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('auto.katalog_diet', { defaultValue: 'Katalog Diet' })}</p>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] p-6 shadow-xl border border-slate-100 relative overflow-hidden">
          <div className={`absolute -right-12 -top-12 w-48 h-48 rounded-full opacity-[0.03] ${selectedDiet.color}`} />
          
          <div className="flex items-center gap-4 mb-6">
            <div className={`p-4 rounded-2xl bg-white shadow-xl ${selectedDiet.color.replace('bg-', 'text-')}`}>
              {selectedDiet.icon}
            </div>
            <p className="text-sm font-medium text-slate-600 leading-relaxed">
              {selectedDiet.description}
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                
                                            {t('auto.zasady', { defaultValue: 'Zasady' })}
                                          </h3>
              <ul className="space-y-2">
                {selectedDiet.principles.map((p, i) => (
                  <li key={i} className="text-sm font-medium text-slate-700 flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">•</span> {p}
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-2">{t('auto.zalety_dla_diabetyka', { defaultValue: 'Zalety dla Diabetyka' })}</h3>
                <ul className="space-y-1">
                  {selectedDiet.pros.map((p, i) => (
                    <li key={i} className="text-xs font-semibold text-emerald-800 flex items-start gap-2">
                      <span className="text-emerald-500">✓</span> {p}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-rose-50 rounded-2xl p-4 border border-rose-100">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-rose-600 mb-2">{t('auto.wady_pułapki', { defaultValue: i18n.t('auto.wady_pulapki', { defaultValue: "Wady / Pułapki" }) })}</h3>
                <ul className="space-y-1">
                  {selectedDiet.cons.map((p, i) => (
                    <li key={i} className="text-xs font-semibold text-rose-800 flex items-start gap-2">
                      <span className="text-rose-500">✗</span> {p}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-2 flex items-center gap-1.5">
                <Info size={12} />
                
                                            {t('auto.porada_glikocontrol', { defaultValue: 'Porada GlikoControl' })}
                                          </h3>
              <p className="text-xs font-medium text-indigo-900 leading-relaxed">
                {selectedDiet.tips}
              </p>
            </div>
            
            <div className="pt-4">
              <button
                onClick={() => toggleDiet(selectedDiet.id)}
                className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-600/20`}
              >
                  <>
                    <Check size={18} />
                    
                                                    {t('auto.przejdź_na_tę_dietę', { defaultValue: i18n.t('auto.przejdz_na_te_diete', { defaultValue: "Przejdź na tę dietę" }) })}
                                                  </>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-4 p-4 pb-32">
      <div className="mb-6 space-y-1">
        <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase font-display">{t('auto.diety_nawyki', { defaultValue: 'Diety & Nawyki' })}</h2>
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t('auto.pomysły_na_zbilansowane_żywienie', { defaultValue: i18n.t('auto.pomysly_na_zbilansowane_z', { defaultValue: "Pomysły na zbilansowane żywienie" }) })}</p>
      </div>

      <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-[2rem] p-6 mb-6 border border-indigo-100 dark:border-indigo-800/30">
        <h3 className="text-sm font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-2">{t('auto.pamiętaj', { defaultValue: i18n.t('auto.pamietaj', { defaultValue: "Pamiętaj!" }) })}</h3>
        <p className="text-xs font-medium text-indigo-900 dark:text-indigo-200 leading-relaxed">
          
                            {t('auto.nie_ma_jednej_idealnej_diety_dla_ka', { defaultValue: i18n.t('auto.nie_ma_jednej_idealnej_di', { defaultValue: "Nie ma jednej idealnej diety dla każdego diabetyka. Reakcja na węglowodany, tłuszcze i białko jest indywidualna. Zawsze modyfikuj dawki insuliny z głową i w porozumieniu z lekarzem prowadzącym." }) })}
                          </p>
      </div>

      <div className="grid gap-3">
        {DIET_TYPES.map((diet, i) => (
          <motion.button
            key={diet.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => {
              Haptics.medium();
              setSelectedDiet(diet);
            }}
            className="w-full p-4 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-4 hover:scale-[1.02] active:scale-95 transition-all outline-none text-left"
          >
            <div className={`p-3 rounded-2xl bg-slate-50 dark:bg-slate-800`}>
              {diet.icon}
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{diet.name}</h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5 line-clamp-1">{diet.description}</p>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

