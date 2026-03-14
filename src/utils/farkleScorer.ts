/**
 * @file src/utils/farkleScorer.ts
 * @description Pure Farkle scoring engine using max-partition stacking.
 */

import { DieFace } from '../types/game';

/**
 * Result of a Farkle scoring evaluation.
 */
export interface ScorerResult {
  score: number;
  isFarkle: boolean;
  combo: string;
  isSixOfAKind: boolean;
  isStraight: boolean;
}

/**
 * Recursively searches for the partition of dice that yields the highest score.
 * Evaluates 6-dice combinations first, then extracts faces one by one to satisfy
 * the max-partition stacking rule.
 *
 * @param counts Array of counts for faces 1-6 (index 0 is unused).
 * @param threeOnesScore Configurable score for three 1s.
 * @param singleOneScore Configurable score for a single 1.
 * @returns The best score and its corresponding combo strings.
 */
function bestPartition(counts: number[], threeOnesScore: number, singleOneScore: number): { score: number; combos: string[] } {
  const totalDice = counts.reduce((a, b) => a + b, 0);
  if (totalDice === 0) return { score: 0, combos: [] };

  // 1. Evaluate 6-dice full-board combos
  if (totalDice === 6) {
    if (counts.slice(1).every(c => c === 1)) {
      return { score: 1500, combos: ["Straight"] };
    }
    if (counts.some(c => c === 6)) {
      return { score: 3000, combos: ["Six of a Kind"] };
    }
    if (counts.filter(c => c === 3).length === 2) {
      return { score: 2500, combos: ["Two Triplets"] };
    }
    if (counts.filter(c => c === 2).length === 3) {
      return { score: 1500, combos: ["Three Pairs"] };
    }
    if (counts.some(c => c === 4) && counts.some(c => c === 2)) {
      return { score: 1500, combos: ["Four of a Kind + Pair"] };
    }
  }

  // 2. Recursive extraction of faces
  // Find the first face that has remaining dice
  let faceToExtract = -1;
  for (let f = 1; f <= 6; f++) {
    if (counts[f] > 0) {
      faceToExtract = f;
      break;
    }
  }

  // Base case: no more dice to extract
  if (faceToExtract === -1) return { score: 0, combos: [] };

  const c = counts[faceToExtract];
  let score = 0;
  const combos: string[] = [];

  // Evaluate the extracted face
  if (c === 5) {
    score = 2000;
    combos.push("Five of a Kind");
  } else if (c === 4) {
    score = 1000;
    combos.push("Four of a Kind");
  } else if (c === 3) {
    score = faceToExtract === 1 ? threeOnesScore : faceToExtract * 100;
    combos.push(`Three ${faceToExtract}s`);
  } else if (c === 2) {
    if (faceToExtract === 1) {
      score = singleOneScore * 2;
      combos.push("Single 1", "Single 1");
    } else if (faceToExtract === 5) {
      score = 50 * 2;
      combos.push("Single 5", "Single 5");
    }
  } else if (c === 1) {
    if (faceToExtract === 1) {
      score = singleOneScore;
      combos.push("Single 1");
    } else if (faceToExtract === 5) {
      score = 50;
      combos.push("Single 5");
    }
  }

  // Prepare remaining counts for recursion
  const remainingCounts = [...counts];
  remainingCounts[faceToExtract] = 0;

  // Recurse on the remaining dice
  const next = bestPartition(remainingCounts, threeOnesScore, singleOneScore);

  return {
    score: score + next.score,
    combos: [...combos, ...next.combos]
  };
}

/**
 * Evaluates an array of die faces and returns the maximum possible Farkle score.
 *
 * @param dice Array of die faces (1-6) to score.
 * @param threeOnesScore Points awarded for Three 1s (default 1000).
 * @param singleOneScore Points awarded for a Single 1 (default 100).
 * @returns A ScorerResult containing the score, Farkle status, and combo details.
 * 
 * @example
 * scoreFarkle([1, 1, 1, 5]); // { score: 1050, isFarkle: false, combo: "Three 1s + Single 5", ... }
 */
export function scoreFarkle(dice: DieFace[], threeOnesScore = 1000, singleOneScore = 100): ScorerResult {
  if (dice.length === 0) {
    return { score: 0, isFarkle: true, combo: "", isSixOfAKind: false, isStraight: false };
  }

  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const face of dice) {
    counts[face]++;
  }

  const { score, combos } = bestPartition(counts, threeOnesScore, singleOneScore);

  const isSixOfAKind = combos.includes("Six of a Kind");
  const isStraight = combos.includes("Straight");
  const isFarkle = score === 0;
  const combo = combos.length > 0 ? combos.join(" + ") : "";

  return {
    score,
    isFarkle,
    combo,
    isSixOfAKind,
    isStraight
  };
}
