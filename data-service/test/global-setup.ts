import { randomBytes } from 'node:crypto';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { seed } from '../src/seed/seed';

/*
 * One throwaway MongoDB per run, seeded by the real seeder. The environment
 * is set here, before any worker imports AppModule, so ConfigModule never
 * falls back to the MONGODB_URI in .env.
 */
export default async function globalSetup(): Promise<void> {
  const mongod = await MongoMemoryServer.create();
  (globalThis as { __MONGOD__?: MongoMemoryServer }).__MONGOD__ = mongod;

  process.env.MONGODB_URI = mongod.getUri('portfolio-e2e');
  process.env.GOOGLE_CLIENT_ID = 'e2e-client.apps.googleusercontent.com';
  process.env.GOOGLE_CLIENT_SECRET = 'e2e-client-secret';
  process.env.GOOGLE_REDIRECT_URI =
    'https://admin.openfolio.test/api/auth/google/callback';
  /* Test keys, minted per run. Two entries, so the previous-kid path exists. */
  process.env.AUTH_JWT_KEYS = JSON.stringify({
    current: randomBytes(32).toString('base64url'),
    previous: randomBytes(32).toString('base64url'),
  });
  process.env.AUTH_JWT_CURRENT_KID = 'current';
  process.env.REVALIDATE_MODE = 'noop';
  process.env.STORAGE_MODE = 'local';

  await mongoose.connect(process.env.MONGODB_URI);
  await seed();
  await mongoose.disconnect();
}
