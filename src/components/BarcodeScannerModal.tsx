import React, { useEffect, useState } from "react";
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { X, Camera } from "lucide-react";
import { createPortal } from "react-dom";

export default function BarcodeScannerModal({
  onClose,
  onScan,
}: {
  onClose: () => void;
  onScan: (barcode: string) => void;
}) {
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    const startNativeScanner = async () => {
      try {
        const status = await BarcodeScanner.checkPermissions();
        if (status.camera !== 'granted') {
          const request = await BarcodeScanner.requestPermissions();
          if (request.camera !== 'granted') {
            if (isActive) setError("Brak uprawnień do aparatu. Przyznaj je w ustawieniach systemowych.");
            return;
          }
        }

        // Install Google Barcode Scanner Module if not present
        try {
          await BarcodeScanner.installGoogleBarcodeScannerModule();
        } catch (installErr) {
          // ignore error if it's already installed
        }

        // Uruchomienie pełnoekranowego skanera systemowego Google ML Kit (działa w natywnej warstwie nad WebView)
        const { barcodes } = await BarcodeScanner.scan();
        
        if (barcodes.length > 0 && isActive) {
          onScan(barcodes[0].rawValue);
        } else {
          // Anulowano skanowanie (użytkownik kliknął Wstecz)
          if (isActive) onClose();
        }
      } catch (err: any) {
        console.error("ML Kit Barcode Error:", err);
        if (isActive) {
          setError(err.message || "Błąd podczas uruchamiania skanera systemowego.");
        }
      }
    };

    startNativeScanner();

    return () => {
      isActive = false;
    };
  }, [onClose, onScan]);

  if (error) {
    return createPortal(
      <div className="fixed inset-0 z-[9999] bg-black/90 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm flex flex-col gap-4">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <Camera size={20} />
              <span className="font-bold">Skaner Opakowań</span>
            </div>
            <button onClick={onClose} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-all">
              <X size={20} />
            </button>
          </div>
          <div className="bg-rose-500/20 text-rose-300 p-4 rounded-2xl text-center font-bold text-sm">
            {error}
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // W trakcie ładowania natywnego interfejsu renderujemy jedynie tło blokujące WebView,
  // ponieważ interfejs Capacitor ML Kit zostanie narysowany na wierzchu przez system Android.
  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black"></div>,
    document.body
  );
}
