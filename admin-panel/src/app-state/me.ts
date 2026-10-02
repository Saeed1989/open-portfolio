import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../api/client';

/** The query key for `GET /admin/me`, shared by the gate and onboarding. */
export const ME_QUERY_KEY = ['me'] as const;

export const ONBOARDING_PATH = '/onboarding/slug';
export const DASHBOARD_PATH = '/sections';

export function useMe() {
  return useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: ({ signal }) => adminApi.me(signal),
  });
}
