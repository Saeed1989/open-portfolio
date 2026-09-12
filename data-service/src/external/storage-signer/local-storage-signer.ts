import { NotImplementedException } from '@nestjs/common';
import { SignedUpload, StorageSigner } from './storage-signer';

/** STORAGE_MODE=local — local development, without an object store. */
export class LocalStorageSigner implements StorageSigner {
  async signUpload(
    storageKey: string,
    mimeType: string,
    bytes: number,
  ): Promise<SignedUpload> {
    throw new NotImplementedException();
  }
}
