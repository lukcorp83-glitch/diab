import { Product } from './types';

export const APP_VERSION = '3.1.0';

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
  { id: 'p3_5', name: "Płatki kukurydziane", carbs: 84, protein: 8, fat: 1, gi: 80, category: "Zbożowe i Pieczywo" },
  { id: 'p3_6', name: "Pieczywo chrupkie żytnie", carbs: 65, protein: 10, fat: 1.5, gi: 65, category: "Zbożowe i Pieczywo" },
  { id: 'p3_7', name: "Makaron pełnoziarnisty", carbs: 24, protein: 5, fat: 1, gi: 40, category: "Zbożowe i Pieczywo" },
  
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
  { id: 'p25', name: "Śliwki", carbs: 11, protein: 0.7, fat: 0.3, gi: 35, category: "Owoce i Warzywa" },
  { id: 'p26', name: "Brzoskwinia", carbs: 10, protein: 0.9, fat: 0.2, gi: 35, category: "Owoce i Warzywa" },
  { id: 'p27', name: "Morele", carbs: 11, protein: 1.4, fat: 0.4, gi: 35, category: "Owoce i Warzywa" },
  { id: 'p28', name: "Wiśnie", carbs: 12, protein: 1, fat: 0.3, gi: 25, category: "Owoce i Warzywa" },
  { id: 'p29', name: "Kukurydza z puszki", carbs: 19, protein: 3, fat: 1, gi: 55, category: "Owoce i Warzywa" },

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
  { id: 'n12', name: "Jogurt grecki", carbs: 4, protein: 9, fat: 10, gi: 35, category: "Nabiał" },
  { id: 'n13', name: "Maślanka", carbs: 5, protein: 3, fat: 1.5, gi: 30, category: "Nabiał" },
  { id: 'n14', name: "Camembert", carbs: 0.1, protein: 21, fat: 24, gi: 0, category: "Nabiał" },
  { id: 'n15', name: "Mozzarella", carbs: 2, protein: 18, fat: 17, gi: 0, category: "Nabiał" },

  // Napoje i Inne
  { id: 'i1', name: "Sok pomarańczowy (100ml)", carbs: 10, protein: 0.7, fat: 0.2, gi: 50, category: "Inne" },
  { id: 'i2', name: "Sok jabłkowy (100ml)", carbs: 10, protein: 0.1, fat: 0.1, gi: 40, category: "Inne" },
  { id: 'i3', name: "Kawa z mlekiem (bez cukru)", carbs: 2, protein: 1.5, fat: 1, gi: 30, category: "Inne" },
  { id: 'i4', name: "Cukier biały (1 łyżeczka - 5g)", carbs: 5, protein: 0, fat: 0, gi: 65, category: "Inne" },
  
  // Mięso i Ryby
  { id: 'm1', name: "Pierś z kurczaka surowa", carbs: 0, protein: 22, fat: 1.3, gi: 0, category: "Mięso i Ryby" },
  { id: 'm1_1', name: "Pierś z kurczaka duszona/pieczona", carbs: 0, protein: 31, fat: 3.6, gi: 0, category: "Mięso i Ryby" },
  { id: 'm2', name: "Schab pieczony", carbs: 0, protein: 25, fat: 10, gi: 0, category: "Mięso i Ryby" },
  { id: 'm3', name: "Mielone wieprzowe", carbs: 0, protein: 18, fat: 20, gi: 0, category: "Mięso i Ryby" },
  { id: 'm4', name: "Łosoś surowy", carbs: 0, protein: 20, fat: 13, gi: 0, category: "Mięso i Ryby" },
  { id: 'm5', name: "Dorsz świeży", carbs: 0, protein: 17, fat: 0.7, gi: 0, category: "Mięso i Ryby" },
  { id: 'm6', name: "Szynka drobiowa", carbs: 1, protein: 18, fat: 2, gi: 0, category: "Mięso i Ryby" },
  { id: 'm7', name: "Parówki drobiowe", carbs: 2, protein: 12, fat: 20, gi: 0, category: "Mięso i Ryby" },
  { id: 'm8', name: "Stek wołowy", carbs: 0, protein: 26, fat: 15, gi: 0, category: "Mięso i Ryby" },
  { id: 'm9', name: "Indyk (pierś)", carbs: 0, protein: 24, fat: 1, gi: 0, category: "Mięso i Ryby" },
  { id: 'm10', name: "Makrela wędzona", carbs: 0, protein: 19, fat: 15, gi: 0, category: "Mięso i Ryby" },
  { id: 'm11', name: "Kiełbasa wieprzowa", carbs: 0, protein: 14, fat: 25, gi: 0, category: "Mięso i Ryby" },
  { id: 'm12', name: "Szynka parmeńska", carbs: 0, protein: 25, fat: 14, gi: 0, category: "Mięso i Ryby" },
  { id: 'm13', name: "Tuńczyk w sosie własnym", carbs: 0, protein: 23, fat: 1, gi: 0, category: "Mięso i Ryby" },
  { id: 'm14', name: "Śledź w oleju", carbs: 0.5, protein: 16, fat: 20, gi: 0, category: "Mięso i Ryby" },

  // Gotowe Posiłki
  { id: 'g1', name: "Pizza Margharita (100g)", carbs: 30, protein: 10, fat: 8, gi: 60, category: "Gotowe Posiłki" },
  { id: 'g2', name: "Pierogi ruskie (100g)", carbs: 32, protein: 7, fat: 5, gi: 65, category: "Gotowe Posiłki" },
  { id: 'g3', name: "Zupa pomidorowa z ryżem", carbs: 15, protein: 2, fat: 1, gi: 60, category: "Gotowe Posiłki" },
  { id: 'g4', name: "Kebab w tortilli", carbs: 25, protein: 12, fat: 10, gi: 65, category: "Gotowe Posiłki" },
  { id: 'g5', name: "Sushi (Nigiri/Maki)", carbs: 35, protein: 5, fat: 1, gi: 65, category: "Gotowe Posiłki" },
  { id: 'g6', name: "Leczo z cukinią", carbs: 6, protein: 2, fat: 4, gi: 30, category: "Gotowe Posiłki" },
  { id: 'g7', name: "Spaghetti Bolognese", carbs: 25, protein: 8, fat: 6, gi: 55, category: "Gotowe Posiłki" },
  { id: 'g8', name: "Burger (fast food)", carbs: 25, protein: 12, fat: 15, gi: 65, category: "Gotowe Posiłki" },
  { id: 'g9', name: "Frytki z piekarnika", carbs: 30, protein: 3, fat: 6, gi: 65, category: "Gotowe Posiłki" },
  { id: 'g10', name: "Zapiekanka z pieczarkami", carbs: 32, protein: 10, fat: 12, gi: 70, category: "Gotowe Posiłki" },
  { id: 'g11', name: "Lasagne", carbs: 12, protein: 8, fat: 9, gi: 55, category: "Gotowe Posiłki" },

  // Słodycze i Przekąski
  { id: 's1', name: "Czekolada mleczna", carbs: 55, protein: 7, fat: 30, gi: 50, category: "Słodycze i Przekąski" },
  { id: 's2', name: "Czekolada gorzka 70%", carbs: 35, protein: 8, fat: 40, gi: 25, category: "Słodycze i Przekąski" },
  { id: 's3', name: "Orzechy włoskie", carbs: 12, protein: 15, fat: 65, gi: 15, category: "Słodycze i Przekąski" },
  { id: 's4', name: "Chipsy ziemniaczane", carbs: 50, protein: 6, fat: 35, gi: 80, category: "Słodycze i Przekąski" },
  { id: 's5', name: "Ciasto drożdżowe", carbs: 50, protein: 7, fat: 8, gi: 65, category: "Słodycze i Przekąski" },
  { id: 's6', name: "Lody waniliowe", carbs: 24, protein: 3.5, fat: 11, gi: 60, category: "Słodycze i Przekąski" },
  { id: 's7', name: "Migdały", carbs: 10, protein: 21, fat: 50, gi: 15, category: "Słodycze i Przekąski" },
  { id: 's8', name: "Popcorn", carbs: 60, protein: 12, fat: 4, gi: 55, category: "Słodycze i Przekąski" },
  { id: 's9', name: "Żelki", carbs: 75, protein: 6, fat: 0, gi: 80, category: "Słodycze i Przekąski" },
  { id: 's10', name: "Rodzynki", carbs: 79, protein: 3, fat: 0.5, gi: 65, category: "Słodycze i Przekąski" },
  { id: 's11', name: "Daktyle suszone", carbs: 75, protein: 2.5, fat: 0.4, gi: 70, category: "Słodycze i Przekąski" },
  { id: 's12', name: "Precle", carbs: 70, protein: 10, fat: 3, gi: 80, category: "Słodycze i Przekąski" },
  { id: 's13', name: "Baton proteinowy", carbs: 35, protein: 30, fat: 12, gi: 45, category: "Słodycze i Przekąski" },
  { id: 's14', name: "Orzeszki ziemne", carbs: 16, protein: 26, fat: 49, gi: 15, category: "Słodycze i Przekąski" },
];

export interface PetSkin {
  id: string;
  name: string;
  icon: string;
  price: number;
  unlockedBy?: string; // id of achievement
  imageUrl?: string;
}

export const SKINS: PetSkin[] = [
  { id: 'default', name: 'Domowy Zwierzak', icon: '🐾', price: 0 },
  { id: 'cat', name: 'Puszysty Kot', icon: '😺', price: 100, imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Cat%20Face.png' },
  { id: 'dog', name: 'Wierny Pies', icon: '🐶', price: 200, imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Dog%20Face.png' },
  { id: 'pig', name: 'Świnka Skarbonka', icon: '🐷', price: 250, imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Pig%20Face.png' },
  { id: 'robot', name: 'Robo-Zwierz', icon: '🤖', price: 400, imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Robot.png' },
  { id: 'alien', name: 'Kosmita', icon: '👽', price: 600, imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Alien.png' },
  { id: 'ghost', name: 'Duch Gliko', icon: '👻', price: 0, unlockedBy: 'night_owl', imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Ghost.png' },
  { id: 'ninja', name: 'Ninja Cukru', icon: '🥷', price: 0, unlockedBy: 'tir_ninja', imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/People/Ninja.png' },
  { id: 'fire', name: 'Ognisty Potworek', icon: '🔥', price: 1000, imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Heart%20on%20Fire.png' },
  { id: 'unicorn', name: 'Jednorożec', icon: '🦄', price: 0, unlockedBy: 'tir_master', imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Unicorn.png' },
  { id: 'dragon', name: 'Smok Gnom', icon: '🐲', price: 2000, imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Dragon%20Face.png' },
  { id: 'panda', name: 'Panda Spokoju', icon: '🐼', price: 450, imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Panda.png' },
  { id: 'superman', name: 'SuperGliko', icon: '🦸', price: 1500, imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/People/Supervillain.png' },
];

export interface PetAccessory {
  id: string;
  name: string;
  icon: string;
  imageUrl: string;
  price: number;
}

export const ACCESSORIES: PetAccessory[] = [
  { id: 'none', name: 'Brak', icon: '❌', imageUrl: '', price: 0 },
  { id: 'hat_top', name: 'Cylinder', icon: '🎩', imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Top%20Hat.png', price: 150 },
  { id: 'glasses_cool', name: 'Okulary VIP', icon: '🕶️', imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Sunglasses.png', price: 200 },
  { id: 'crown', name: 'Korona', icon: '👑', imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Crown.png', price: 500 },
  { id: 'scarf', name: 'Szalik', icon: '🧣', imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Scarf.png', price: 100 },
  { id: 'ribbon', name: 'Kokarda', icon: '🎀', imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Ribbon.png', price: 75 },
  { id: 'magic_wand', name: 'Różdżka', icon: '🪄', imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Magic%20Wand.png', price: 300 },
  { id: 'shield', name: 'Tarcza', icon: '🛡️', imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Shield.png', price: 400 },
  { id: 'balloon', name: 'Balon', icon: '🎈', imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Balloon.png', price: 50 },
];

export interface PetBackground {
  id: string;
  name: string;
  icon: string;
  gradient: string;
  price: number;
  rewardTir?: number;
}

export const BACKGROUNDS: PetBackground[] = [
  { id: 'room', name: 'Pokój', icon: '🏠', gradient: 'from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900', price: 0 },
  { id: 'forest', name: 'Las', icon: '🌲', gradient: 'from-emerald-50 to-green-100 dark:from-emerald-900/40 dark:to-green-900/20', price: 300 },
  { id: 'space', name: 'Kosmos', icon: '🚀', gradient: 'from-indigo-900 to-slate-900 dark:from-indigo-950 dark:to-black', price: 750 },
  { id: 'beach', name: 'Plaża', icon: '🏖️', gradient: 'from-sky-100 to-amber-50 dark:from-sky-900/30 dark:to-amber-900/20', price: 500 },
  { id: 'candy', name: 'Kraina Słodyczy', icon: '🍭', gradient: 'from-pink-50 to-purple-100 dark:from-pink-900/20 dark:to-purple-900/30', price: 1000 },
  { id: 'champion', name: 'Arena Mistrza', icon: '🏆', gradient: 'from-amber-200 via-yellow-100 to-amber-200 dark:from-amber-900 dark:via-yellow-900 dark:to-amber-900', price: 0, rewardTir: 90 },
];
