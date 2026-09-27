import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';
import { exposeToConsole } from './state';

/*
 * Started only when VITE_MOCKS is on. It is never started by default: the
 * stopping condition includes `GET /admin/me` resolving through `edge` against
 * a real `api`, and a worker that intercepts by default would make that pass
 * without ever leaving the browser.
 */
export async function startMocks(): Promise<void> {
  const worker = setupWorker(...handlers);
  await worker.start({
    quiet: true,
    /* Anything this app does not mock is a real request. A 404 from the
       handlers would be indistinguishable from a route that does not exist. */
    onUnhandledRequest: 'bypass',
  });
  exposeToConsole();
}
