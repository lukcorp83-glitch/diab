const fs = require('fs');

const appFile = 'src/App.tsx';
let content = fs.readFileSync(appFile, 'utf8');

// Find the start of currentTabContent
const startStr = 'const currentTabContent = (';
const startIdx = content.indexOf(startStr);
if (startIdx === -1) {
  console.log("Could not find currentTabContent");
  process.exit(1);
}

// Find the end of currentTabContent
const endStr = 'const lastGlucoseValue =';
const endIdx = content.indexOf(endStr, startIdx);
if (endIdx === -1) {
  console.log("Could not find end of currentTabContent");
  process.exit(1);
}

const currentTabContentCode = content.substring(startIdx, endIdx);
console.log("Found currentTabContent, length: " + currentTabContentCode.length);

// Let's create AppContent.tsx
const appContentComponent = `import React from 'react';
import { cn } from "../../lib/utils";
import { LocalErrorBoundary } from "../ErrorBoundary";
import Dashboard from "../Dashboard";
import ChartFullView from "../ChartFullView";
import BolusCalculator from "../BolusCalculator";
import MealPlate from "../MealPlate";
import AiReports from "../AiReports";
import Profile from "../Profile";
import Achievements from "../Achievements";
import HistoryView from "../HistoryView";
import GlikoGames from "../GlikoGames";
import GlikoChat from "../GlikoChat";
import GlikoAssistant from "../GlikoAssistant";
import InsulinDetective from "../InsulinDetective";
import { AnimatePresence, motion } from "framer-motion";

export const AppContent = (props: any) => {
  const {
    activeTab, changeTab, theme, initialAction, setInitialAction,
    pumpStatus, nsUrl, nsSecret, petData, syncStatus, userSettings,
    isShortcutMode, sharedPlate, setSharedPlate,
    assistantMessages, setAssistantMessages, isAssistantTyping, sendAssistantMessage,
    handleLogout, toggleTheme, wsDevices, kickDevice, mealProgress, logs, getEffectiveIOB, direction, tabVariants, handleSwipe
  } = props;

  ${currentTabContentCode.replace('const currentTabContent = (', 'const content = (')}

  return content;
};
`;

fs.writeFileSync('src/components/app/AppContent.tsx', appContentComponent);

// Remove currentTabContent from App.tsx and add import
const newAppContent = content.substring(0, startIdx) + 
  'const currentTabContent = <AppContent {...{activeTab, changeTab, theme, initialAction, setInitialAction, pumpStatus, nsUrl, nsSecret, petData, syncStatus, userSettings, isShortcutMode, sharedPlate, setSharedPlate, assistantMessages, setAssistantMessages, isAssistantTyping, sendAssistantMessage, handleLogout, toggleTheme, wsDevices, kickDevice, mealProgress, logs, getEffectiveIOB, direction, tabVariants, handleSwipe}} />;\n\n  ' + 
  content.substring(endIdx);

fs.writeFileSync('src/App.tsx', newAppContent);
console.log("Extraction complete!");
