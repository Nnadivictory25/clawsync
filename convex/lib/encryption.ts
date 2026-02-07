/**
 * Encryption Utilities
 *
 * Placeholder for secret encryption. In production, implement proper
 * AES-256-GCM encryption using SKILL_SECRET_ENCRYPTION_KEY.
 *
 * TODO: Implement before production deployment
 */

export function encrypt(value: string, _key: string): string {
  // Placeholder - implement AES-256-GCM encryption
  // For now, just base64 encode (NOT SECURE)
  return Buffer.from(value).toString('base64');
}

export function decrypt(encryptedValue: string, _key: string): string {
  // Placeholder - implement AES-256-GCM decryption
  // For now, just base64 decode (NOT SECURE)
  return Buffer.from(encryptedValue, 'base64').toString('utf-8');
}
