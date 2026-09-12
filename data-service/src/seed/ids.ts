import { Types } from 'mongoose';

/*
 * Every identifier and every date the seed writes, in one file.
 *
 * The seed is deterministic: a test may assert on a seeded id or timestamp,
 * and running the seed twice must leave byte-identical documents. Nothing here
 * may call `new Types.ObjectId()` with no argument, `Date.now()`, `new Date()`
 * with no argument, or any random source.
 *
 * ObjectIds are readable rather than arbitrary: `5eed` marks a seeded row, then
 * eight zero bytes, then two hex digits of kind, two of tenant, and four of
 * sequence.
 *
 *   5eed000000000000 01 01 0001
 *   ^seed            ^  ^  ^sequence within the tenant
 *                    |  ^tenant: 01 alice, 02 bob, 03 carol, 04 dave
 *                    ^kind: 01 user, 02 portfolio, 03 media
 */

const KIND = { user: '01', portfolio: '02', media: '03' } as const;

export const TENANT_NUMBER = {
  alice: '01',
  bob: '02',
  carol: '03',
  dave: '04',
} as const;

export type TenantName = keyof typeof TENANT_NUMBER;

function oid(
  kind: keyof typeof KIND,
  tenant: TenantName,
  sequence = 1,
): Types.ObjectId {
  const seq = sequence.toString(16).padStart(4, '0');
  return new Types.ObjectId(
    `5eed000000000000${KIND[kind]}${TENANT_NUMBER[tenant]}${seq}`,
  );
}

export const userId = (tenant: TenantName) => oid('user', tenant);
export const portfolioId = (tenant: TenantName) => oid('portfolio', tenant);
export const mediaId = (tenant: TenantName, sequence: number) =>
  oid('media', tenant, sequence);

/*
 * Fixed instants. One per event the model records, not one per document, so
 * that the ordering between them is itself assertable: every tenant is created
 * before they sign in, and signs in before they publish.
 */
export const CREATED_AT = new Date('2026-01-15T09:00:00.000Z');
export const UPDATED_AT = new Date('2026-03-02T14:30:00.000Z');
export const LAST_LOGIN_AT = new Date('2026-03-02T14:00:00.000Z');
export const PUBLISHED_AT = new Date('2026-03-02T14:31:00.000Z');
export const UPLOADED_AT = new Date('2026-02-10T11:20:00.000Z');

/** Media URLs point here. No file is uploaded and no storage is touched. */
export const MEDIA_HOST = 'https://placeholder.invalid';
