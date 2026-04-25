import { Product } from './types';

export const CATEGORIES = [
  "Owoce i Warzywa",
  "Zbożowe i Pieczywo",
  "Nabiał",
  "Mięso i Ryby",
  "Gotowe Posiłki",
  "Słodycze i Przekąski",
  "Inne"
];

export const LIB_BASE: Product[] = [
  // Zbożowe i Pieczywo
  { id: 'p1', name: "Ryż biały gotowany", carbs: 28, protein: 2.7, fat: 0.3, gi: 70, category: "Zbożowe i Pieczywo" },
  { id: 'p1_2', name: "Ryż brązowy gotowany", carbs: 23, protein: 2.6, fat: 0.9, gi: 50, category: "Zbożowe i Pieczywo" },
  { id: 'p3', name: "Chleb żytni pełnoziarnisty", carbs: 45, protein: 6, fat: 1.5, gi: 50, category: "Zbożowe i Pieczywo" },
  { id: 'p3_0', name: "Chleb pszenny", carbs: 49, protein: 9, fat: 1.5, gi: 70, category: "Zbożowe i Pieczywo" },
  { id: 'p3_1', name: "Bułka pszenna (kajzerka)", carbs: 55, protein: 8, fat: 1.5, gi: 70, category: "Zbożowe i Pieczywo" },
  { id: 'p3_1_1', name: "Bułka grahamka", carbs: 50, protein: 9, fat: 1.5, gi: 50, category: "Zbożowe i Pieczywo" },
  { id: 'p3_2', name: "Makaron pszenny (gotowany)", carbs: 25, protein: 3.5, fat: 0.5, gi: 55, category: "Zbożowe i Pieczywo" },
  { id: 'p3_3', name: "Kasza gryczana (gotowana)", carbs: 20, protein: 3, fat: 0.5, gi: 45, category: "Zbożowe i Pieczywo" },
  { id: 'p3_4', name: "Płatki owsiane", carbs: 60, protein: 12, fat: 7, gi: 40, category: "Zbożowe i Pieczywo" },
  { id: 'p10', name: "Kasza jaglana (gotowana)", carbs: 23, protein: 3.5, fat: 1, gi: 70, category: "Zbożowe i Pieczywo" },
  { id: 'p11', name: "Kuskus (gotowany)", carbs: 23, protein: 3.8, fat: 0.2, gi: 65, category: "Zbożowe i Pieczywo" },
  { id: 'p12', name: "Tortilla pszenna", carbs: 50, protein: 8, fat: 7, gi: 65, category: "Zbożowe i Pieczywo" },
  { id: 'p19', name: "Komosa ryżowa (Quinoa)", carbs: 21, protein: 4.4, fat: 2, gi: 50, category: "Zbożowe i Pieczywo" },
  { id: 'p20', name: "Chleb czystoziarnisty", carbs: 12, protein: 10, fat: 20, gi: 30, category: "Zbożowe i Pieczywo" },
  
  // Owoce i Warzywa
  { id: 'p2', name: "Ziemniaki gotowane", carbs: 17, protein: 1.9, fat: 0.1, gi: 70, category: "Owoce i Warzywa" },
  { id: 'p4', name: "Jabłko", carbs: 12, protein: 0.3, fat: 0.2, gi: 35, category: "Owoce i Warzywa" },
  { id: 'p5', name: "Banan", carbs: 22, protein: 1.1, fat: 0.3, gi: 60, category: "Owoce i Warzywa" },
  { id: 'p6', name: "Pomidor", carbs: 3, protein: 1, fat: 0.2, gi: 15, category: "Owoce i Warzywa" },
  { id: 'p7', name: "Ogórek", carbs: 2, protein: 0.7, fat: 0.1, gi: 15, category: "Owoce i Warzywa" },
  { id: 'p8', name: "Marchew surowa", carbs: 7, protein: 1, fat: 0.2, gi: 30, category: "Owoce i Warzywa" },
  { id: 'p9', name: "Marchew gotowana", carbs: 7, protein: 1, fat: 0.2, gi: 85, category: "Owoce i Warzywa" },
  { id: 'p13', name: "Truskawki", carbs: 6, protein: 0.7, fat: 0.4, gi: 40, category: "Owoce i Warzywa" },
  { id: 'p14', name: "Borówki", carbs: 12, protein: 0.7, fat: 0.3, gi: 50, category: "Owoce i Warzywa" },
  { id: 'p15', name: "Awokado", carbs: 1, protein: 2, fat: 15, gi: 10, category: "Owoce i Warzywa" },
  { id: 'p16', name: "Papryka czerwona", carbs: 5, protein: 1, fat: 0.3, gi: 15, category: "Owoce i Warzywa" },
  { id: 'p17', name: "Brokuły gotowane", carbs: 3, protein: 2.5, fat: 0.4, gi: 15, category: "Owoce i Warzywa" },
  { id: 'p18', name: "Arbuz", carbs: 8, protein: 0.6, fat: 0.2, gi: 75, category: "Owoce i Warzywa" },
  { id: 'p21', name: "Winogrona", carbs: 17, protein: 0.7, fat: 0.2, gi: 45, category: "Owoce i Warzywa" },
  { id: 'p22', name: "Gruszka", carbs: 12, protein: 0.4, fat: 0.1, gi: 30, category: "Owoce i Warzywa" },
  { id: 'p23', name: "Fasolka szparagowa", carbs: 4, protein: 2, fat: 0.2, gi: 15, category: "Owoce i Warzywa" },
  { id: 'p24', name: "Bakłażan", carbs: 3, protein: 1, fat: 0.2, gi: 15, category: "Owoce i Warzywa" },

  // Nabiał
  { id: 'n1', name: "Mleko 2%", carbs: 5, protein: 3.4, fat: 2, gi: 30, category: "Nabiał" },
  { id: 'n2', name: "Jogurt naturalny", carbs: 5, protein: 4, fat: 2, gi: 35, category: "Nabiał" },
  { id: 'n3', name: "Twaróg chudy", carbs: 3.5, protein: 20, fat: 0.5, gi: 30, category: "Nabiał" },
  { id: 'n4', name: "Twaróg półtłusty", carbs: 3.5, protein: 18, fat: 4, gi: 30, category: "Nabiał" },
  { id: 'n5', name: "Ser żółty (Gouda)", carbs: 0.1, protein: 25, fat: 27, gi: 0, category: "Nabiał" },
  { id: 'n6', name: "Jajko kurze (1 szt/50g)", carbs: 0.6, protein: 13, fat: 10, gi: 0, category: "Nabiał" },
  { id: 'n7', name: "Kefir", carbs: 4.5, protein: 3.5, fat: 1.5, gi: 30, category: "Nabiał" },
  { id: 'n8', name: "Śmietana 12%", carbs: 4, protein: 3, fat: 12, gi: 30, category: "Nabiał" },
  { id: 'n9', name: "Ser feta", carbs: 4, protein: 14, fat: 21, gi: 0, category: "Nabiał" },
  { id: 'n10', name: "Serek wiejski", carbs: 2.7, protein: 11, fat: 5, gi: 30, category: "Nabiał" },
  { id: 'n11', name: "Mleko owsiane", carbs: 7, protein: 1, fat: 1.5, gi: 40, category: "Nabiał" },

  // Mięso i Ryby
  { id: 'm1', name: "Pierś z kurczaka surowa", carbs: 0, protein: 22, fat: 1.2, gi: 0, category: "Mięso i Ryby" },
  { id: 'm2', name: "Schab pieczony", carbs: 0, protein: 25, fat: 10, gi: 0, category: "Mięso i Ryby" },
  { id: 'm3', name: "Mielone wieprzowe", carbs: 0, protein: 18, fat: 20, gi: 0, category: "Mięso i Ryby" },
  { id: 'm4', name: "Łosoś surowy", carbs: 0, protein: 20, fat: 13, gi: 0, category: "Mięso i Ryby" },
  { id: 'm5', name: "Dorsz świeży", carbs: 0, protein: 17, fat: 0.7, gi: 0, category: "Mięso i Ryby" },
  { id: 'm6', name: "Szynka drobiowa", carbs: 1, protein: 18, fat: 2, gi: 0, category: "Mięso i Ryby" },
  { id: 'm7', name: "Parówki drobiowe", carbs: 2, protein: 12, fat: 20, gi: 0, category: "Mięso i Ryby" },
  { id: 'm8', name: "Stek wołowy", carbs: 0, protein: 26, fat: 15, gi: 0, category: "Mięso i Ryby" },
  { id: 'm9', name: "Indyk (pierś)", carbs: 0, protein: 24, fat: 1, gi: 0, category: "Mięso i Ryby" },
  { id: 'm10', name: "Makrela wędzona", carbs: 0, protein: 19, fat: 15, gi: 0, category: "Mięso i Ryby" },

  // Gotowe Posiłki
  { id: 'g1', name: "Pizza Margharita (100g)", carbs: 30, protein: 10, fat: 8, gi: 60, category: "Gotowe Posiłki" },
  { id: 'g2', name: "Pierogi ruskie (100g)", carbs: 32, protein: 7, fat: 5, gi: 65, category: "Gotowe Posiłki" },
  { id: 'g3', name: "Zupa pomidorowa z ryżem", carbs: 15, protein: 2, fat: 1, gi: 60, category: "Gotowe Posiłki" },
  { id: 'g4', name: "Kebab w tortilli", carbs: 25, protein: 12, fat: 10, gi: 65, category: "Gotowe Posiłki" },
  { id: 'g5', name: "Sushi (Nigiri/Maki)", carbs: 35, protein: 5, fat: 1, gi: 65, category: "Gotowe Posiłki" },
  { id: 'g6', name: "Leczo z cukinią", carbs: 6, protein: 2, fat: 4, gi: 30, category: "Gotowe Posiłki" },
  { id: 'g7', name: "Spaghetti Bolognese", carbs: 25, protein: 8, fat: 6, gi: 55, category: "Gotowe Posiłki" },

  // Słodycze i Przekąski
  { id: 's1', name: "Czekolada mleczna", carbs: 55, protein: 7, fat: 30, gi: 50, category: "Słodycze i Przekąski" },
  { id: 's2', name: "Czekolada gorzka 70%", carbs: 35, protein: 8, fat: 40, gi: 25, category: "Słodycze i Przekąski" },
  { id: 's3', name: "Orzechy włoskie", carbs: 12, protein: 15, fat: 65, gi: 15, category: "Słodycze i Przekąski" },
  { id: 's4', name: "Chipsy ziemniaczane", carbs: 50, protein: 6, fat: 35, gi: 80, category: "Słodycze i Przekąski" },
  { id: 's5', name: "Ciasto drożdżowe", carbs: 50, protein: 7, fat: 8, gi: 65, category: "Słodycze i Przekąski" },
  { id: 's6', name: "Lody waniliowe", carbs: 24, protein: 3.5, fat: 11, gi: 60, category: "Słodycze i Przekąski" },
  { id: 's7', name: "Migdały", carbs: 10, protein: 21, fat: 50, gi: 15, category: "Słodycze i Przekąski" },
  { id: 's8', name: "Popcorn", carbs: 60, protein: 12, fat: 4, gi: 55, category: "Słodycze i Przekąski" },
];
