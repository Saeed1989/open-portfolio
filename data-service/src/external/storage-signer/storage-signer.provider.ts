import { FactoryProvider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LocalStorageSigner } from './local-storage-signer';
import { STORAGE_SIGNER, StorageSigner } from './storage-signer';

/** Selects the implementation from STORAGE_MODE. */
export const storageSignerProvider: FactoryProvider<StorageSigner> = {
  provide: STORAGE_SIGNER,
  inject: [ConfigService],
  useFactory: (config: ConfigService): StorageSigner => {
    const mode = config.getOrThrow<string>('STORAGE_MODE');
    if (mode === 'local') return new LocalStorageSigner();
    throw new Error(`STORAGE_MODE=${mode} is not implemented`);
  },
};
