import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from './firebase';
import { getEffectiveUid } from './utils';
import { Haptics } from './haptics';
import { toast } from 'react-hot-toast';
import i18n from '../i18n';
import { Medication } from '../types';

/**
 * Zapisuje fakt zażycia leku, odejmuje dawkę ze stanu magazynowego apteczki
 * i synchronizuje dane w chmurze (Firestore) oraz pamięci lokalnej.
 */
export async function recordMedicationTaken(medicationId: string, customPills?: number): Promise<boolean> {
  try {
    const user = auth.currentUser;
    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Zapisz w pamięci lokalnej (dla natychmiastowej reakcji UI widgetów)
    try {
      const saved = localStorage.getItem('glikosense_taken_meds');
      const takenMeds = saved ? JSON.parse(saved) : {};
      takenMeds[medicationId] = todayStr;
      localStorage.setItem('glikosense_taken_meds', JSON.stringify(takenMeds));
    } catch (e) {
      console.warn('[MedicationManager] Błąd zapisu lokalnego taken_meds:', e);
    }

    // 2. Jeśli użytkownik jest zalogowany, zaktualizuj stan magazynowy w Firestore
    if (user) {
      const uid = getEffectiveUid(user);
      const settingsRef = doc(db, 'users', uid, 'settings', 'profile');
      const snap = await getDoc(settingsRef);

      if (snap.exists()) {
        const data = snap.data();
        const meds: Medication[] = data.medications || [];
        const targetMed = meds.find(m => m.id === medicationId);

        if (targetMed) {
          const pillsToDeduct = customPills !== undefined ? customPills : (targetMed.pillsPerDose || 1);
          let newStock = targetMed.stockQuantity;

          if (typeof targetMed.stockQuantity === 'number') {
            newStock = Math.max(0, targetMed.stockQuantity - pillsToDeduct);
          }

          const updatedMeds = meds.map(m => 
            m.id === medicationId 
              ? { ...m, ...(newStock !== undefined ? { stockQuantity: newStock } : {}) } 
              : m
          );

          await setDoc(settingsRef, { medications: updatedMeds }, { merge: true });

          // Wywołaj wibrację sukcesu
          Haptics.success().catch(() => {});

          // Powiadomienie Toast
          toast.success(
            `${i18n.t('auto.zazyto_lek', { defaultValue: 'Zażyto' })}: ${targetMed.name}` +
            (newStock !== undefined ? ` (Zostało: ${newStock} szt.)` : ''),
            { id: `med-taken-${medicationId}`, icon: '💊' }
          );

          // Emituj globalne zdarzenie do odświeżenia widżetów w aplikacji
          window.dispatchEvent(new CustomEvent('medication-taken', { 
            detail: { medicationId, newStock, date: todayStr } 
          }));

          return true;
        }
      }
    }

    // Jeśli brak user lub brak w Firestore, wyemituj chociaż lokalny event
    Haptics.success().catch(() => {});
    window.dispatchEvent(new CustomEvent('medication-taken', { 
      detail: { medicationId, date: todayStr } 
    }));
    return true;
  } catch (error) {
    console.error('[MedicationManager] Błąd podczas oznaczania zażycia leku:', error);
    toast.error(i18n.t('auto.blad_zapisu_leku', { defaultValue: 'Nie udało się zapisać zażycia leku' }));
    return false;
  }
}
