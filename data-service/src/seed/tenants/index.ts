import type { SeedTenant } from '../tenant';
import { alice } from './alice';
import { bob } from './bob';
import { carol } from './carol';
import { dave } from './dave';
import { saeed } from './saeed';

/** Seed order is fixed, so a failure always reports the same tenant first. */
export const TENANTS: readonly SeedTenant[] = [alice, bob, carol, dave, saeed];

export { alice, bob, carol, dave, saeed };
