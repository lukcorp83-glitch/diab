/**
 * Universal Modal Back Button Stack (LIFO)
 * Zarządza hierarchią otwartych okien modalnych, pop-upów i arkuszy (sheetów).
 * Zapewnia, że naciśnięcie systemowego przycisku Wstecz na Androidzie (lub gestu wstecz)
 * zamyka dokładnie ostatnio otwarty modal zamiast wyłączać aplikację.
 */

export interface ModalEntry {
  id: string;
  closeFn: () => void;
  priority?: number;
}

const modalStack: ModalEntry[] = [];

/**
 * Rejestruje otwarty modal na szczycie stosu
 */
export function pushModal(id: string, closeFn: () => void, priority: number = 0): void {
  // Usuń jeśli już istnieje (uniknięcie duplikatów)
  const existingIdx = modalStack.findIndex(m => m.id === id);
  if (existingIdx >= 0) {
    modalStack.splice(existingIdx, 1);
  }
  
  modalStack.push({ id, closeFn, priority });
}

/**
 * Usuwa modal ze stosu (np. po jego zamknięciu)
 */
export function popModal(id: string): void {
  const idx = modalStack.findIndex(m => m.id === id);
  if (idx >= 0) {
    modalStack.splice(idx, 1);
  }
}

/**
 * Przetwarza naciśnięcie przycisku Wstecz.
 * Zamyka najwyższy modal ze stosu LIFO.
 * Jeśli stos jest pusty, przeszukuje DOM w poszukiwaniu otwartych overlayów.
 * Zwraca `true` jeśli jakiekolwiek okno zostało zamknięte, `false` w przeciwnym razie.
 */
export function handleBackPress(): boolean {
  // 1. Sprawdź zarejestrowane modale na stosie (LIFO)
  if (modalStack.length > 0) {
    // Sortuj wg priorytetu malejąco, zachowując kolejność dodania
    modalStack.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    const topModal = modalStack.pop();
    if (topModal && typeof topModal.closeFn === 'function') {
      try {
        topModal.closeFn();
        return true;
      } catch (e) {
        console.error('Błąd podczas zamykania modalu przez back button:', e);
      }
    }
  }

  // 2. Fallback DOM: Sprawdź czy w DOM istnieje otwarty modal/portal z przyciskiem zamknięcia
  if (typeof document !== 'undefined') {
    // Szukamy otwartych dialogów i stałych overlayów o wysokim z-indexie
    const openModals = document.querySelectorAll(
      'dialog[open], [role="dialog"], [data-modal="true"], .fixed.inset-0.z-\\[99999\\], .fixed.inset-0.z-\\[9999\\], .fixed.inset-0.z-\\[999\\], .fixed.inset-0.z-\\[100\\]'
    );

    if (openModals.length > 0) {
      const topDomModal = openModals[openModals.length - 1];
      
      // Szukaj przycisku zamknięcia wewnątrz tego modalu
      const closeBtn: HTMLButtonElement | null = topDomModal.querySelector(
        'button[data-close], button[aria-label*="close" i], button[aria-label*="zamknij" i], button.btn-close, button:has(svg.lucide-x), button:has(svg[data-lucide="x"])'
      );

      if (closeBtn && typeof closeBtn.click === 'function') {
        closeBtn.click();
        return true;
      }
    }
  }

  return false;
}
