export interface SignedUpload {
  /** Short-lived URL the browser uploads the file to directly. */
  uploadUrl: string;
  expiresAt: Date;
}

/**
 * Issues short-lived signed upload URLs. The API never proxies file bytes
 * (FR-MED-1). Switching implementations is a change to `STORAGE_MODE`.
 */
export interface StorageSigner {
  signUpload(
    storageKey: string,
    mimeType: string,
    bytes: number,
  ): Promise<SignedUpload>;
}

export const STORAGE_SIGNER = Symbol('StorageSigner');
