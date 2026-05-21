import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Lightbulb, 
  ChevronLeft
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Haptics } from '../lib/haptics';
import OnboardingTutorial from './OnboardingTutorial';

interface TutorialViewProps {
  setTab: (t: string) => void;
}

export default function TutorialView({ setTab }: TutorialViewProps) {
  const [activeList, setActiveList] = useState<'faq' | 'compendium' | 'tutorial'>('tutorial');
  const [showTutorial, setShowTutorial] = useState(false);

  const faqs = [
    {
      q: "Gdzie włączę i wyłączę Widżet oraz Alerty Pogodowe?",
      a: "Sekcja ustawień profilu w zakładce 'Systemowe' posiada opcję 'Widżet i Alerty Pogodowe'. Pozwala to wyświetlać osobną kartę pogodową na głównym ekranie, która podaje najświeższe dane zza okna. Sprawdza to również skrajne temperatury (takie jak silne mrozy czy upały) i doradza Ci, z czym może się wiązać np. szybsze działanie insuliny."
    },
    {
      q: "Jak działa pełna integracja Pogody w GlikoSense?",
      a: "Jeżeli również zakładce 'Systemowe' zaznaczysz przełącznik 'GlikoSense & Pogoda', wszystkie nowo zapisywane cukry (szczególnie te ściągane automatycznie np. z chmury Nightscout) będą 'stemplowane' temperaturą i ciśnieniem z danego momentu. Pozwala to w przyszłości Twojej Neuralnej Sztucznej Inteligencji zauważyć tendencję, czy mróz podnosi cukier, albo czy w upały masz więcej spadków."
    },
    { 
      q: "Czym jest GlikoCzat?", 
      a: "To inteligentny asystent AI na stałe wbudowany w aplikację, zoptymalizowany pod kątem wsparcia przy cukrzycy. Odpowie na Twoje pytania z zakresu diety czy zarządzania glikemią, a na prośbę błyskawicznie dodaje opisany przez Ciebie posiłek do Talerza Posiłków."
    },
    {
      q: "Jak działa GlikoSense (Analyzer)?",
      a: "GlikoSense to zaawansowana sieć neuronowa przeznaczona do głębokiej analizy historii Twojej glikemii, podanej insuliny oraz posiłków. System ten przegląda zapisane logi i szuka niewidocznych na pierwszy rzut oka relacji, pomagając np. ustalić, dlaczego po pewnych posiłkach cukier niebezpiecznie rośnie."
    },
    { 
      q: "Jak automatycznie dodawać posiłki przez AI?", 
      a: "Wystarczy, że napiszesz w GlikoCzacie: 'Zjadłem dzisiaj dwie kromki chleba z masłem, jajecznicę z 3 jaj i jabłko'. AI samodzielnie rozpozna te produkty, dopasuje ich gramatury, podzieli je na węglowodany, białka i tłuszcze, a następnie doda gotowy posiłek bezpośrednio do Twojego Talerza Posiłków bez ani jednego kliknięcia z Twojej strony!"
    },
    { 
      q: "Do czego służy Talerz Posiłków?", 
      a: "Talerz pozwala komponować posiłki z różnych składników i budować własną listę dań. Mechanizm Talerza automatycznie przelicza ułożone produkty na wymienniki węglowodanowe (WW) i białkowo-tłuszczowe (WBT), aby bez dodatkowego przepisywania użyć tych danych w systemowym Kalkulatorze Bolusa." 
    },
    {
      q: "Po co ustala się opóźnienie w Talerzu Posiłków?",
      a: "Tłustsze potrawy z dużą ilością białka (np. pizza, ser) spowalniają wchłanianie cukrów, więc tzw. WBT (wymienniki białkowo-tłuszczowe) trawią się godzinami. Talerz uwzględnia czas uwalniania. Umiemy przewidzieć przedłużenie i wyliczyć adekwatną dawkę dla pompy (bolus przedłużony lub złożony)."
    },
    { 
      q: "Jak działa szczegółowo Kalkulator Bolusa?", 
      a: "Kalkulator opiera się o sprawdzoną formułę. Korzysta z Twoich ustaleń (ISF / Współczynnik WW). Oblicza najpierw korektę glukozy: (Glukoza - Docelowa) / ISF. Do tego dokłada insulinę na wprowadzony do Talerza posiłek na podstawie proporcji I:C (insulina do węglowodanów) i odejmuje szacowaną Aktywną Insulinę (IOB), żeby uniknąć nałożenia się dawek i potencjalnej hipoglikemii." 
    },
    { 
      q: "Gdzie zmienić moje ważne współczynniki (ISF, Cele)?", 
      a: "Kliknij przycisk 'Więcej' (menu) na prawym dole nawigacji i wybierz opcję 'Terapia'. Znajdziesz w niej pola służące do wpisania aktualnej wrażliwości na insulinę (ISF), Twojego współczynnika WW/WBT, poziomu docelowej glukozy oraz parametrów wchłaniania IOB."
    },
    { 
      q: "Jak zautomatyzować pobieranie glukozy?", 
      a: "Nie musisz robić tego ręcznie. Jeśli posiadasz CGM, przejdź w obszarze 'Więcej' do 'Integracje (API)'. Tam przypnij swój link do Nightscout, a aplikacja w tle zacznie automatycznie dociągać na Twój ekran (i na użytek Kalkulatora / AI) odczyty glukozy minuty po minucie." 
    },
    { 
      q: "Po co są monety i Zwierzak (System Grywalizacji)?", 
      a: "By zachęcić (w szczególności młodzież) do skrupulatnego pilnowania swoich wpisów, system za każde logowanie wyników, tworzenie posiłków, korzystanie z AI lub czytanie podsumowań nagradza specjalnymi monetami. W 'Więcej -> Sklepik' możesz wymieniać je na modyfikacje i ubranka dla lokalnego wirtualnego zwierzaka." 
    },
    { 
      q: "Jak działają Diety w aplikacji?", 
      a: "Sekcja Diet, dostępna w menu 'Więcej', wspiera w wypracowaniu zdrowych nawyków. Znajdziesz w niej interaktywną listę celów np. unikania słodyczy, picia wody czy aktywności fizycznej na dany dzień. System śledzi realizację tych założeń, a Ty zyskujesz lepszą kontrolę nad wagą, co w perspektywie redukuje insulinooporność i stabilizuje glikemię." 
    }
  ];

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
      content: 'Tłuszcze i białka opóźniają opróżnianie żołądka, co spowalnia wchłanianie węglowodanów. Posilki z ich dużą ilością (pizza, fast-food) powodują, że glukoza uwalnia się do krwi nawet do 8 godzin po zjedzeniu. Wymaga to najczęściej zastosowania bolusa przedłużonego lub złożonego krok czy po kroku.',
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
    <motion.div 
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
      className="pb-20 space-y-4"
    >
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
           <div>
             <h1 className="text-xl font-black text-slate-900 dark:text-white font-display tracking-tight flex items-center gap-2">
               <BookOpen size={20} className="text-indigo-500" />
               Baza Wiedzy
             </h1>
           </div>
        </div>
        <div className="flex mt-6 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl">
          <button 
            onClick={() => setActiveList('tutorial')}
            className={cn(
              "flex-1 py-2 text-xs font-bold rounded-lg transition-all text-center",
              activeList === 'tutorial' ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            Samouczek
          </button>
          <button 
            onClick={() => setActiveList('faq')}
            className={cn(
              "flex-1 py-2 text-xs font-bold rounded-lg transition-all text-center",
              activeList === 'faq' ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            FAQ (Aplikacja)
          </button>
          <button 
            onClick={() => setActiveList('compendium')}
            className={cn(
              "flex-1 py-2 text-xs font-bold rounded-lg transition-all text-center",
              activeList === 'compendium' ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            Kompendium
          </button>
        </div>
      </div>

      <div>
        <AnimatePresence mode="wait">
          {activeList === 'tutorial' ? (
            <motion.div key="tutorial" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
              <div className="mb-6 rounded-3xl bg-indigo-50 dark:bg-indigo-500/10 p-6 border border-indigo-100 dark:border-indigo-500/20 text-center">
                 <h2 className="text-xl font-black text-indigo-900 dark:text-indigo-400 mb-2 font-display">Przewodnik po Aplikacji</h2>
                 <p className="text-xs font-medium text-indigo-700/80 dark:text-indigo-300 leading-relaxed mb-6">
                   Uruchom nasz interaktywny samouczek krok po kroku, który oprowadzi Cię po podstawach obsługi GlikoControl. Idealny dla nowych użytkowników!
                 </p>
                 <button 
                   onClick={() => setShowTutorial(true)}
                   className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-500/30 active:scale-95 transition-all"
                 >
                   Odtwórz Samouczek
                 </button>
              </div>
              
              <div className="mt-8 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[2.5rem] border border-slate-200 dark:border-slate-700">
                <h3 className="font-black text-slate-800 dark:text-white mb-4 text-sm font-display">Przydatne porady:</h3>
                <ul className="text-xs font-medium text-slate-600 dark:text-slate-400 space-y-4">
                  <li className="flex items-start gap-3">
                    <span className="bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <div>Zawsze zaczynaj od uzupełnienia swoich profili czasowych i <strong>wrażliwości na insulinę</strong> w zakładce Profil & Ustawienia.</div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <div>Kalkulator Bolusa opiera się na Twoich ustawieniach - im dokładniej je wpiszesz, tym lepsze będą wyliczenia.</div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <div>Jeśli używasz CGM, skasuj hasło do Nightscout, by aplikacja mogła automatycznie pobierać poziomy glukozy z chmury.</div>
                  </li>
                </ul>
              </div>
            </motion.div>
          ) : activeList === 'faq' ? (
            <motion.div key="faq" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
              <div className="mb-6 rounded-3xl bg-indigo-50 dark:bg-indigo-500/10 p-6 border border-indigo-100 dark:border-indigo-500/20">
                 <h2 className="text-sm font-black text-indigo-900 dark:text-indigo-400 mb-2">Jak korzystać z aplikacji?</h2>
                 <p className="text-xs font-medium text-indigo-700/80 dark:text-indigo-300 leading-relaxed">
                   Zestawienie najczęściej zadawanych pytań dotyczących działania zaawansowanych funkcji systemu w tym integracji kalkulatorów, sztucznej inteligencji czy pobierania logów glukozy.
                 </p>
              </div>

              {faqs.map((faq, i) => (
                <motion.div 
                  key={i} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass p-5 rounded-3xl"
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-1 min-w-[24px] h-[24px] rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-400">
                      Q
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white leading-tight mb-2">
                        {faq.q}
                      </h3>
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
                        {faq.a}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}

              <div className="mt-8 p-6 bg-indigo-50 dark:bg-indigo-500/5 rounded-[2.5rem] border border-indigo-100 dark:border-indigo-500/10 text-center">
                 <div className="w-12 h-12 bg-white dark:bg-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                   <Lightbulb className="text-indigo-500" size={24} />
                 </div>
                 <h4 className="text-sm font-black text-indigo-900 dark:text-indigo-400 mb-2">Masz więcej pytań?</h4>
                 <p className="text-[10px] font-medium text-indigo-700/70 dark:text-indigo-400/70">
                   Twój prywatny Asystent w zakładce GlikoCzatu bardzo chętnie wszystko doprecyzuje i odciąży Cię w sprawach cukrzycowych!
                 </p>
              </div>
            </motion.div>
          ) : (
            <motion.div key="compendium" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
              <div className="mb-6 rounded-3xl bg-indigo-50 dark:bg-indigo-500/10 p-6 border border-indigo-100 dark:border-indigo-500/20">
                 <h2 className="text-sm font-black text-indigo-900 dark:text-indigo-400 mb-2">Wiedza o cukrzycy (PTD)</h2>
                 <p className="text-xs font-medium text-indigo-700/80 dark:text-indigo-300 leading-relaxed">
                   Krótkie przypomnienie najważniejszych zasad i pojęć edukacyjnych z wiarygodnych źródeł medycznych.
                 </p>
              </div>

              {compendium.map((item, i) => (
                <motion.div 
                  key={`comp-${i}`} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass p-5 rounded-3xl"
                >
                  <h5 className="font-black text-slate-800 dark:text-slate-100 text-sm mb-2">{item.title}</h5>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed whitespace-pre-wrap">{item.content}</p>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showTutorial && <OnboardingTutorial onComplete={() => setShowTutorial(false)} />}
      </AnimatePresence>
    </motion.div>
  );
}
