import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { PublishAttemptedProvider } from './app-state/publish-attempted';
import { DevFields } from './routes/DevFields';
import { SectionEditorPage } from './routes/SectionEditorPage';
import { SectionIndexPage } from './routes/SectionIndexPage';

/*
 * Three routes. `/sections/:type` is one page for every section type the
 * registry declares — there is no route per type and no component per type.
 *
 * The section manager, sidebar navigation beyond a link list, section
 * reordering, the preview and the publish flow are all out of this milestone.
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
      <PublishAttemptedProvider>
        <BrowserRouter>
        <Routes>
          <Route path="/dev/fields" element={<DevFields />} />
          <Route path="/sections" element={<SectionIndexPage />} />
          <Route path="/sections/:type" element={<SectionEditorPage />} />
          <Route path="*" element={<Navigate to="/sections" replace />} />
        </Routes>
        </BrowserRouter>
      </PublishAttemptedProvider>
    </QueryClientProvider>
  );
}
