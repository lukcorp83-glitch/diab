import i18n from "../i18n";

export interface PetSkin {
  id: string;
  name: string;
  namePl?: string;
  nameEn?: string;
  icon: string;
  price: number;
  unlockedBy?: string; // id of achievement
  imageUrl?: string;
}

export const SKINS: PetSkin[] = [
  { id: 'default', name: "Domowy Zwierzak", namePl: "Domowy Zwierzak", nameEn: "Pet", icon: '🐾', price: 0 },
  { id: 'cat', name: "Puszysty Kot", namePl: "Puszysty Kot", nameEn: "Fluffy Cat", icon: '😺', price: 100, imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Cat%20Face.png' },
  { id: 'dog', name: "Wierny Pies", namePl: "Wierny Pies", nameEn: "Faithful Dog", icon: '🐶', price: 200, imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Dog%20Face.png' },
  { id: 'pig', name: i18n.t('auto.swinka_skarbonka', { defaultValue: i18n.t('auto.swinka_skarbonka', { defaultValue: "Świnka Skarbonka" }) }), icon: '🐷', price: 250, imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Pig%20Face.png' },
  { id: 'robot', name: "Robo-Zwierz", namePl: "Robo-Zwierz", nameEn: "Robo-Animal", icon: '🤖', price: 400, imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Robot.png' },
  { id: 'alien', name: "Kosmita", namePl: "Kosmita", nameEn: "Alien", icon: '👽', price: 600, imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Alien.png' },
  { id: 'ghost', name: "Duch Gliko", namePl: "Duch Gliko", nameEn: "Spirit Gliko", icon: '👻', price: 0, unlockedBy: 'night_owl', imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Ghost.png' },
  { id: 'ninja', name: "Ninja Cukru", namePl: "Ninja Cukru", nameEn: "Sugar Ninja", icon: '🥷', price: 0, unlockedBy: 'tir_ninja', imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/People/Ninja.png' },
  { id: 'fire', name: "Ognisty Potworek", namePl: "Ognisty Potworek", nameEn: "Fiery Little Monster", icon: '🔥', price: 1000, imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Heart%20on%20Fire.png' },
  { id: 'unicorn', name: i18n.t('auto.jednorozec', { defaultValue: i18n.t('auto.jednorozec', { defaultValue: "Jednorożec" }) }), icon: '🦄', price: 0, unlockedBy: 'tir_master', imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Unicorn.png' },
  { id: 'dragon', name: "Smok Gnom", namePl: "Smok Gnom", nameEn: "Gnome Dragon", icon: '🐲', price: 2000, imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Dragon%20Face.png' },
  { id: 'panda', name: "Panda Spokoju", namePl: "Panda Spokoju", nameEn: "Panda of Calm", icon: '🐼', price: 450, imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Panda.png' },
  { id: 'superman', name: "SuperGliko", namePl: "SuperGliko", nameEn: "SuperGliko", icon: '🦸', price: 1500, imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/People/Supervillain.png' },
];

export interface PetAccessory {
  id: string;
  name: string;
  namePl?: string;
  nameEn?: string;
  icon: string;
  imageUrl: string;
  price: number;
}

export const ACCESSORIES: PetAccessory[] = [
  { id: 'none', name: "Brak", namePl: "Brak", nameEn: "None", icon: '❌', imageUrl: '', price: 0 },
  { id: 'hat_top', name: "Cylinder", namePl: "Cylinder", nameEn: "Cylinder", icon: '🎩', imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Top%20Hat.png', price: 150 },
  { id: 'glasses_cool', name: "Okulary VIP", namePl: "Okulary VIP", nameEn: "VIP Glasses", icon: '🕶️', imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Sunglasses.png', price: 200 },
  { id: 'crown', name: "Korona", namePl: "Korona", nameEn: "Crown", icon: '👑', imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Crown.png', price: 500 },
  { id: 'scarf', name: "Szalik", namePl: "Szalik", nameEn: "Scarf", icon: '🧣', imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Scarf.png', price: 100 },
  { id: 'ribbon', name: "Kokarda", namePl: "Kokarda", nameEn: "Bow", icon: '🎀', imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Ribbon.png', price: 75 },
  { id: 'magic_wand', name: i18n.t('auto.rozdzka', { defaultValue: i18n.t('auto.rozdzka', { defaultValue: "Różdżka" }) }), icon: '🪄', imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Magic%20Wand.png', price: 300 },
  { id: 'shield', name: "Tarcza", namePl: "Tarcza", nameEn: "Shield", icon: '🛡️', imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Shield.png', price: 400 },
  { id: 'balloon', name: "Balon", namePl: "Balon", nameEn: "Balloon", icon: '🎈', imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Balloon.png', price: 50 },
];

export interface PetBackground {
  id: string;
  name: string;
  namePl?: string;
  nameEn?: string;
  icon: string;
  gradient: string;
  price: number;
  rewardTir?: number;
}

export const BACKGROUNDS: PetBackground[] = [
  { id: 'room', name: i18n.t('auto.pokoj', { defaultValue: i18n.t('auto.pokoj', { defaultValue: "Pokój" }) }), icon: '🏠', gradient: 'from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900', price: 0 },
  { id: 'forest', name: "Las", namePl: "Las", nameEn: "Forest", icon: '🌲', gradient: 'from-emerald-50 to-green-100 dark:from-emerald-900/40 dark:to-green-900/20', price: 300 },
  { id: 'space', name: "Kosmos", namePl: "Kosmos", nameEn: "Cosmos", icon: '🚀', gradient: 'from-indigo-900 to-slate-900 dark:from-indigo-950 dark:to-black', price: 750 },
  { id: 'beach', name: i18n.t('auto.plaza', { defaultValue: i18n.t('auto.plaza', { defaultValue: "Plaża" }) }), icon: '🏖️', gradient: 'from-sky-100 to-amber-50 dark:from-sky-900/30 dark:to-amber-900/20', price: 500 },
  { id: 'candy', name: i18n.t('auto.kraina_slodyczy', { defaultValue: i18n.t('auto.kraina_slodyczy', { defaultValue: "Kraina Słodyczy" }) }), icon: '🍭', gradient: 'from-pink-50 to-purple-100 dark:from-pink-900/20 dark:to-purple-900/30', price: 1000 },
  { id: 'champion', name: "Arena Mistrza", namePl: "Arena Mistrza", nameEn: "Master's Arena", icon: '🏆', gradient: 'from-amber-200 via-yellow-100 to-amber-200 dark:from-amber-900 dark:via-yellow-900 dark:to-amber-900', price: 0, rewardTir: 90 },
];

export interface PetItem {
  id: string;
  name: string;
  namePl?: string;
  nameEn?: string;
  type: 'food' | 'toy' | 'medicine';
  price: number;
  icon: string;
  effect: {
    hunger?: number;
    happiness?: number;
    xp?: number;
  };
  specialEffect?: 'hypo' | 'hyper';
}

export const ITEMS: PetItem[] = [
  { id: 'apple', name: i18n.t('auto.zlote_jablko', { defaultValue: i18n.t('auto.zlote_jablko', { defaultValue: "Złote Jabłko" }) }), type: 'food', price: 10, icon: '🍎', effect: { hunger: 30, xp: 10 } },
  { id: 'juice', name: "Sok Ratunkowy", namePl: "Sok Ratunkowy", nameEn: "Rescue Juice", type: 'medicine', price: 15, icon: '🧃', effect: { hunger: 10, happiness: 10 }, specialEffect: 'hypo' },
  { id: 'water', name: "Woda Mineralna", namePl: "Woda Mineralna", nameEn: "Mineral Water", type: 'medicine', price: 15, icon: '💧', effect: { happiness: 10 }, specialEffect: 'hyper' },
  { id: 'ball', name: i18n.t('auto.pileczka', { defaultValue: i18n.t('auto.pileczka', { defaultValue: "Piłeczka" }) }), type: 'toy', price: 20, icon: '🎾', effect: { happiness: 30, xp: 15 } },
  { id: 'cake', name: "Pyszne Ciastko", namePl: "Pyszne Ciastko", nameEn: "Delicious Cookie", type: 'food', price: 25, icon: '🍰', effect: { hunger: 50, happiness: 20, xp: 20 } },
];
