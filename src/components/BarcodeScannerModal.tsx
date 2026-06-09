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
  const isScanningRef = useRef(false);

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

  useEffect(() => {
    if (!scanner || isScanningRef.current) return;

    isScanningRef.current = true;
    scanner
      .start(
        { facingMode },
        {
          fps: 20,
          videoConstraints: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            focusMode: "continuous"
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
               onScan(decodedText);
            });
          }
        },
        () => {
          // Ignorujemy błędy odczytu pojedynczej klatki
        }
      )
      .catch((err) => {
        console.error("Start failed:", err);
        setError("Błąd podczas uruchamiania kamery.");
        isScanningRef.current = false;
      });

    return () => {
      if (scanner.isScanning) {
        isScanningRef.current = false;
        scanner.stop().catch((e) => console.error(e));
      }
    };
  }, [scanner, facingMode]);

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
              onClick={() => {
                if (scanner && scanner.isScanning) {
                  scanner.stop().then(() => {
                    isScanningRef.current = false;
                    setFacingMode(prev => prev === "environment" ? "user" : "environment");
                  });
                } else {
                  setFacingMode(prev => prev === "environment" ? "user" : "environment");
                }
              }}
              className="bg-white/10 text-white py-3 rounded-2xl flex items-center justify-center gap-2 font-bold active:scale-95 transition-all w-full"
            >
              <RefreshCw size={16} /> Zmień aparat
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
