/**
 * @file src/utils/chainIndex.ts
 * @description Pre-computes a lookup table mapping every possible Farkle
 * chain combination to its score. Provides O(1) score lookups and a
 * validity bitmap for fast dead-board detection.
 */

import type { DieFace } from '../types/game';

/**
 * The total number of entries in the lookup table.
 * 6 length slots (1 to 6) × 46656 combinations per slot = 279,936.
 */
export const CHAIN_INDEX_SIZE = 279936;

/**
 * Encodes a face array into a lookup table index using a base-6 scheme
 * with a length prefix to prevent collisions.
 * 
 * @param faces  Array of die face values (1-6). Length 1-6.
 * @param length Optional override; defaults to faces.length.
 * @returns      Integer index in range [0, CHAIN_INDEX_SIZE).
 * 
 * @example
 * encode([1,1,1,5]) // Returns 140112
 */
export function encode(faces: DieFace[], length: number = faces.length): number {
  let base6 = 0;
  // Calculate the base-6 value for the given faces
  for (let i = 0; i < length; i++) {
    // Subtract 1 from face to map 1-6 to 0-5
    base6 += (faces[i] - 1) * Math.pow(6, 5 - i);
  }
  // Add the length prefix offset (each length slot is 46656 entries)
  return (length - 1) * 46656 + base6;
}

/**
 * Decodes a lookup table index back to the original face array.
 * 
 * @param index  Integer produced by encode().
 * @returns      Object with faces array and chain length.
 * 
 * @example
 * decode(140112) // Returns { faces: [1,1,1,5], length: 4 }
 */
export function decode(index: number): { faces: DieFace[]; length: number } {
  // Determine the length slot (0-indexed, so add 1)
  const length = Math.floor(index / 46656) + 1;
  // Extract the base-6 portion
  let base6 = index % 46656;
  
  const faces: DieFace[] = [];
  
  // Reconstruct the faces array by extracting base-6 digits
  for (let i = 0; i < length; i++) {
    const power = Math.pow(6, 5 - i);
    const faceVal = Math.floor(base6 / power);
    faces.push((faceVal + 1) as DieFace);
    base6 %= power;
  }
  
  return { faces, length };
}

/**
 * Internal scoring function used ONLY for building the lookup table.
 * Implements max-partition Farkle rules.
 * 
 * @param dice Array of die faces (1-6)
 * @param threeOnesScore Configurable score for three 1s
 * @param singleOneScore Configurable score for a single 1
 * @returns The score, or 0 if Farkled
 */
function internalScoreFarkle(dice: DieFace[], threeOnesScore: number, singleOneScore: number): number {
  if (dice.length === 0) return 0;
  
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const face of dice) {
    counts[face]++;
  }

  // 1. Evaluate 6-dice full-board combos
  if (dice.length === 6) {
    if (counts.slice(1).every(c => c === 1)) return 1500; // Straight
    if (counts.some(c => c === 6)) return 3000; // Six of a Kind
    if (counts.filter(c => c === 3).length === 2) return 2500; // Two Triplets
    if (counts.filter(c => c === 2).length === 3) return 1500; // Three Pairs
    if (counts.some(c => c === 4) && counts.some(c => c === 2)) return 1500; // Four of a Kind + Pair
  }

  // 2. Standard partition
  let score = 0;
  for (let f = 1; f <= 6; f++) {
    const c = counts[f];
    if (c === 0) continue;

    if (c === 5) {
      score += 2000;
    } else if (c === 4) {
      score += 1000;
    } else if (c === 3) {
      score += f === 1 ? threeOnesScore : f * 100;
    } else if (c === 2) {
      if (f === 1) score += singleOneScore * 2;
      else if (f === 5) score += 50 * 2;
      else return 0; // Leftover die
    } else if (c === 1) {
      if (f === 1) score += singleOneScore;
      else if (f === 5) score += 50;
      else return 0; // Leftover die
    }
  }

  return score;
}

/**
 * Builds the complete 279,936-entry score lookup table by iterating
 * every valid index, decoding it to faces, and calling the internal scorer.
 * 
 * @param threeOnesScore  Points for Three 1s (default 1000).
 * @param singleOneScore  Points for a Single 1 (default 100).
 * @returns               Int32Array of length CHAIN_INDEX_SIZE.
 * 
 * @example
 * const table = buildScoreTable(1000, 100);
 */
export function buildScoreTable(threeOnesScore: number = 1000, singleOneScore: number = 100): Int32Array {
  const table = new Int32Array(CHAIN_INDEX_SIZE);
  
  for (let i = 0; i < CHAIN_INDEX_SIZE; i++) {
    const length = Math.floor(i / 46656) + 1;
    const base6 = i % 46656;
    
    // Check if this index represents a valid combination for its length.
    // For length L, the lower (6 - L) base-6 digits must be 0.
    const power = Math.pow(6, 6 - length);
    if (base6 % power !== 0) {
      table[i] = 0;
      continue;
    }
    
    const { faces } = decode(i);
    table[i] = internalScoreFarkle(faces, threeOnesScore, singleOneScore);
  }
  
  return table;
}

/**
 * Builds a validity bitmap from a score table. Entry is 1 if
 * table[i] > 0, else 0. Used for fast dead-board detection.
 * 
 * @param table  Score table produced by buildScoreTable().
 * @returns      Uint8Array of length CHAIN_INDEX_SIZE.
 * 
 * @example
 * const bitmap = buildValidBitmap(table);
 */
export function buildValidBitmap(table: Int32Array): Uint8Array {
  const bitmap = new Uint8Array(CHAIN_INDEX_SIZE);
  
  for (let i = 0; i < CHAIN_INDEX_SIZE; i++) {
    bitmap[i] = table[i] > 0 ? 1 : 0;
  }
  
  return bitmap;
}

/**
 * O(1) score lookup for a chain of faces.
 * 
 * @param faces  Array of die face values (1-6). Length 1-6.
 * @param table  Score table produced by buildScoreTable().
 * @returns      Score for this chain, or 0 if Farkled.
 * 
 * @example
 * lookupScore([1,1,1,5], table) // Returns 1050
 */
export function lookupScore(faces: DieFace[], table: Int32Array): number {
  if (faces.length === 0 || faces.length > 6) return 0;
  const index = encode(faces);
  return table[index] || 0;
}
