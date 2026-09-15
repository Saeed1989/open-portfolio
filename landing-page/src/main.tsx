import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/globals.css';

const root = createRoot(document.getElementById('root') as HTMLElement);

// Dev-only: import.meta.env.DEV is statically false in production builds,
// so the styleguide and its dynamic import are dropped from the bundle.
if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('styleguide')) {
  const { Styleguide } = await import('./styleguide/Styleguide');
  root.render(
    <StrictMode>
      <Styleguide />
    </StrictMode>,
  );
} else {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
