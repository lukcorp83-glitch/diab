import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { motion } from "framer-motion";
import { Camera, X } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import i18n from "../../i18n";
import { Capacitor } from '@capacitor/core';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { createPortal } from "react-dom";

export const MealScanner = forwardRef(({ onResult, onCancel }: { onResult: (res: string) => void, onCancel?: () => void }, ref) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [scanner, setScanner] = useState<any>(null);
  const isNative = Capacitor.isNativePlatform();

  const onResultRef = useRef(onResult);
  const onCancelRef = useRef(onCancel);

  useEffect(() => {
    onResultRef.current = onResult;
    onCancelRef.current = onCancel;
  }, [onResult, onCancel]);

  useImperativeHandle(ref, () => ({
    stopScanner: async () => {
      if (isNative) {
        try { await BarcodeScanner.stopScan(); } catch(e) {}
      } else if (scanner && scanner.isScanning) {
        try { await scanner.stop(); } catch(e) {}
      }
    }
  }));

  // Native Platform Logic (Google ML Kit)
  useEffect(() => {
    if (!isNative) return;
    let isActive = true;

    const startNativeScanner = async () => {
      try {
        const status = await BarcodeScanner.checkPermissions();
        if (status.camera !== 'granted') {
          const request = await BarcodeScanner.requestPermissions();
          if (request.camera !== 'granted') {
            if (isActive) setHasPermission(false);
            return;
          }
        }
        
        if (isActive) setHasPermission(true);

        const { barcodes } = await BarcodeScanner.scan();
        
        if (isActive) {
          if (barcodes.length > 0) {
            onResultRef.current(barcodes[0].rawValue);
          } else {
            if (onCancelRef.current) onCancelRef.current();
          }
        }
      } catch (err: any) {
        console.error("ML Kit error:", err);
        if (isActive) {
          if (onCancelRef.current) onCancelRef.current();
        }
      }
    };

    startNativeScanner();

    return () => {
      isActive = false;
    };
  }, [isNative]);

  // Web (PWA) Logic - HTML5Qrcode Init
  useEffect(() => {
    if (isNative) return;
    const html5QrCode = new Html5Qrcode("reader-meal");
    setScanner(html5QrCode);
    setHasPermission(true);

    return () => {
      if (html5QrCode.isScanning) {
        html5QrCode.stop().catch((e) => console.error(e));
      }
    };
  }, [isNative]);

  // Web (PWA) Logic - HTML5Qrcode Start
  useEffect(() => {
    if (isNative) return;
    if (scanner && !scanner.isScanning) {
      const Html5QrcodeObj = Html5Qrcode;
      
      const startWithConfig = (config: any) => {
        scanner.start(
          config,
          { 
            fps: 20,
            videoConstraints: typeof config === 'string' ? undefined : { facingMode: config.facingMode },
          },
          (decodedText: string) => {
            scanner.stop().then(() => onResultRef.current(decodedText)).catch((e: any) => console.error(e));
          },
          () => {}
        ).catch((err: any) => {
          console.error("Scanner start error", err);
          if (config.facingMode) {
            scanner.start({ facingMode: 'environment' }, { fps: 20 }, (txt: string) => { scanner.stop(); onResultRef.current(txt); }, () => {}).catch(console.error);
          }
        });
      };

      Html5QrcodeObj.getCameras().then((devices) => {
        if (devices && devices.length > 0) {
          let selectedCamId = devices[0].id;
          if (facingMode === 'environment') {
            const backCams = devices.filter((d) => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes(i18n.t('auto.tyl', { defaultValue: "tył" })) || d.label.toLowerCase().includes('environment'));
            if (backCams.length > 0) {
              selectedCamId = backCams[backCams.length - 1].id;
            }
          } else {
            const frontCams = devices.filter((d) => d.label.toLowerCase().includes('front') || d.label.toLowerCase().includes(i18n.t('auto.przod', { defaultValue: "przód" })));
            if (frontCams.length > 0) {
              selectedCamId = frontCams[0].id;
            }
          }
          startWithConfig(selectedCamId);
        } else {
          startWithConfig({ facingMode });
        }
      }).catch(() => {
        startWithConfig({ facingMode });
      });
    }
  }, [scanner, facingMode, isNative]);

  const switchCamera = () => {
    if (isNative) return;
    if (!scanner) return;

    if (scanner.isScanning) {
      scanner
        .stop()
        .then(() => {
          setFacingMode(prev => prev === "environment" ? "user" : "environment");
        })
        .catch((e: any) => console.error(e));
    } else {
      setFacingMode(prev => prev === "environment" ? "user" : "environment");
    }
  };

  if (hasPermission === false) {
    return (
      <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
        <X className="text-rose-500 mb-2" size={32} />
        <p className="text-[10px] font-bold text-white uppercase tracking-widest">
          {i18n.t('meal.camera_no_access', { defaultValue: i18n.t('auto.brak_dostepu_do_aparatu', { defaultValue: "Brak dostępu do aparatu" }) })}
        </p>
      </div>
    );
  }

  // Na platformie natywnej nie renderujemy UI wcale, ew. zaledwie tło (przez portal)
  if (isNative) {
    return createPortal(
      <div className="fixed inset-0 pt-safe pb-safe z-[9999] bg-black"></div>,
      document.body
    );
  }

  return (
    <div className="relative w-full h-full">
      <div id="reader-meal" className="w-full h-full bg-black"></div>

      {/* Overlay UI */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-[80%] h-[50%] border-2 border-accent-500 rounded-3xl relative">
          <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-accent-500 -mt-1 -ml-1 rounded-tl-xl"></div>
          <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-accent-500 -mt-1 -mr-1 rounded-tr-xl"></div>
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-accent-500 -mb-1 -ml-1 rounded-bl-xl"></div>
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-accent-500 -mb-1 -mr-1 rounded-br-xl"></div>

          {/* Scanning Line Animation */}
          <motion.div
            animate={{ top: ["0%", "100%", "0%"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="absolute left-0 right-0 h-0.5 bg-accent-500/50 shadow-[0_0_15px_rgba(var(--accent-500),0.5)] z-10"
          />
        </div>
      </div>

      {/* Camera Switch Button */}
      <button
        onClick={switchCamera}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 p-3 bg-white/20 backdrop-blur-md rounded-full text-white border border-white/30 hover:bg-white/30 transition-all pointer-events-auto shadow-lg"
      >
        <Camera size={20} />
      </button>

      {hasPermission === null && (
        <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
          <p className="text-[10px] font-black text-white uppercase tracking-widest animate-pulse">
            {i18n.t('meal.camera_loading', { defaultValue: i18n.t('auto.ladowanie', { defaultValue: "Ładowanie..." }) })}
          </p>
        </div>
      )}
    </div>
  );
});
