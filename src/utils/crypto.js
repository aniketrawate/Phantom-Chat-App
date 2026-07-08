/**
 * crypto.js — Cryptographic Utilities
 *
 * Provides hashing functions used by the P2P connection system.
 * Uses the browser's native Web Crypto API (crypto.subtle) —
 * no external dependencies needed.
 */

/**
 * Hash a shared secret into a deterministic, truncated hex string.
 *
 * This is used to generate PeerJS peer IDs from the user's passphrase.
 * Both users enter the same secret → get the same hash → find each other.
 *
 * Steps:
 *   1. Normalize the input (trim whitespace, lowercase) so that
 *      "MySecret", " mysecret ", and "MYSECRET" all produce the same hash.
 *   2. Encode the string to a Uint8Array (required by Web Crypto API).
 *   3. Compute the SHA-256 digest (returns an ArrayBuffer).
 *   4. Convert the hash bytes to a hex string.
 *   5. Truncate to 40 characters (160 bits) — sufficient for uniqueness
 *      while keeping PeerJS IDs reasonably short.
 *
 * @param   {string} secret - The raw shared secret entered by the user.
 * @returns {Promise<string>} A 40-character hex string derived from the secret.
 */
export async function hashSecret(secret) {
  // Step 1-2: Normalize and encode the secret
  const encoded = new TextEncoder().encode(secret.trim().toLowerCase());

  // Step 3: Compute SHA-256 hash using the browser's native crypto API
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);

  // Step 4: Convert the ArrayBuffer to a hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  // Step 5: Return the first 40 hex characters (160 bits of entropy)
  return hashHex.slice(0, 40);
}