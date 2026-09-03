import { UserSettings, ChildPermissions } from '../types';

/**
 * Sprawdza czy bieżące urządzenie ma uprawnienie do wykonania danej akcji.
 * Jeśli ustawienia nie definiują blokady (lub childPermissions nie jest skonfigurowane),
 * akcja jest domyślnie dozwolona.
 */
export function hasChildPermission(
  settings?: UserSettings | null,
  permission?: keyof ChildPermissions
): boolean {
  if (!settings || !settings.childPermissions || !permission) {
    return true; // Brak restrykcji
  }

  // Jeśli użytkownik jest zalogowany jako Admin (telefon rodzica), nie podlega restrykcjom dziecka
  const isLocalAdmin = localStorage.getItem('diacontrol_is_admin') === 'true' || settings.isLinkedAdmin === true;
  if (isLocalAdmin) {
    return true;
  }

  // Sprawdzamy stan konkretnego uprawnienia
  const val = settings.childPermissions[permission];
  return val !== false; // false oznacza jawną blokadę rodzicielską
}

export interface PinRequestOptions {
  title?: string;
  description?: string;
  actionName?: string;
  onSuccess: () => void;
  onCancel?: () => void;
}

/**
 * Wywołuje globalne okno monitu o Kod PIN Rodzica
 */
export function requireParentalAuth(
  settings: UserSettings | null | undefined,
  permission: keyof ChildPermissions,
  options: PinRequestOptions
): void {
  // Jeśli akcja jest dozwolona, natychmiast wykonujemy callback
  if (hasChildPermission(settings, permission)) {
    options.onSuccess();
    return;
  }

  // Jeśli brak PIN-u rodzica, a akcja jest zablokowana, prosimy o kontakt z rodzicem
  const savedPin = settings?.parentalPin || localStorage.getItem('parental_pin_code');
  
  window.dispatchEvent(
    new CustomEvent('request_parental_pin', {
      detail: {
        title: options.title || 'Wymagana Autoryzacja Rodzica 🔒',
        description: options.description || 'Ta funkcja została zablokowana przez Opiekuna. Podaj 4-cyfrowy PIN rodzica, aby kontynuować.',
        actionName: options.actionName,
        savedPin: savedPin || '1234',
        onSuccess: options.onSuccess,
        onCancel: options.onCancel
      }
    })
  );
}
