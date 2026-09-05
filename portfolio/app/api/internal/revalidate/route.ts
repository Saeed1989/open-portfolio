import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse, type NextRequest } from 'next/server';
import { portfolioTag } from '@/lib/api';
import { isValidSlug } from '@/lib/tenant';

/**
 * On-demand revalidation, called by the API after a publish (SRS §2.3 step 4,
 * FR-PUB-7).
 *
 * Guarded by a shared secret. This endpoint is excluded from the middleware
 * matcher: it is machine-to-machine and has no tenant of its own.
 *
 * `POST /api/internal/revalidate  { "slug": "alice" }`
 * `Authorization: Bearer <REVALIDATE_SECRET>`
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Length-independent comparison, so a wrong secret leaks no timing signal. */
function secretMatches(provided: string, expected: string): boolean {
  if (provided.length !== expected.length) return false;

  let diff = 0;
  for (let i = 0; i < provided.length; i += 1) {
    diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

function authorised(request: NextRequest): boolean {
  const expected = process.env.REVALIDATE_SECRET;
  /* Unset secret fails closed. An open revalidation endpoint is a free way to
     evict every tenant's cache. */
  if (!expected) return false;

  const header = request.headers.get('authorization') ?? '';
  const provided = header.startsWith('Bearer ') ? header.slice(7) : '';

  return provided.length > 0 && secretMatches(provided, expected);
}

export async function POST(request: NextRequest) {
  if (!authorised(request)) {
    return NextResponse.json({ revalidated: false }, { status: 401 });
  }

  let slug: unknown;
  try {
    slug = (await request.json())?.slug;
  } catch {
    return NextResponse.json(
      { revalidated: false, error: 'Body must be JSON.' },
      { status: 400 },
    );
  }

  if (typeof slug !== 'string' || !isValidSlug(slug)) {
    return NextResponse.json(
      { revalidated: false, error: 'A valid `slug` is required.' },
      { status: 400 },
    );
  }

  /* The tag drops this tenant's cached payload and nothing else — the next
     request for that host reads through to the API. */
  revalidateTag(portfolioTag(slug));

  /* The rendered path, for the case where a future change makes the page
     cacheable as a route. Harmless while rendering is dynamic. */
  revalidatePath('/');

  return NextResponse.json({
    revalidated: true,
    slug,
    revalidatedAt: new Date().toISOString(),
  });
}
