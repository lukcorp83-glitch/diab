import React, { useEffect, useState, useRef } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { X, Camera, RefreshCw } from "lucide-react";
import { createPortal } from "react-dom";

export default function BarcodeScannerModal({
  onClose,
  onScan,
}: {
  onClose: () => void;
  onScan: (barcode: string) => void;
}) {
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [scanner, setScanner] = useState<Html5Qrcode | null>(null);
  const [error, setError] = useState("");
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  // Inicjalizacja obiektu skanera
  useEffect(() => {
    const html5QrCode = new Html5Qrcode("barcode-reader", {
      formatsToSupport: [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.DATA_MATRIX
      ]
    });
    setScanner(html5QrCode);

    return () => {
      if (html5QrCode.isScanning) {
        html5QrCode.stop().catch((e) => console.error(e));
      }
    };
  }, []);

  // Uruchamianie skanera
  useEffect(() => {
    if (!scanner) return;

    let isMounted = true;
    
    const startScanner = async () => {
      if (scanner.isScanning) {
        try {
          await scanner.stop();
        } catch (e) {
          console.error("Zatrzymanie starego skanera nie powiodło się", e);
        }
      }
      
      if (!isMounted) return;

      scanner.start(
        { facingMode },
        {
          fps: 20,
          videoConstraints: {
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const width = Math.floor(viewfinderWidth * 0.95);
            const height = Math.floor(viewfinderHeight * 0.6);
            return { width, height };
          }
        },
        (decodedText) => {
          if (scanner.isScanning) {
            scanner.stop().catch((e) => console.error(e)).finally(() => {
               if (onScanRef.current) onScanRef.current(decodedText);
            });
          }
        },
        () => {
          // Ignoruj bledy z pojedynczych klatek
        }
      ).catch((err) => {
        console.error("Start failed:", err);
        if (isMounted) setError("Błąd aparatu. Prawdopodobnie zablokowany przez inną aplikację lub brak uprawnień.");
      });
    };

    startScanner();

    return () => {
      isMounted = false;
    };
  }, [scanner, facingMode]);

  const switchCamera = () => {
    setFacingMode(prev => prev === "environment" ? "user" : "environment");
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/90 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm flex flex-col gap-4">
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <Camera size={20} />
            <span className="font-bold">Skaner Opakowań</span>
          </div>
            <button
              onClick={async () => {
                if (scanner && scanner.isScanning) {
                  try {
                    await scanner.stop();
                  } catch (e) {
                    console.error(e);
                  }
                }
                onClose();
              }}
              className="p-2 bg-white/10 rounded-full hover:bg-white/20 active:scale-95 transition-all"
            >
            <X size={20} />
          </button>
        </div>

        {error ? (
          <div className="bg-rose-500/20 text-rose-300 p-4 rounded-2xl text-center font-bold text-sm">
            {error}
          </div>
        ) : (
          <>
            <div className="bg-black rounded-3xl overflow-hidden relative border-2 border-white/20">
              <div id="barcode-reader" className="w-full" style={{ border: 'none' }}></div>
            </div>

            <button
              onClick={switchCamera}
              className="bg-white/10 text-white py-3 rounded-2xl flex items-center justify-center gap-2 font-bold active:scale-95 transition-all w-full"
            >
              <RefreshCw size={16} /> Zmień na aparat {facingMode === "environment" ? "przedni" : "tylny"}
            </button>

            <p className="text-white/50 text-xs text-center px-4 leading-relaxed">
              Nakieruj aparat na kod kreskowy lub kod QR na opakowaniu leku/sprzętu. Skanowanie nastąpi automatycznie.
            </p>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
