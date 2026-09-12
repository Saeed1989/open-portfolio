import mongoose, { type Collection } from 'mongoose';
import { REGISTRY_VERSION } from '@portfolio/registry';
import { AuditLogSchema } from '../schemas/audit-log.schema';
import { IntegrationCacheSchema } from '../schemas/integration-cache.schema';
import { IntegrationConnectionSchema } from '../schemas/integration-connection.schema';
import { LinkHealthSchema } from '../schemas/link-health.schema';
import { MediaSchema } from '../schemas/media.schema';
import { PortfolioSchema } from '../schemas/portfolio.schema';
import { UserSchema } from '../schemas/user.schema';
import {
  CREATED_AT,
  LAST_LOGIN_AT,
  mediaId,
  portfolioId,
  PUBLISHED_AT,
  UPDATED_AT,
  UPLOADED_AT,
  userId,
} from './ids';
import { buildPublishedTree, type SeedTenant } from './tenant';
import { TENANTS } from './tenants';

/*
 * Deterministic seed for local development and for the test suites.
 *
 * Nothing here may be random or clock-dependent: ids, slugs and timestamps are
 * fixed in ids.ts so that a test can assert on a seeded value, and so that
 * running the seed twice leaves the same state rather than a second copy.
 * Every write is an upsert addressed by a fixed `_id`, issued through the raw
 * driver rather than through a Mongoose document. That is deliberate: both
 * `users` and `portfolios` declare `timestamps`, and a Mongoose write would
 * stamp `updatedAt` from the clock on every run, so the second run would
 * differ from the first. The fixtures are already in final stored form, so
 * there is nothing for casting or defaults to add.
 *
 *   npm run seed         upsert; safe to run repeatedly
 *   npm run seed:reset   drop the seven collections, then seed
 *
 * `MONGODB_URI` is required and is not defaulted: seeding the wrong database
 * because a variable was missing is worse than not seeding at all, and a
 * silent fallback to localhost would do exactly that against a developer who
 * had pointed the service at a cluster. The npm scripts load `.env` through
 * Node's own `--env-file`, so the seed targets whatever the service targets.
 */

/** Registered here rather than through Nest DI — this is a plain script. */
const MODELS = {
  users: mongoose.model('User', UserSchema),
  portfolios: mongoose.model('Portfolio', PortfolioSchema),
  media: mongoose.model('Media', MediaSchema),
  integrationConnections: mongoose.model(
    'IntegrationConnection',
    IntegrationConnectionSchema,
  ),
  integrationCache: mongoose.model('IntegrationCache', IntegrationCacheSchema),
  linkHealth: mongoose.model('LinkHealth', LinkHealthSchema),
  auditLog: mongoose.model('AuditLog', AuditLogSchema),
} as const;

type CollectionName = keyof typeof MODELS;

/** An upsert that writes exactly the given fields and nothing implicit. */
async function put(
  collection: Collection,
  _id: mongoose.Types.ObjectId,
  document: Record<string, unknown>,
): Promise<void> {
  await collection.updateOne({ _id }, { $set: document }, { upsert: true });
}

async function seedTenant(tenant: SeedTenant): Promise<void> {
  await put(MODELS.users.collection, userId(tenant.name), {
    provider: tenant.user.provider,
    providerId: tenant.user.providerId,
    email: tenant.user.email,
    displayName: tenant.user.displayName,
    avatarUrl: tenant.user.avatarUrl,
    status: tenant.user.status,
    createdAt: CREATED_AT,
    lastLoginAt: LAST_LOGIN_AT,
  });

  const published = tenant.publish ? buildPublishedTree(tenant.draft) : null;

  await put(MODELS.portfolios.collection, portfolioId(tenant.name), {
    userId: userId(tenant.name),
    slug: tenant.slug,
    slugHistory: [],
    status: tenant.status,
    registryVersion: REGISTRY_VERSION,
    presetId: tenant.presetId,
    draft: tenant.draft,
    published,
    publishedAt: tenant.publish ? PUBLISHED_AT : null,
    version: tenant.version,
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
  });

  for (const asset of tenant.media) {
    await put(MODELS.media.collection, mediaId(tenant.name, asset.sequence), {
      portfolioId: portfolioId(tenant.name),
      storageKey: asset.storageKey,
      url: asset.url,
      mimeType: asset.mimeType,
      bytes: asset.bytes,
      width: asset.width,
      height: asset.height,
      altText: asset.altText,
      uploadedAt: UPLOADED_AT,
    });
  }
}

async function main(): Promise<void> {
  const reset = process.argv.includes('--reset');
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      'MONGODB_URI is not set. The npm scripts read it from .env; ' +
        'pass it inline to target anything else.',
    );
  }

  await mongoose.connect(uri);
  const name = mongoose.connection.name;
  /* Credentials belong in .env, not in a terminal scrollback or a CI log. */
  const shown = uri.replace(/\/\/[^@]*@/, '//***@');
  console.log(`${reset ? 'reset + seed' : 'seed'} -> ${shown} (db: ${name})`);

  if (reset) {
    for (const model of Object.values(MODELS)) {
      /* `drop` throws NamespaceNotFound on a collection that never existed,
         which is the normal state on a fresh database. */
      await model.collection.drop().catch(() => undefined);
    }
    console.log('dropped 7 collections');
  }

  /*
   * Before writing, not after: the unique indexes of §5 are part of what the
   * seed is asserting, and a duplicate slug should fail the seed rather than
   * land and be found later.
   */
  for (const model of Object.values(MODELS)) {
    await model.syncIndexes();
  }

  for (const tenant of TENANTS) {
    await seedTenant(tenant);
    console.log(`  ${tenant.name.padEnd(6)} ${tenant.slug} (${tenant.status})`);
  }

  console.log('\ndocuments per collection');
  for (const collection of Object.keys(MODELS) as CollectionName[]) {
    const count = await MODELS[collection].collection.countDocuments();
    console.log(`  ${collection.padEnd(23)} ${count}`);
  }

  await mongoose.disconnect();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
  void mongoose.disconnect();
});
