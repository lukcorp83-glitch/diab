import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

import {ErrorBoundary} from './components/ErrorBoundary';
import './i18n';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
