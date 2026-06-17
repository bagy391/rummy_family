/**
 * @module utils/shuffle
 * Cryptographically-secure Fisher-Yates shuffle.
 *
 * Uses `crypto.getRandomValues` which is available in
 * both modern browsers and Deno (globalThis.crypto).
 */

/**
 * Shuffles an array in-place using the Fisher-Yates algorithm
 * with cryptographically random values.
 *
 * @param array - The array to shuffle. Mutated in place.
 * @returns The same array, now shuffled.
 */
export function cryptoShuffle<T>(array: T[]): T[] {
  const { length } = array;
  if (length <= 1) return array;

  // Allocate a buffer for random values
  const randomValues = new Uint32Array(length - 1);
  crypto.getRandomValues(randomValues);

  for (let i = length - 1; i > 0; i--) {
    // Uniform random index in [0, i]
    const j = randomValues[length - 1 - i] % (i + 1);
    // Swap elements
    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }

  return array;
}
