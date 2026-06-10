import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

import {ErrorBoundary} from './components/ErrorBoundary';

import { defineCustomElements as jeepSqlite } from 'jeep-sqlite/loader';
jeepSqlite(window);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
