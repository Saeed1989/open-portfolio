import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { applyTheme, storedTheme } from './theme';
/* Self-hosted, bundled and served from this app's own origin. No runtime
   request to a font CDN is made — the mock's <link> to fonts.googleapis.com
   is a property of the mock, not of the system. */
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-sans/700.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/ibm-plex-mono/600.css';
import './tokens/tokens.css';

applyTheme(storedTheme());

async function start(): Promise<void> {
  /* Opt-in, never default — see src/mocks/browser.ts.
     With VITE_MOCKS unset, Vite replaces this with `undefined === 'on'` at
     build time, so the branch is statically dead and the dynamic import below
     is dropped rather than shipped as an unreachable chunk. `npm run
     build:mock` produces the one bundle that carries the worker. */
  if (import.meta.env.VITE_MOCKS === 'on') {
    const { startMocks } = await import('./mocks/browser');
    await startMocks();
  }

  const root = document.getElementById('root');
  if (!root) throw new Error('#root is missing from index.html');

  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void start();
