import { createHash, randomBytes } from 'crypto';

/**
 * Hash a password using SHA-256 with a salt
 */
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const actualSalt = salt || randomBytes(32).toString('hex');
  const hash = createHash('sha256').update(actualSalt + password).digest('hex');
  return { hash: `${actualSalt}:${hash}`, salt: actualSalt };
}

/**
 * Verify a password against a stored hash
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, expectedHash] = storedHash.split(':');
  if (!salt || !expectedHash) return false;
  const actualHash = createHash('sha256').update(salt + password).digest('hex');
  return actualHash === expectedHash;
}

/**
 * Simple token generation for session management
 */
export function generateToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Generate a fingerprint hash from browser data
 */
export function hashFingerprint(components: string[]): string {
  return createHash('sha256').update(components.join('|')).digest('hex');
}

/**
 * Generate a unique random numeric login code (e.g., 0930 9202 8377)
 * Format: 4 groups of 4 digits separated by spaces (16 digits total)
 */
export function generateLoginCode(): string {
  const groups: string[] = [];
  for (let i = 0; i < 4; i++) {
    const num = Math.floor(Math.random() * 10000);
    groups.push(num.toString().padStart(4, '0'));
  }
  return groups.join(' ');
}
