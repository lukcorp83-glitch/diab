import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

import {ErrorBoundary} from './components/ErrorBoundary';
import './i18n';

import { defineCustomElements as jeepSqlite } from 'jeep-sqlite/loader';
import { CapacitorUpdater } from '@capgo/capacitor-updater';

CapacitorUpdater.notifyAppReady();
let basePath = import.meta.env.BASE_URL;
if (basePath === './') {
    basePath = window.location.pathname.endsWith('/') ? window.location.pathname : window.location.pathname + '/';
}

(window as any).Module = {
  locateFile: function(path: string, prefix: string) {
    if (path.endsWith('.wasm')) {
      return basePath + 'assets/' + path;
    }
    return prefix + path;
  }
};

jeepSqlite(window, { resourcesUrl: basePath + 'assets/' });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
