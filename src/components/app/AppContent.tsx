import { useAuthStore } from "../../stores/useAuthStore";
import { useUserSettings, usePetStatus, useNightscoutSettings } from "../../hooks/queries/useProfileData";
import { useLogsStore } from "../../stores/useLogsStore";
import { useAppStore } from '../../stores/useAppStore';
import React from 'react';
import { cn } from "../../lib/utils";
import { useMealPlateStore } from "../../stores/useMealPlateStore";
import { LocalErrorBoundary } from "../LocalErrorBoundary";
import { DEFAULT_SETTINGS } from "../../constants";

import Dashboard from "../Dashboard";
import ChartFullView from "../ChartFullView";
import BolusCalculator from "../BolusCalculator";
import MealPlate from "../MealPlate";
import FoodDatabase from "../FoodDatabase";
import NutritionHub from "../nutrition/NutritionHub";
import AiReports from "../AiReports";
import Profile from "../Profile";
import Achievements from "../Achievements";
import HistoryView from "../HistoryView";
import GlikoGames from "../GlikoGames";
import GlikoChat from "../GlikoChat";
import GlikoAssistant from "../GlikoAssistant";
import InsulinDetective from "../InsulinDetective";
import { Diets } from "../Diets";
import JetLagMode from "../JetLagMode";

// Dynamic preloader functions for bottom navigation & key views
const preloadMainViews = () => {
  import("../ChartFullView");
  import("../MealPlate");
  import("../nutrition/NutritionHub");
  import("../AiReports");
  import("../GlikoAssistant");
  import("../Profile");
  import("../BolusCalculator");
  import("../HistoryView");
};

export const AppContent = (props: any) => {
  const {
    assistantMessages, setAssistantMessages, isAssistantTyping, sendAssistantMessage,
    handleLogout, wsDevices, kickDevice, toggleTheme, pumpStatus: propPumpStatus
  } = props;

  const { user } = useAuthStore();
  const { data: userSettings = null } = useUserSettings(user) as any;
  const pumpStatus = propPumpStatus || null;
  const { data: petData = null } = usePetStatus(user);
  const { data: nsSettings = null } = useNightscoutSettings(user);
  const nsUrl = nsSettings?.url || "";
  const nsSecret = nsSettings?.secret || "";
  
  const logs = useLogsStore((state) => state.logs);

  const {
    activeTab,
    setActiveTab: changeTab,
    theme,
    initialAction,
    setInitialAction,
    syncStatus,
    isShortcutMode
  } = useAppStore();
  const sharedPlate = useMealPlateStore((state) => state.plate);
  const setSharedPlate = useMealPlateStore((state) => state.setPlate);

  // Preload tab chunks in background after initial render
  React.useEffect(() => {
    const timer = setTimeout(() => {
      preloadMainViews();
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const content = (
    <LocalErrorBoundary>
      <div className="flex-1 w-full relative z-0 h-full overflow-hidden">
        {/* 1. Grupa 1: Wykres i Pulpit */}
        {["dashboard", "chart"].includes(activeTab) && (
          <>
            <div className="block lg:hidden w-full">
              {activeTab === "dashboard" && (
                <Dashboard
                  setTab={changeTab}
                  theme={theme}
                  initialAction={initialAction}
                  onClearInitialAction={() => setInitialAction(null)}
                  onAction={(action) => setInitialAction(action)}
                  pumpStatus={pumpStatus}
                  nsUrl={nsUrl}
                  nsSecret={nsSecret}
                  petData={petData}
                  syncStatus={syncStatus}
                  settings={userSettings || DEFAULT_SETTINGS}
                  isShortcutMode={isShortcutMode}
                />
              )}
              {activeTab === "chart" && (
                <ChartFullView
                  settings={userSettings || DEFAULT_SETTINGS}
                  theme={theme}
                  setTab={changeTab}
                />
              )}
            </div>
            <div className="hidden lg:grid lg:grid-cols-12 lg:gap-6 w-full items-start">
              <div className="lg:col-span-12 xl:col-span-8">
                <ChartFullView
                  settings={userSettings || DEFAULT_SETTINGS}
                  theme={theme}
                  setTab={changeTab}
                />
              </div>
              <div className="lg:col-span-12 xl:col-span-4">
                <Dashboard
                  setTab={changeTab}
                  theme={theme}
                  initialAction={initialAction}
                  onClearInitialAction={() => setInitialAction(null)}
                  onAction={(action) => setInitialAction(action)}
                  pumpStatus={pumpStatus}
                  nsUrl={nsUrl}
                  nsSecret={nsSecret}
                  petData={petData}
                  syncStatus={syncStatus}
                  settings={userSettings || DEFAULT_SETTINGS}
                  isShortcutMode={isShortcutMode}
                />
              </div>
            </div>
          </>
        )}

        {/* 2. Grupa 2: Baza i Talerz (Centrum Żywienia) */}
        {["database", "meal"].includes(activeTab) && (
          <>
            <div className="block lg:hidden w-full">
              {activeTab === "database" && !userSettings?.followerMode && (
                <MealPlate
                  key="db-plate"
                  setTab={changeTab}
                  sharedPlate={sharedPlate}
                  setSharedPlate={setSharedPlate}
                  mode="search"
                  openHistory={() => changeTab("history")}
                  settings={userSettings || undefined}
                />
              )}
              {activeTab === "meal" && !userSettings?.followerMode && (
                <NutritionHub
                  key="nutrition-hub"
                  user={user}
                  setTab={changeTab}
                  sharedPlate={sharedPlate}
                  setSharedPlate={setSharedPlate}
                  settings={userSettings || undefined}
                  logs={logs}
                />
              )}
            </div>
            <div className="hidden lg:grid lg:grid-cols-2 lg:gap-6 w-full items-start">
              {!userSettings?.followerMode && (
                <>
                  <div>
                    <MealPlate
                      key="db-plate-desktop"
                      setTab={changeTab}
                      sharedPlate={sharedPlate}
                      setSharedPlate={setSharedPlate}
                      mode="search"
                      openHistory={() => changeTab("history")}
                      settings={userSettings || undefined}
                    />
                  </div>
                  <div>
                    <NutritionHub
                      key="nutrition-hub-desktop"
                      user={user}
                      setTab={changeTab}
                      sharedPlate={sharedPlate}
                      setSharedPlate={setSharedPlate}
                      settings={userSettings || undefined}
                      logs={logs}
                    />
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* 3. Grupa 3: Czat i GlikoSense */}
        {["chat", "assistant", "ai"].includes(activeTab) && !userSettings?.followerMode && (
          <>
            <div
              className={cn(
                "block lg:hidden w-full",
                (activeTab === "chat" || activeTab === "assistant") && "flex-1 flex flex-col h-full",
              )}
            >
              {activeTab === "chat" && <GlikoChat petData={petData} settings={userSettings || undefined} />}
              {activeTab === "assistant" && (
                <GlikoAssistant
                  settings={userSettings || undefined}
                  petData={petData}
                  onAddToPlate={(item) =>
                    setSharedPlate((prev) => [
                      ...prev,
                      {
                        ...item,
                        plateItemId: Math.random().toString(36).substr(2, 9),
                      },
                    ])
                  }
                  messages={assistantMessages}
                  setMessages={setAssistantMessages}
                  isTyping={isAssistantTyping}
                  onSend={sendAssistantMessage}
                />
              )}
              {activeTab === "ai" && (
                <AiReports settings={userSettings} setTab={changeTab} />
              )}
            </div>
            <div className="hidden lg:grid lg:grid-cols-2 lg:gap-6 w-full items-start">
              <div>
                <GlikoAssistant
                  settings={userSettings || undefined}
                  petData={petData}
                  onAddToPlate={(item) =>
                    setSharedPlate((prev) => [
                      ...prev,
                      {
                        ...item,
                        plateItemId: Math.random().toString(36).substr(2, 9),
                      },
                    ])
                  }
                  messages={assistantMessages}
                  setMessages={setAssistantMessages}
                  isTyping={isAssistantTyping}
                  onSend={sendAssistantMessage}
                />
              </div>
              <div>
                <AiReports settings={userSettings} setTab={changeTab} />
              </div>
            </div>
          </>
        )}

        {/* 4. Inne zakładki */}
        {![
          "dashboard",
          "chart",
          "database",
          "meal",
          "chat",
          "assistant",
          "ai",
        ].includes(activeTab) && (
          <div className="w-full max-w-4xl mx-auto">
            {activeTab === "bolus" && !userSettings?.followerMode && (
              <BolusCalculator
                setTab={changeTab}
                setSharedPlate={setSharedPlate}
                pumpStatus={pumpStatus}
                isShortcutMode={isShortcutMode}
              />
            )}
            {activeTab === "history" && (
              <HistoryView
                onBack={() => changeTab("dashboard")}
                settings={userSettings!}
              />
            )}
            {activeTab === "profile" && (
              <Profile
                handleLogout={handleLogout}
                theme={theme}
                toggleTheme={toggleTheme}
                setTab={changeTab}
                initialAction={initialAction}
                onClearInitialAction={() => setInitialAction(null)}
                settings={userSettings || DEFAULT_SETTINGS}
                wsDevices={wsDevices}
                kickDevice={kickDevice}
              />
            )}
            {activeTab === "achievements" && (
              <Achievements
                setTab={changeTab}
                petData={petData}
              />
            )}
            {activeTab === "games" && (
              <GlikoGames setTab={changeTab} />
            )}
            {activeTab === "diets" && (
              <Diets
                setTab={changeTab}
                settings={userSettings || undefined}
              />
            )}
            {activeTab === "travel" && (
              <JetLagMode onClose={() => changeTab('dashboard')} />
            )}
            {activeTab === "insulin_detective" && (
              <InsulinDetective onClose={() => changeTab('dashboard')} />
            )}
          </div>
        )}
      </div>
    </LocalErrorBoundary>
  );

  return content;
};
