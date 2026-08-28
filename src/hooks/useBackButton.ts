import { useEffect, useId } from 'react';
import { pushModal, popModal } from '../lib/modalStack';

/**
 * Hook automatycznie rejestrujący modal na stosie systemowego przycisku Wstecz (Android / Web).
 * Gdy modal jest otwarty (`isOpen === true`), naciśnięcie Wstecz wywoła `onClose`.
 *
 * @param isOpen Czy modal/arkusz jest aktualnie widoczny
 * @param onClose Funkcja zamykająca modal
 * @param priority Opcjonalny priorytet (wyższy priorytet = zamykany w pierwszej kolejności)
 */
export function useBackButton(isOpen: boolean, onClose: () => void, priority: number = 0) {
  const generatedId = useId();

  useEffect(() => {
    if (!isOpen) return;

    pushModal(generatedId, onClose, priority);

    return () => {
      popModal(generatedId);
    };
  }, [isOpen, onClose, generatedId, priority]);
}
