import React, { useEffect, useState, useRef } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { X, Camera } from "lucide-react";
import { createPortal } from "react-dom";

export default function BarcodeScannerModal({
  onClose,
  onScan,
}: {
  onClose: () => void;
  onScan: (barcode: string) => void;
}) {
  const [cameras, setCameras] = useState<any[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [scanner, setScanner] = useState<Html5Qrcode | null>(null);
  const [error, setError] = useState("");
  const isScanningRef = useRef(false);
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  // Pobieranie kamer i wymuszanie uprawnień
  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length) {
          setCameras(devices);
          const backCamera = devices.find(
            (c) => c.label.toLowerCase().includes("back") || c.label.toLowerCase().includes("environment") || c.label.toLowerCase().includes("tył") || c.label.toLowerCase().includes("0")
          );
          const fallbackCamera = devices.length > 1 ? devices[devices.length - 1] : devices[0];
          setSelectedCameraId(backCamera ? backCamera.id : fallbackCamera.id);
        } else {
          setError("Nie znaleziono żadnego aparatu.");
        }
      })
      .catch((err) => {
        console.error("Camera permission error", err);
        setError("Brak dostępu do aparatu. Upewnij się, że aplikacja ma uprawnienia.");
      });
  }, []);

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

  // Uruchamianie skanera po wybraniu kamery
  useEffect(() => {
    if (!scanner || !selectedCameraId || isScanningRef.current) return;

    let isMounted = true;
    isScanningRef.current = true;

    const startScanner = async () => {
      if (scanner.isScanning) {
        try {
          await scanner.stop();
        } catch (e) {
          console.error("Błąd zatrzymywania starego skanera", e);
        }
      }

      if (!isMounted) return;

      scanner
        .start(
          selectedCameraId,
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
          () => {} // ignoruj błędy klatek
        )
        .catch((err) => {
          console.error("Start failed:", err);
          if (isMounted) setError("Błąd aparatu. Wybierz inny z listy.");
          isScanningRef.current = false;
        });
    };

    startScanner();

    return () => {
      isMounted = false;
      if (scanner.isScanning) {
        isScanningRef.current = false;
        scanner.stop().catch((e) => console.error(e));
      }
    };
  }, [scanner, selectedCameraId]);

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
                  } catch (e) {}
                }
                onClose();
              }}
              className="p-2 bg-white/10 rounded-full hover:bg-white/20 active:scale-95 transition-all"
            >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="bg-rose-500/20 text-rose-300 p-4 rounded-2xl text-center font-bold text-sm">
            {error}
          </div>
        )}

        <div className="bg-black rounded-3xl overflow-hidden relative border-2 border-white/20">
          <div id="barcode-reader" className="w-full" style={{ border: 'none' }}></div>
        </div>

        {cameras.length > 0 && (
          <select
            className="bg-white/10 text-white py-3 px-4 rounded-2xl font-bold w-full appearance-none text-center outline-none"
            value={selectedCameraId}
            onChange={(e) => {
              isScanningRef.current = false; // Reset state before changing camera
              setSelectedCameraId(e.target.value);
            }}
          >
            {cameras.map((c, i) => (
              <option key={c.id} value={c.id} className="text-black">
                {c.label || `Aparat ${i + 1}`}
              </option>
            ))}
          </select>
        )}

        <p className="text-white/50 text-xs text-center px-4 leading-relaxed">
          Z powyższej listy możesz wybrać właściwy aparat. Nakieruj go na kod kreskowy.
        </p>
      </div>
    </div>,
    document.body
  );
}
