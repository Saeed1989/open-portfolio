import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router';
import { ONBOARDING_PATH } from './app-state/me';
import { PortfolioGate } from './app-state/PortfolioGate';
import { PublishAttemptedProvider } from './app-state/publish-attempted';
import { DevFields } from './routes/DevFields';
import { OnboardingSlugPage } from './routes/OnboardingSlugPage';
import { SectionEditorPage } from './routes/SectionEditorPage';
import { SectionManagerPage } from './routes/SectionManagerPage';

/*
 * `/sections/:type` is one page for every section type the
 * registry declares — there is no route per type and no component per type.
 *
 * Every route but `/dev/fields` sits behind the portfolio gate (FR-AUTH-7).
 * The dev matrix reads no account, so it is reachable in any state.
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
          <Route
            element={
              <PortfolioGate>
                <Outlet />
              </PortfolioGate>
            }
          >
            <Route path={ONBOARDING_PATH} element={<OnboardingSlugPage />} />
            <Route path="/sections" element={<SectionManagerPage />} />
            <Route path="/sections/:type" element={<SectionEditorPage />} />
            <Route path="*" element={<Navigate to="/sections" replace />} />
          </Route>
        </Routes>
        </BrowserRouter>
      </PublishAttemptedProvider>
    </QueryClientProvider>
  );
}
