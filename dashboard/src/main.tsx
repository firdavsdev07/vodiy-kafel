import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';
import { wireAuth } from '@/features/auth/session';
import { env } from '@/shared/config/env';
import '@/app/styles.css';

wireAuth();

// Muhit ilova ochilishidan OLDIN tekshiriladi (xato — darhol, aniq matn bilan).
if (import.meta.env.DEV) console.warn(`API: ${env.apiUrl}`);

const root = document.getElementById('root');
if (!root) throw new Error('#root elementi index.html da topilmadi');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
