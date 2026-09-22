import React from 'react';
import {
  MessageSquare,
  History,
  BarChart2,
  Dumbbell,
  Pill,
  Signal,
  BookOpen,
  Calculator,
  Beaker,
  Bell,
  Globe,
  Plane,
  Gamepad2,
  ShoppingBag,
  Trophy,
  Activity,
  Utensils,
  HelpCircle,
  Settings,
} from 'lucide-react';

export interface NavSlotOption {
  id: string;
  tab: string;
  category?: string;
  labelKey: string;
  defaultLabel: string;
  iconName: string;
  childOnly?: boolean;
  insulinOnly?: boolean;
}

export const NAV_SLOT_OPTIONS: NavSlotOption[] = [
  {
    id: 'assistant',
    tab: 'assistant',
    labelKey: 'nav.chat',
    defaultLabel: 'Czat AI',
    iconName: 'MessageSquare',
  },
  {
    id: 'history',
    tab: 'history',
    labelKey: 'sidebar.items.history_list',
    defaultLabel: 'Dziennik',
    iconName: 'History',
  },
  {
    id: 'profile:stats',
    tab: 'profile',
    category: 'stats',
    labelKey: 'profile.tab_stats',
    defaultLabel: 'Statystyki',
    iconName: 'BarChart2',
  },
  {
    id: 'profile:training',
    tab: 'profile',
    category: 'training',
    labelKey: 'profile.tab_training',
    defaultLabel: 'Trening',
    iconName: 'Dumbbell',
  },
  {
    id: 'profile:meds',
    tab: 'profile',
    category: 'meds',
    labelKey: 'profile.tab_meds',
    defaultLabel: 'Leki',
    iconName: 'Pill',
  },
  {
    id: 'profile:devices',
    tab: 'profile',
    category: 'devices',
    labelKey: 'profile.tab_devices',
    defaultLabel: 'Osprzęt',
    iconName: 'Signal',
  },
  {
    id: 'diets',
    tab: 'diets',
    labelKey: 'profile.tab_diets',
    defaultLabel: 'Diety',
    iconName: 'BookOpen',
  },
  {
    id: 'bolus',
    tab: 'bolus',
    labelKey: 'sidebar.items.bolus_calc',
    defaultLabel: 'Kalkulator',
    iconName: 'Calculator',
    insulinOnly: true,
  },
  {
    id: 'profile:simulator',
    tab: 'profile',
    category: 'simulator',
    labelKey: 'profile.tab_simulator',
    defaultLabel: 'Symulator',
    iconName: 'Beaker',
    insulinOnly: true,
  },
  {
    id: 'profile:notifications',
    tab: 'profile',
    category: 'notifications',
    labelKey: 'auto.centrum_powiadomien',
    defaultLabel: 'Powiadomienia',
    iconName: 'Bell',
  },
  {
    id: 'profile:api',
    tab: 'profile',
    category: 'api',
    labelKey: 'profile.tab_api',
    defaultLabel: 'Integracje',
    iconName: 'Globe',
  },
  {
    id: 'travel',
    tab: 'travel',
    labelKey: 'sidebar.items.dash_travel',
    defaultLabel: 'Podróż',
    iconName: 'Plane',
  },
  {
    id: 'achievements',
    tab: 'achievements',
    labelKey: 'sidebar.items.achievements',
    defaultLabel: 'Osiągnięcia',
    iconName: 'Trophy',
    childOnly: true,
  },
  {
    id: 'profile:food',
    tab: 'profile',
    category: 'food',
    labelKey: 'profile.tab_food',
    defaultLabel: 'Skróty',
    iconName: 'Utensils',
  },
  {
    id: 'profile:therapy',
    tab: 'profile',
    category: 'therapy',
    labelKey: 'profile.tab_therapy',
    defaultLabel: 'Terapia',
    iconName: 'Activity',
  },
  {
    id: 'profile:tutorial',
    tab: 'profile',
    category: 'tutorial',
    labelKey: 'profile.tab_tutorial',
    defaultLabel: 'Samouczek',
    iconName: 'HelpCircle',
  },
  {
    id: 'games',
    tab: 'games',
    labelKey: 'sidebar.items.gliko_arcade',
    defaultLabel: 'Salon Gier',
    iconName: 'Gamepad2',
    childOnly: true,
  },
  {
    id: 'profile:system',
    tab: 'profile',
    category: 'system',
    labelKey: 'profile.tab_system',
    defaultLabel: 'Ustawienia',
    iconName: 'Settings',
  },
  {
    id: 'profile:shop',
    tab: 'profile',
    category: 'shop',
    labelKey: 'profile.tab_shop',
    defaultLabel: 'Sklepik',
    iconName: 'ShoppingBag',
    childOnly: true,
  },
];

export function getNavSlotIcon(iconName: string, size = 20) {
  switch (iconName) {
    case 'MessageSquare':
      return <MessageSquare size={size} />;
    case 'History':
      return <History size={size} />;
    case 'BarChart2':
      return <BarChart2 size={size} />;
    case 'Dumbbell':
      return <Dumbbell size={size} />;
    case 'Pill':
      return <Pill size={size} />;
    case 'Signal':
      return <Signal size={size} />;
    case 'BookOpen':
      return <BookOpen size={size} />;
    case 'Calculator':
      return <Calculator size={size} />;
    case 'Beaker':
      return <Beaker size={size} />;
    case 'Bell':
      return <Bell size={size} />;
    case 'Globe':
      return <Globe size={size} />;
    case 'Plane':
      return <Plane size={size} />;
    case 'Gamepad2':
      return <Gamepad2 size={size} />;
    case 'ShoppingBag':
      return <ShoppingBag size={size} />;
    case 'Trophy':
      return <Trophy size={size} />;
    case 'Activity':
      return <Activity size={size} />;
    case 'Utensils':
      return <Utensils size={size} />;
    case 'HelpCircle':
      return <HelpCircle size={size} />;
    case 'Settings':
      return <Settings size={size} />;
    default:
      return <MessageSquare size={size} />;
  }
}

export function resolveNavSlot(
  slotId?: string,
  isChildMode = false,
  treatmentMode = 'insulin',
): NavSlotOption {
  const item = NAV_SLOT_OPTIONS.find((i) => i.id === slotId);
  if (!item) {
    return NAV_SLOT_OPTIONS[0]; // fallback to 'assistant'
  }
  if (item.childOnly && !isChildMode) {
    return NAV_SLOT_OPTIONS[0];
  }
  if (item.insulinOnly && treatmentMode === 'diet_only') {
    return NAV_SLOT_OPTIONS[0];
  }
  return item;
}
