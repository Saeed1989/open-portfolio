import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router';
import { ONBOARDING_PATH } from './app-state/me';
import { SIGN_IN_PATH } from './auth/navigation';
import { PortfolioGate } from './app-state/PortfolioGate';
import { PublishAttemptedProvider } from './app-state/publish-attempted';
import { DevFields } from './routes/DevFields';
import { OnboardingSlugPage } from './routes/OnboardingSlugPage';
import { SectionEditorPage } from './routes/SectionEditorPage';
import { SectionManagerPage } from './routes/SectionManagerPage';
import { SignInPage } from './routes/SignInPage';

/*
 * `/sections/:type` is one page for every section type the
 * registry declares — there is no route per type and no component per type.
 *
 * Every route but `/sign-in` and `/dev/fields` sits behind the portfolio gate
 * (FR-AUTH-7). Neither reads an account, so both are reachable in any state.
 *
 * The section manager, sidebar navigation beyond a link list, section
 * reordering, the preview and the publish flow are all out of this milestone.
 */

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      /* A 401 that reaches here has already been through the client's one
         refresh and one retry (FR-AUTH-20). Retrying cannot change that. */
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
          <Route path={SIGN_IN_PATH} element={<SignInPage />} />
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
