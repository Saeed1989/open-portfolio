import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { DASHBOARD_PATH, ONBOARDING_PATH, useMe } from './me';

/**
 * FR-AUTH-7: a tenant with no portfolio is sent to the creation screen from
 * every route, and a tenant with one is sent away from it. `GET /admin/me`
 * decides, and is read once per load.
 */
export function PortfolioGate({ children }: { children: ReactNode }) {
  const me = useMe();
  const { pathname } = useLocation();

  if (me.isPending) return null;
  if (me.isError) {
    return (
      <main className="p-8 font-sans text-[13px] text-danger" role="alert">
        Could not load your account. {me.error.message}
      </main>
    );
  }

  const onboarding = pathname === ONBOARDING_PATH;
  if (me.data.portfolio === null && !onboarding) {
    return <Navigate to={ONBOARDING_PATH} replace />;
  }
  if (me.data.portfolio !== null && onboarding) {
    return <Navigate to={DASHBOARD_PATH} replace />;
  }
  return children;
}
