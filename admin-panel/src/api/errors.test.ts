import { describe, expect, it } from 'vitest';
import { parseError } from './errors';

const respond = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status });

/* The unwrapped `{ code, message, errors }` shape `api` sends today. */
describe('parseError — api’s coded errors', () => {
  it('tells slug_taken from portfolio_exists by code', async () => {
    const taken = await parseError(
      respond(409, {
        code: 'slug_taken',
        message: 'This slug is taken.',
        errors: [{ path: 'slug', message: 'This slug is taken.' }],
      }),
    );
    expect(taken.kind).toBe('slug_taken');
    expect(taken.fieldErrors('slug')).toHaveLength(1);

    const exists = await parseError(
      respond(409, { code: 'portfolio_exists', message: 'Already has one.' }),
    );
    expect(exists.kind).toBe('portfolio_exists');
  });

  it('keeps the 422 code', async () => {
    const error = await parseError(
      respond(422, { code: 'slug_reserved', message: 'Reserved.', errors: [] }),
    );
    expect(error.kind).toBe('validation');
    expect(error.code).toBe('slug_reserved');
  });

  it('reads 429 as rate_limited', async () => {
    const error = await parseError(
      respond(429, { code: 'rate_limited', message: 'Too many requests.' }),
    );
    expect(error.kind).toBe('rate_limited');
  });
});
