import { toast } from "react-hot-toast";
import { getEffectiveUid, cn } from "../lib/utils";
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import QRCode from "react-qr-code";
import { Html5Qrcode } from "html5-qrcode";
import {
  Share2,
  Download,
  X,
  Copy,
  Check,
  Users,
  Link as LinkIcon,
  Unlink,
  Camera,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { UserSettings } from "../types";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  getDocs,
} from "firebase/firestore";
import { db } from "../lib/firebase";

export default function SettingsSync({
  user,
  settings,
  onImport,
}: {
  user: any;
  settings: UserSettings;
  onImport: (s: UserSettings) => void;
}) {
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [copied, setCopied] = useState(false);
  const [importText, setImportText] = useState("");

  const [linkedUid, setLinkedUid] = useState<string | null>(
    localStorage.getItem("diacontrol_linked_uid"),
  );

  const [qrPayload, setQrPayload] = useState("");
  const [failedAttempts, setFailedAttempts] = useState(
    Number(localStorage.getItem("pairing_failed_attempts") || 0),
  );
  const [isBlocked, setIsBlocked] = useState(false);
  const [groupCount, setGroupCount] = useState<number>(0);

  useEffect(() => {
    const blockUntil = Number(localStorage.getItem("pairing_block_until") || 0);
    if (blockUntil > Date.now()) {
      setIsBlocked(true);
      const remaining = blockUntil - Date.now();
      setTimeout(() => setIsBlocked(false), remaining);
    }
  }, []);

  // Fetch count of paired devices
  useEffect(() => {
    if (user && !linkedUid) {
      const getFollowers = async () => {
        try {
          const reqsRef = collection(
            db,
            "artifacts",
            "diacontrolapp",
            "users",
            user.uid,
            "linkRequests",
          );
          const snap = await getDocs(reqsRef);
          setGroupCount(snap.size + 1); // master + followers
        } catch (e) {
          console.error("Error fetching group count", e);
        }
      };
      getFollowers();
    } else if (linkedUid) {
      // If we are linked, we know there is at least a pair
      setGroupCount(2); // Can't easily know exact count without server fn, but 2+
    }
  }, [user, linkedUid]);

  // Refresh payload when showing export to reset timestamp
  useEffect(() => {
    if (showExport && user) {
      const docRef = doc(
        db,
        "artifacts",
        "diacontrolapp",
        "users",
        getEffectiveUid(user),
      );
      getDoc(docRef).then((d) => {
        let secret = "";
        if (d.exists() && d.data().syncSecret) {
          secret = d.data().syncSecret;
        } else {
          secret = Math.random().toString(36).substring(2, 12);
          setDoc(docRef, { syncSecret: secret }, { merge: true });
        }
        setQrPayload(
          JSON.stringify({
            action: "pair",
            uid: getEffectiveUid(user),
            syncSecret: secret,
            ts: Date.now(),
          }),
        );
      });
    }
  }, [showExport, user, settings]);

  const handleCopy = () => {
    navigator.clipboard.writeText(qrPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUnlink = () => {
    if (
      confirm(
        "Czy na pewno chcesz odłączyć swoje urządzenie i powrócić do swojego pustego profilu?",
      )
    ) {
      localStorage.removeItem("diacontrol_linked_uid");
      window.location.reload();
    }
  };

  const handleImportText = async (textValue?: string) => {
    const now = Date.now();
    const blockUntil = Number(localStorage.getItem("pairing_block_until") || 0);

    if (now < blockUntil) {
      toast(`Przekroczono limit prób. Spróbuj ponownie za chwilę.`);
      return;
    }

    try {
      const parsed = JSON.parse(textValue || importText);

      // Check expiration if timestamp exists
      if (parsed.action === "pair" && parsed.ts) {
        const age = now - parsed.ts;
        if (age > 5 * 60 * 1000) {
          // 5 minutes
          alert(
            "Ten kod parowania wygasł. Wygeneruj nowy kod na drugim urządzeniu.",
          );
          return;
        }
      }

      if (parsed.action === "pair" && parsed.uid) {
        if (parsed.uid === getEffectiveUid(user)) {
          alert("Nie możesz sparować konta ze sobą samym.");
          return;
        }

        if (user && parsed.syncSecret) {
          try {
            await setDoc(
              doc(
                db,
                "artifacts",
                "diacontrolapp",
                "users",
                parsed.uid,
                "linkRequests",
                user.uid,
              ),
              {
                syncSecret: parsed.syncSecret,
                createdAt: serverTimestamp(),
              },
            );
          } catch (err) {
            console.error("Link failed", err);
            throw new Error("Link failed due to invalid code or permissions");
          }
        }

        // SUCCESS
        localStorage.removeItem("pairing_failed_attempts");
        localStorage.removeItem("pairing_block_until");
        localStorage.setItem("diacontrol_linked_uid", parsed.uid);
        alert("Połączono pomyślnie! Aplikacja zostanie przeładowana.");
        window.location.reload();
      } else if (parsed && typeof parsed === "object") {
        // legacy settings import
        onImport(parsed);
        setShowImport(false);
        setImportText("");
        alert("Zaimportowano ustawienia pomyślnie!");
      } else {
        throw new Error("Invalid format");
      }
    } catch (e) {
      const newCount = failedAttempts + 1;
      setFailedAttempts(newCount);
      localStorage.setItem("pairing_failed_attempts", newCount.toString());

      if (newCount >= 5) {
        const lockoutTime = 5 * 60 * 1000; // 5 mins lockout
        localStorage.setItem(
          "pairing_block_until",
          (now + lockoutTime).toString(),
        );
        setIsBlocked(true);
        setTimeout(() => setIsBlocked(false), lockoutTime);
        alert(
          "Zbyt wiele nieudanych prób. Możliwość parowania zablokowana na 5 minut.",
        );
      } else {
        alert(`Nieprawidłowy kod. Pozostało prób: ${5 - newCount}`);
      }
    }
  };

  return (
    <div className="flex flex-col gap-2 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 glass-target">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <Users className="text-accent-500" size={20} />
          <span className="text-xs font-bold dark:text-white">
            Rodzina / Parowanie
          </span>
        </div>
        <div className="flex items-center gap-2">
          {groupCount > 1 && (
            <span className="text-[10px] bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold px-2 py-1 rounded-full flex items-center gap-1">
              👥 {groupCount} osoby
            </span>
          )}
          {linkedUid && (
            <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-1 rounded-full flex items-center gap-1">
              <LinkIcon size={10} /> Sparowano
            </span>
          )}
        </div>
      </div>
      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mb-2">
        Spraw, aby drugi rodzic lub bliska osoba widziała i dodawała dokładnie
        te same dane (Posiłki, Insulina, Cukry dziecka).
      </p>

      {linkedUid ? (
        <button
          onClick={handleUnlink}
          className="w-full bg-rose-50 dark:bg-rose-500/10 text-rose-500 border border-rose-100 dark:border-rose-900 rounded-2xl p-3 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all mt-2"
        >
          <Unlink size={14} /> Odłącz Konto
        </button>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={() => setShowExport(true)}
            className="flex-1 bg-accent-500 text-white rounded-2xl p-3 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
          >
            <Share2 size={14} /> Pokaż QR
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="flex-1 bg-white dark:bg-slate-900 text-accent-500 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
          >
            <Download size={14} /> Zeskanuj QR
          </button>
        </div>
      )}

      {!linkedUid && groupCount > 1 && (
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <label className="flex items-center justify-between cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-2xl group-hover:bg-indigo-500/20 transition-colors">
                <LinkIcon size={16} />
              </div>
              <div className="text-left">
                <h4 className="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight">
                  Blokada terapii (Dziecko)
                </h4>
                <p className="text-[9px] text-slate-500 dark:text-slate-400 font-bold leading-tight">
                  Połączone urządzenia nie będą mogły edytować ustawień terapii.
                </p>
              </div>
            </div>
            <button
              onClick={() =>
                onImport({
                  ...settings,
                  groupTherapyLock: !settings.groupTherapyLock,
                })
              }
              className={cn(
                "w-10 h-6 pl-1 flex-shrink-0 rounded-full flex items-center transition-all bg-slate-300 dark:bg-slate-700",
                settings.groupTherapyLock && "bg-indigo-500 pl-5",
              )}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
            </button>
          </label>
        </div>
      )}

      {createPortal(
        <AnimatePresence>
          {showExport && (
            <motion.div
              initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
              animate={{ opacity: 1, backdropFilter: "blur(4px)" }}
              exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60"
            >
              <motion.div
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-slate-50 dark:bg-slate-900 rounded-[3rem] p-8 pb-12 w-full max-w-sm flex flex-col items-center relative shadow-2xl border border-slate-200 dark:border-slate-800 will-change-transform"
              >
                <button
                  onClick={() => setShowExport(false)}
                  className="absolute top-6 right-6 p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <X size={20} />
                </button>
                <h3 className="text-xl font-black dark:text-white mb-2 self-start">
                  Sparuj Konto
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 self-start">
                  Zeskanuj ten kod na drugim telefonie używając opcji "Zeskanuj
                  QR".
                </p>
                <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100 mb-6 w-full flex justify-center items-center aspect-square">
                  <QRCode
                    value={qrPayload}
                    style={{ width: "100%", height: "100%" }}
                  />
                </div>
                <p className="text-[10px] text-rose-500 font-bold mb-4 animate-pulse">
                  Kod wygaśnie za 5 minut
                </p>
                <button
                  onClick={handleCopy}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-accent-600 text-white rounded-[2rem] font-black text-[12px] uppercase active:scale-95 transition-all shadow-xl"
                >
                  {copied ? (
                    <Check size={16} className="text-emerald-400" />
                  ) : (
                    <Copy size={16} />
                  )}
                  {copied ? "Skopiowano!" : "Kopiuj jako tekst"}
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {createPortal(
        <AnimatePresence>
          {showImport && (
            <motion.div
              initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
              animate={{ opacity: 1, backdropFilter: "blur(4px)" }}
              exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 overflow-y-auto"
            >
              <motion.div
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-slate-50 dark:bg-slate-900 rounded-[3rem] p-8 pb-12 w-full max-w-sm flex flex-col items-center relative shadow-2xl border border-slate-200 dark:border-slate-800 will-change-transform my-auto"
              >
                <button
                  onClick={() => setShowImport(false)}
                  className="absolute top-6 right-6 p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <X size={20} />
                </button>
                <h3 className="text-xl font-black dark:text-white mb-2 self-start">
                  Skaner Parowania
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 self-start">
                  Nakieruj obiektyw na kod QR na pierwszym telefonie.
                </p>

                <div className="w-full rounded-[2rem] overflow-hidden border-2 border-accent-500/30 mb-6 bg-black relative aspect-square shadow-inner">
                  <QrScanner
                    onResult={(res) => {
                      setImportText(res);
                      handleImportText(res);
                    }}
                  />
                </div>

                <div className="w-full">
                  <p className="text-[10px] font-black uppercase text-slate-400 mb-3 pl-2">
                    Albo wklej skopiowany kod tekstowy:
                  </p>
                  <textarea
                    className="w-full h-24 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 flex text-xs outline-none rounded-[2rem] dark:text-white focus:border-accent-500 transition-colors"
                    placeholder="Wklej kod parowania..."
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                  />
                  <button
                    onClick={() => handleImportText()}
                    disabled={isBlocked}
                    className={`w-full mt-4 flex items-center justify-center gap-2 rounded-[2rem] py-4 font-black text-[12px] uppercase tracking-widest transition-all shadow-xl ${isBlocked ? "bg-slate-300 text-slate-500 dark:text-slate-400 cursor-not-allowed" : "bg-accent-600 text-white hover:bg-accent-700 active:scale-95"}`}
                  >
                    {isBlocked ? "Blokada czasowa..." : "Połącz Konta"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}

function QrScanner({ onResult }: { onResult: (res: string) => void }) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameras, setCameras] = useState<any[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [scanner, setScanner] = useState<Html5Qrcode | null>(null);

  useEffect(() => {
    const html5QrCode = new Html5Qrcode("reader-qr");
    setScanner(html5QrCode);

    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Prefer back camera if available
          const backCamera = devices.find(
            (d) =>
              d.label.toLowerCase().includes("back") ||
              d.label.toLowerCase().includes("tył"),
          );
          setSelectedCameraId(backCamera ? backCamera.id : devices[0].id);
          setHasPermission(true);
        } else {
          setHasPermission(false);
        }
      })
      .catch((err) => {
        console.error("Camera permission error", err);
        setHasPermission(false);
      });

    return () => {
      if (html5QrCode.isScanning) {
        html5QrCode.stop().catch((e) => console.error(e));
      }
    };
  }, []);

  useEffect(() => {
    if (scanner && selectedCameraId && !scanner.isScanning) {
      scanner
        .start(
          selectedCameraId,
          {
            fps: 10,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              // Dynamic qrbox - 70% of smaller dimension
              const minDim = Math.min(viewfinderWidth, viewfinderHeight);
              const size = Math.floor(minDim * 0.7);
              return { width: size, height: size };
            },
          },
          (decodedText) => {
            scanner
              .stop()
              .then(() => onResult(decodedText))
              .catch((e) => console.error(e));
          },
          () => {}, // scan error
        )
        .catch((err) => {
          console.error("Scanner start error", err);
        });
    }
  }, [scanner, selectedCameraId]);

  const switchCamera = () => {
    if (!scanner) return;
    const currentIndex = cameras.findIndex((c) => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;

    if (scanner.isScanning) {
      scanner
        .stop()
        .then(() => {
          setSelectedCameraId(cameras[nextIndex].id);
        })
        .catch((e) => console.error(e));
    } else {
      setSelectedCameraId(cameras[nextIndex].id);
    }
  };

  if (hasPermission === false) {
    return (
      <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
        <X className="text-rose-500 mb-2" size={32} />
        <p className="text-[10px] font-bold text-white uppercase tracking-widest">
          Brak dostępu do aparatu
        </p>
        <p className="text-[10px] text-slate-400 mt-2">
          Sprawdź uprawnienia w ustawieniach przeglądarki.
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full group">
      <div id="reader-qr" className="w-full h-full bg-black"></div>

      {/* Overlay UI */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-[70%] aspect-square border-2 border-accent-500 rounded-3xl relative">
          <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-accent-500 -mt-1 -ml-1 rounded-tl-xl"></div>
          <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-accent-500 -mt-1 -mr-1 rounded-tr-xl"></div>
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-accent-500 -mb-1 -ml-1 rounded-bl-xl"></div>
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-accent-500 -mb-1 -mr-1 rounded-br-xl"></div>

          {/* Scanning Line Animation */}
          <motion.div
            animate={{ top: ["0%", "100%", "0%"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="absolute left-0 right-0 h-0.5 bg-accent-500/50 shadow-[0_0_15px_rgba(var(--accent-500),0.5)] z-10"
          />
        </div>
      </div>

      {/* Camera Switch Button */}
      {cameras.length > 1 && (
        <button
          onClick={switchCamera}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 p-3 bg-white/20 backdrop-blur-md rounded-full text-white border border-white/30 hover:bg-white/30 transition-all pointer-events-auto shadow-lg"
        >
          <Camera size={20} />
        </button>
      )}

      {hasPermission === null && (
        <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
          <p className="text-[10px] font-black text-white uppercase tracking-widest animate-pulse">
            Inicjalizacja aparatu...
          </p>
        </div>
      )}
    </div>
  );
}
