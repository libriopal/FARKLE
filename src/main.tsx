/**
 * @file src/main.tsx
 * @description The React 19 application entry point. Bootstraps the root component.
 */

import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element #root not found in index.html');
}

createRoot(rootElement).render(
  <App />
);
