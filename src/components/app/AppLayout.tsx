import { useAppStore } from '../../stores/useAppStore';
import React from 'react';
import { motion, AnimatePresence, MotionConfig } from "motion/react";
import { cn } from "../../lib/utils";
import { Haptics } from '../../lib/haptics';
import { useTranslation } from "react-i18next";
import i18n from "../../i18n";
import { APP_VERSION } from "../../constants";
import { Toaster, toast, ToastBar } from "react-hot-toast";
import {
  Activity,
  LogOut,
  Moon,
  Sun,
  Menu,
  CheckCircle2,
  X,
  TrendingUp,
  LayoutDashboard,
  Utensils,
  Plus,
  Beaker,
  History,
  Apple,
  Search,
  Camera,
  MessageSquare,
  Zap,
  Globe,
  Database
} from "lucide-react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { getEffectiveUid } from "../../lib/utils";

import { NotificationListenerSync } from "../NotificationListenerSync";
import RemoteAlertsListener from "../RemoteAlertsListener";
import { MeshBackground } from "./MeshBackground";
import Sidebar from "../Sidebar";
import Logo from "../Logo";
import QuickStatusPopup from "../QuickStatusPopup";
const OnboardingTutorial = React.lazy(() => import("../OnboardingTutorial"));
const PrivacyPopup = React.lazy(() => import("../PrivacyPopup"));
const ChangelogPopup = React.lazy(() => import("../ChangelogPopup"));
const UpdateModal = React.lazy(() => import("../UpdateModal"));
import NotificationCenter from "../NotificationCenter";
const NotebookManager = React.lazy(() => import("../NotebookManager"));
import GlikoSenseIcon from "../GlikoSenseIcon";
import { NavButton } from "./NavButton";
import { useMealPlateStore } from "../../stores/useMealPlateStore";

export function AppLayout({
  children,
  userSettings,
  user,
  lastGlucoseValue,
  changeTab,
  handleLogout,
  toggleTheme,
  tabVariants,
  handleSwipe,
  logs,
  pumpStatus,
  getEffectiveIOB,
  handleAcceptPrivacy,
  handleCloseChangelog,
  setUserSettings,
  mainRef,
  mealProgress
}: any) {
  const {
    theme,
    isShortcutMode,
    isOffline,
    authError,
    isSidebarOpen,
    setIsSidebarOpen,
    activeTab,
    direction,
    showTutorial,
    setShowTutorial,
    showPrivacyPopup,
    showChangelog,
    setShowChangelog,
    showStatusPopup,
    setShowStatusPopup,
    isKeyboardOpen,
    setInitialAction
  } = useAppStore();
  const { t } = useTranslation();
  const sharedPlate = useMealPlateStore((state) => state.plate);

 return (
 <MotionConfig reducedMotion={userSettings?.ecoMode ? "always" : "user"}>
 <div
 className={cn(
 "min-h-[100dvh] flex flex-col transition-colors duration-500 overflow-x-hidden relative z-10",
 isShortcutMode 
 ? "bg-transparent dark:bg-transparent"
 : (userSettings?.glassmorphismEnabled
 ? "bg-transparent dark:bg-transparent"
 : theme === "dark"
 ? "dark bg-[#020617]"
 : "bg-slate-50"),
 )}
 >
 <NotificationListenerSync />
 <RemoteAlertsListener />
 {!isShortcutMode && (
 <MeshBackground
 lastGlucose={lastGlucoseValue}
 isGlassmorphic={userSettings?.glassmorphismEnabled || false}
 />
 )}
 {!isShortcutMode && isOffline && (
 <motion.div
 initial={{ y: -50 }}
 animate={{ y: 0 }}
 className="bg-slate-900/80 dark:bg-slate-950/80 text-white text-[9px] font-black uppercase text-center py-2.5 z-[100] flex items-center justify-center gap-2 sticky top-0 backdrop-blur-xl border-b border-white/5"
 >
 <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
 <span className="tracking-widest">
 
 {t('auto.tryb_offline_funkcje_mogą_być_ogran', { defaultValue: i18n.t('auto.tryb_offline_funkcje_moga', { defaultValue: "Tryb Offline - Funkcje mogą być ograniczone" }) })}
 </span>
 </motion.div>
 )}
 {authError && user && (
 <motion.div
 initial={{ y: -50 }}
 animate={{ y: 0 }}
 className="bg-rose-500/90 text-white text-[9px] font-black uppercase text-center py-2.5 z-[100] flex items-center justify-center gap-2 sticky top-0 backdrop-blur-xl border-b border-white/10"
 >
 <Activity size={12} />
 <span className="tracking-widest">{authError}</span>
 </motion.div>
 )}
 {/* Header */}
 {!isShortcutMode && (
 <header className="bg-white/40 dark:bg-[#020617]/40 backdrop-blur-2xl p-4 sticky top-0 z-40 border-b border-black/5 dark:border-white/5 pt-12 transition-all">
 <div className="flex justify-between items-center max-w-md md:max-w-5xl lg:max-w-7xl mx-auto">
 <div className="flex items-center gap-4">
 <button
 onClick={() => {
 Haptics.medium();
 setIsSidebarOpen(true);
 }}
 className="p-2.5 -ml-2 rounded-2xl bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-transparent dark:border-slate-800 shadow-sm active:scale-90"
 >
 <Menu size={20} strokeWidth={2.5} />
 </button>
 <div
 className="flex items-center gap-3 cursor-pointer group active:scale-95 transition-transform"
 onClick={() => {
 Haptics.selection();
 setShowStatusPopup(true);
 }}
 >
 <Logo className="w-10 h-10 drop-shadow-sm group-hover:rotate-12 transition-transform" />
 <div>
 <p
 onClick={(e) => {
 e.stopPropagation();
 Haptics.medium();
 setShowChangelog(true);
 }}
 title={t('auto.kliknij_aby_zobaczyć_co_nowego', { defaultValue: i18n.t('auto.kliknij_aby_zobaczyc_co_n', { defaultValue: "Kliknij, aby zobaczyć co nowego" }) })}
 className="text-accent-500 hover:text-accent-400 text-[7px] font-black uppercase tracking-[0.2em] mt-1 opacity-90 flex items-center gap-1.5 font-mono cursor-pointer transition-colors hover:scale-105 active:scale-95"
 >
 <span className="w-1.5 h-1.5 rounded-full bg-accent-500 animate-pulse" />
 v{APP_VERSION}
 </p>
 </div>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <React.Suspense fallback={<div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse" />}>
              <NotebookManager />
            </React.Suspense>
 <NotificationCenter userSettings={userSettings} theme={theme} />
 <button
 onClick={() => {
 Haptics.light();
 toggleTheme();
 }}
 className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-accent-400 border border-transparent dark:border-slate-700 transition-all active:scale-90"
 >
 {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
 </button>
 {user && !user.isAnonymous && user.photoURL ? (
 <img
 src={user.photoURL}
 alt="Profile"
 className="w-7 h-7 rounded-full border border-accent-500/50 shadow-sm"
 />
 ) : (
 <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)] ml-2" />
 )}
 </div>
 </div>
 </header>
 )}

 <Sidebar
 isOpen={isSidebarOpen}
 onClose={() => setIsSidebarOpen(false)}
 activeTab={activeTab}
 changeTab={changeTab}
 onAction={(action) => {
 if (action === "tutorial") {
 setShowTutorial(true);
 } else {
 setInitialAction(action);
 }
 }}
 theme={theme}
 isChildMode={userSettings?.childMode}
 settings={userSettings}
 />

 {/* Main Content with Swipe Navigation */}
 <main
 ref={mainRef}
 className="flex-1 max-w-md md:max-w-5xl lg:max-w-7xl mx-auto w-full relative overflow-y-auto touch-pan-y overflow-x-hidden"
 >
 <AnimatePresence mode="wait" custom={direction} initial={false}>
 <motion.div
 key={activeTab}
 custom={direction}
 variants={tabVariants}
 initial="enter"
 animate="center"
 exit="exit"
 transition={{ duration: 0.15, ease: "easeOut" }}
 drag="x"
 dragDirectionLock
 dragConstraints={{ left: 0, right: 0 }}
 dragElastic={0.1}
 onDragEnd={handleSwipe}
 className={cn(
 "w-full min-h-full p-4 pb-32 flex flex-col",
 )}
 >
 {children}
 </motion.div>
 </AnimatePresence>
 </main>
 {/* Navigation */}
 {!isShortcutMode && (
 <nav className={cn(
 "fixed bottom-0 left-0 right-0 glass backdrop-blur-3xl border-t border-white/40 dark:border-white/5 z-50 pb-safe rounded-t-[2.5rem] shadow-2xl transition-all duration-300",
 isKeyboardOpen ? "opacity-0 pointer-events-none translate-y-24" : "opacity-100 translate-y-0"
 )}>
          <div className="max-w-md md:max-w-5xl lg:max-w-7xl mx-auto flex items-center justify-around h-20 px-2 group">
            <NavButton
              active={activeTab === "chart"}
              onClick={() => changeTab("chart")}
              icon={<Activity />}
              label={t("nav.chart")}
              ecoMode={userSettings?.ecoMode}
            />
            <NavButton
              active={activeTab === "dashboard"}
              onClick={() => changeTab("dashboard")}
              icon={<LayoutDashboard />}
              label={t("nav.dashboard")}
              ecoMode={userSettings?.ecoMode}
            />
            {!userSettings?.followerMode && (
              <div className="relative -top-6">
                <motion.button
                  onClick={() => changeTab("meal")}
                  whileTap={{ scale: 0.85 }}
                  animate={{ y: activeTab === "meal" ? -5 : 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  className={cn(
                    "w-16 h-16 rounded-full flex items-center justify-center transition-shadow shadow-xl border-4 border-slate-50 dark:border-slate-950 relative",
                    activeTab === "meal"
                      ? "bg-accent-600 text-white shadow-accent-500/40"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700",
                  )}
                >
                  {mealProgress !== null && (
                    <svg
                      className="absolute inset-0 w-full h-full transform -rotate-90 pointer-events-none"
                      viewBox="0 0 56 56"
                    >
                      <circle
                        cx="28"
                        cy="28"
                        r="26"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="transparent"
                        strokeDasharray="163.36"
                        strokeDashoffset={163.36 * mealProgress}
                        className="text-amber-500 transition-all duration-1000 dark:text-amber-400 opacity-80"
                      />
                    </svg>
                  )}
                  <motion.div
                    animate={{
                      rotate: activeTab === "meal" ? [0, -20, 20, -10, 10, 0] : 0,
                    }}
                    transition={{ duration: 0.5 }}
                    className="z-10"
                  >
                    <Utensils />
                  </motion.div>
                  {sharedPlate.length > 0 && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center border-2 border-slate-50 dark:border-slate-950 shadow-sm z-20"
                    >
                      {sharedPlate.length}
                    </motion.div>
                  )}
                </motion.button>
                <motion.div
                  animate={{
                    opacity: activeTab === "meal" ? 1 : 0.6,
                    y: activeTab === "meal" ? -2 : 0,
                  }}
                  className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] font-black uppercase tracking-widest text-slate-400"
                >
                  {t("nav.plate")}
                </motion.div>
              </div>
            )}
            {!userSettings?.followerMode && (
              <NavButton
                active={activeTab === "assistant"}
                onClick={() => changeTab("assistant")}
                icon={<MessageSquare />}
                label={t("nav.chat")}
                ecoMode={userSettings?.ecoMode}
              />
            )}
            <NavButton
              active={activeTab === "profile"}
              onClick={() => changeTab("profile")}
              icon={<Menu />}
              label={t("nav.more")}
              ecoMode={userSettings?.ecoMode}
            />
          </div>
        </nav>
      )}

 {/* Modals & Popups */}
        <React.Suspense fallback={null}>
          <UpdateModal />
          <Toaster
            position="top-center"
            containerStyle={{ top: 'max(env(safe-area-inset-top), 50px)' }}
            toastOptions={{
              className:
                "glass-card !text-slate-900 dark:!text-white !border-black/5 dark:!border-white/10 !shadow-2xl !rounded-[1.5rem] !text-[10px] !font-black !uppercase !tracking-widest !font-display !pl-6 !pr-2 !py-2 flex items-center justify-between min-w-[300px]",
              duration: 4000,
              success: {
                iconTheme: {
                  primary: "#10b981",
                  secondary: "#fff",
                },
              },
              error: {
                iconTheme: {
                  primary: "#f43f5e",
                  secondary: "#fff",
                },
              },
            }}
          >
            {(toastItem) => (
              <ToastBar toast={toastItem} style={{ padding: 0, background: 'transparent', boxShadow: 'none' }}>
                {({ icon, message }) => (
                  <div className="flex items-center gap-3 w-full">
                    {icon}
                    <div className="flex-1 min-w-0 pr-2">
                      {message}
                    </div>
                    {toastItem.type !== 'loading' && (
                      <button
                        onClick={() => toast.dismiss(toastItem.id)}
                        className="p-2 ml-auto rounded-xl hover:bg-rose-500/10 text-rose-500 transition-colors shrink-0 group flex items-center justify-center hover:scale-110 active:scale-95"
                        aria-label={t('auto.zamknij_powiadomienie', { defaultValue: 'Zamknij powiadomienie' })}
                      >
                        <X size={18} className="drop-shadow-sm group-hover:drop-shadow-md" strokeWidth={2.5} />
                      </button>
                    )}
                  </div>
                )}
              </ToastBar>
            )}
          </Toaster>
          <AnimatePresence>
            {showTutorial && (
              <OnboardingTutorial
                onComplete={async (mode) => {
                  setShowTutorial(false);
                  localStorage.setItem("hasSeenTutorial", "true");
                  localStorage.setItem("treatmentMode", mode); // Fallback offline
                  
                  setUserSettings((prev) => ({ 
                    ...(prev || {}), 
                    treatmentMode: mode 
                  }));

                  if (user) {
                    try {
                      await setDoc(
                        doc(
                          db,
                          "users",
                          getEffectiveUid(user),
                          "settings",
                          "profile",
                        ),
                        { treatmentMode: mode },
                        { merge: true },
                      );
                    } catch (e) {
                      console.error("Failed to save treatmentMode", e);
                    }
                  }
                }}
              />
            )}
            {showPrivacyPopup && <PrivacyPopup onAccept={handleAcceptPrivacy} />}
            {showChangelog && <ChangelogPopup onClose={handleCloseChangelog} />}
          </AnimatePresence>

          <QuickStatusPopup
            isOpen={showStatusPopup}
            onClose={() => setShowStatusPopup(false)}
            lastGlucose={lastGlucoseValue}
            iob={getEffectiveIOB(logs, pumpStatus, userSettings?.dia || 4)}
          />
        </React.Suspense>
      </div>
    </MotionConfig>
  );
}

