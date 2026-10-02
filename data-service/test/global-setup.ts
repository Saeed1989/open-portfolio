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
  process.env.ADMIN_API_KEY = 'e2e-admin-api-key';
  process.env.REVALIDATE_MODE = 'noop';
  process.env.STORAGE_MODE = 'local';

  await mongoose.connect(process.env.MONGODB_URI);
  await seed();
  await mongoose.disconnect();
}
