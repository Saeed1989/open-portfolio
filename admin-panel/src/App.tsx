import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { DevFields } from './routes/DevFields';

/*
 * M0 has one route. The shell navigation, the section editors, the preview and
 * the publish flow are all explicitly out of this milestone, so there is
 * nothing here to route between yet and no layout to hang them in.
 */

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      /* A 401 means the session is gone (FR-AUTH-11) and `edge` answered
         before the admin surface was reached. Retrying cannot change that. */
      retry: (failureCount, error) =>
        failureCount < 2 &&
        !(error instanceof Error && error.name === 'AdminError'),
      refetchOnWindowFocus: false,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/dev/fields" element={<DevFields />} />
          <Route path="*" element={<Navigate to="/dev/fields" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
