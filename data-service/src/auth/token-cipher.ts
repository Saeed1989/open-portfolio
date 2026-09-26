import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { AUTH_CONFIG, type AuthConfig } from './auth.config';

const IV_BYTES = 12;
const TAG_BYTES = 16;

/**
 * AES-256-GCM for the provider token at rest (NFR-SEC-3). The stored value is
 * base64 of `iv ‖ tag ‖ ciphertext`, with a fresh random IV per encryption.
 */
@Injectable()
export class TokenCipher {
  constructor(@Inject(AUTH_CONFIG) private readonly config: AuthConfig) {}

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(
      'aes-256-gcm',
      this.config.tokenEncryptionKey,
      iv,
    );
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString(
      'base64',
    );
  }

  decrypt(stored: string): string {
    const bytes = Buffer.from(stored, 'base64');
    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.config.tokenEncryptionKey,
      bytes.subarray(0, IV_BYTES),
    );
    decipher.setAuthTag(bytes.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));
    return Buffer.concat([
      decipher.update(bytes.subarray(IV_BYTES + TAG_BYTES)),
      decipher.final(),
    ]).toString('utf8');
  }
}
