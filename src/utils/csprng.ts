/**
 * @file src/utils/csprng.ts
 * @description Provably fair pseudo-random number generator using HMAC-SHA256 and Web Crypto API.
 */

/**
 * Converts a Uint8Array to a hexadecimal string.
 */
function bytesToHex(b: Uint8Array): string {
  return Array.from(b)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Computes the SHA-256 digest of a given string.
 */
async function sha256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBytes = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBytes);
  return bytesToHex(new Uint8Array(hashBuffer));
}

/**
 * Computes the HMAC-SHA256 signature of a given string using the provided key.
 */
async function hmac(key: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyBytes = encoder.encode(key);
  const dataBytes = encoder.encode(data);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, dataBytes);
  return bytesToHex(new Uint8Array(signature));
}

/**
 * Cryptographically Secure Pseudo-Random Number Generator (CSPRNG).
 * Uses HMAC-SHA256 to generate a deterministic sequence of numbers based on a combined seed.
 */
export class CSPRNG {
  private seed: string;
  private counter: number;

  /**
   * Initializes the CSPRNG with a combined seed.
   * @param combinedSeed The SHA-256 hash of the server seed and all client seeds.
   */
  constructor(combinedSeed: string) {
    this.seed = combinedSeed;
    this.counter = 0;
  }

  /**
   * Generates the next random float in the range [0, 1).
   * @returns A uniform random float.
   * @example
   * const float = await rng.nextFloat(); // e.g., 0.428193...
   */
  async nextFloat(): Promise<number> {
    const hashHex = await hmac(this.seed, this.counter.toString());
    this.counter++;
    
    // Take the first 8 hex characters (4 bytes)
    const first8Hex = hashHex.slice(0, 8);
    const uint32 = parseInt(first8Hex, 16);
    
    // Divide by 0xffffffff to get a float in [0, 1)
    return uint32 / 0xffffffff;
  }

  /**
   * Generates the next random integer in the range [min, max] inclusive.
   * @param min The minimum integer value.
   * @param max The maximum integer value.
   * @returns A random integer between min and max.
   * @example
   * const roll = await rng.nextInt(1, 6); // e.g., 4
   */
  async nextInt(min: number, max: number): Promise<number> {
    const float = await this.nextFloat();
    return Math.floor(float * (max - min + 1)) + min;
  }

  /**
   * Generates the next die face (1-6) based on a provided array of probability weights.
   * @param weights An array of 6 numbers summing to 1.0, representing the probability of faces 1-6.
   * @returns A die face value (1, 2, 3, 4, 5, or 6).
   * @example
   * const face = await rng.nextDieFace([0.25, 0.15, 0.15, 0.15, 0.20, 0.10]);
   */
  async nextDieFace(weights: [number, number, number, number, number, number]): Promise<1 | 2 | 3 | 4 | 5 | 6> {
    const float = await this.nextFloat();
    let cumulative = 0;
    
    for (let i = 0; i < 6; i++) {
      cumulative += weights[i];
      if (float < cumulative) {
        return (i + 1) as 1 | 2 | 3 | 4 | 5 | 6;
      }
    }
    
    // Fallback to 6 in case of floating point rounding errors where cumulative doesn't perfectly reach 1.0
    return 6;
  }

  /**
   * Resets the internal counter to 0, restarting the sequence.
   */
  reset(): void {
    this.counter = 0;
  }

  /**
   * Gets the current counter value.
   * @returns The number of random values generated so far.
   */
  getCounter(): number {
    return this.counter;
  }
}

/**
 * Generates a cryptographically secure 32-byte server seed.
 * @returns A 64-character hexadecimal string representing the server seed.
 * @example
 * const serverSeed = await generateServerSeed();
 */
export async function generateServerSeed(): Promise<string> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

/**
 * Hashes the server seed to create a commitment that can be shared with players before the game.
 * @param seed The raw server seed.
 * @returns The SHA-256 hash of the server seed.
 * @example
 * const commitment = await hashServerSeed(serverSeed);
 */
export async function hashServerSeed(seed: string): Promise<string> {
  return await sha256(seed);
}

/**
 * Derives the combined seed from the server seed and an array of client seeds.
 * @param serverSeed The raw server seed.
 * @param clientSeeds An array of client seeds.
 * @returns The SHA-256 hash of the concatenated server and client seeds.
 * @example
 * const combinedSeed = await deriveCombinedSeed(serverSeed, [clientSeed1, clientSeed2]);
 */
export async function deriveCombinedSeed(serverSeed: string, clientSeeds: string[]): Promise<string> {
  const concatenated = serverSeed + clientSeeds.join('');
  return await sha256(concatenated);
}

/**
 * Verifies that a revealed server seed matches the original commitment.
 * Uses a constant-time comparison to prevent timing attacks.
 * @param revealed The revealed server seed.
 * @param commitment The original SHA-256 hash commitment.
 * @returns True if the revealed seed matches the commitment, false otherwise.
 * @example
 * const isValid = await verifyServerSeed(revealedSeed, commitmentHash);
 */
export async function verifyServerSeed(revealed: string, commitment: string): Promise<boolean> {
  const recomputed = await sha256(revealed);
  
  if (recomputed.length !== commitment.length) {
    return false;
  }
  
  let diff = 0;
  for (let i = 0; i < recomputed.length; i++) {
    diff |= recomputed.charCodeAt(i) ^ commitment.charCodeAt(i);
  }
  
  return diff === 0;
}

/**
 * Generates a random client seed.
 * @returns A 32-character hexadecimal string (UUID without hyphens).
 * @example
 * const clientSeed = generateClientSeed();
 */
export function generateClientSeed(): string {
  return crypto.randomUUID().replace(/-/g, '');
}

/**
 * Synchronous Linear Congruential Generator (LCG) fallback.
 * 
 * WARNING: This is NOT cryptographically secure and MUST NEVER be used for
 * casino game events, real-money outcomes, or any context requiring security.
 * It is provided exclusively for non-casino use cases such as Monte Carlo
 * simulations, test suites, or visual grid previews.
 * 
 * @param seed The initial numeric seed.
 * @returns A function that generates the next pseudo-random float in [0, 1).
 * @example
 * const rng = seededRng(12345);
 * const float = rng();
 */
export function seededRng(seed: number): () => number {
  let s = ((seed ^ 0xdeadbeef) >>> 0) || 1;
  return function (): number {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}
