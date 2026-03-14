/**
 * @file src/utils/gridUtils.ts
 * @description Board factory and grid mutation functions for Farkle Frenzy.
 */

import type { Cell, DieFace, GridPos, LobbySettings } from '../types/game';
import { FACE_TO_COLOR, GAME_CONSTANTS } from '../types/game';
import { scoreFarkle } from './farkleScorer';
import { seededRng } from './csprng';
import  nanoid  from 'nanoid';

const BLOCKER_DENSITY_RANGES = {
  LOW: { min: 3, max: 4 },
  MEDIUM: { min: 5, max: 7 },
  HIGH: { min: 8, max: 12 },
};

export const DEFAULT_WEIGHTS: [number, number, number, number, number, number] = [1/6, 1/6, 1/6, 1/6, 1/6, 1/6];

function makeDieCell(face: DieFace): Cell {
  return { id: nanoid(), face, type: FACE_TO_COLOR[face], state: 'NORMAL' };
}

function makeStoneCell(): Cell {
  return { id: nanoid(), face: null, type: 'STONE', state: 'NORMAL', health: GAME_CONSTANTS.STONE_HP };
}

function makeIceCell(face: DieFace): Cell {
  return { id: nanoid(), face, type: 'ICE', state: 'FROZEN' };
}

function makeLockCell(face: DieFace): Cell {
  return { id: nanoid(), face, type: 'LOCK', state: 'LOCKED' };
}

function makeEmptyCell(): Cell {
  return { id: nanoid(), face: null, type: 'NONE', state: 'EMPTY' };
}

function weightedFace(
  rng: () => number,
  weights: [number, number, number, number, number, number] = DEFAULT_WEIGHTS
): DieFace {
  const float = rng();
  let cumulative = 0;
  for (let i = 0; i < 6; i++) {
    cumulative += weights[i];
    if (float < cumulative) return (i + 1) as DieFace;
  }
  return 6;
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function ensurePlayableGrid(
  grid: Cell[][],
  _size: number,
  rng: () => number,
  _weights: [number, number, number, number, number, number]
): Cell[][] {
  if (!hasValidChain(grid)) {
    return recoverDeadBoard(grid, rng, 0);
  }
  return grid;
}

/**
 * Creates a new game grid with randomly placed blockers and die tiles.
 * @param size The width and height of the grid.
 * @param settings Lobby settings containing blockerDensity.
 * @param seedNum The numeric seed for the PRNG.
 * @param weights The probability weights for die faces.
 * @returns A fully initialized 2D array of Cells.
 */
export function createGrid(
  size: number,
  settings: Pick<LobbySettings, 'blockerDensity'>,
  seedNum = Date.now(),
  weights: [number, number, number, number, number, number] = DEFAULT_WEIGHTS
): Cell[][] {
  const rng = seededRng(seedNum);
  const densityRange = BLOCKER_DENSITY_RANGES[settings.blockerDensity];
  const blockerCount = Math.floor(rng() * (densityRange.max - densityRange.min + 1)) + densityRange.min;

  const stoneCount = Math.floor(blockerCount * 0.5);
  const iceCount = Math.floor(blockerCount * 0.25);
  const lockCount = blockerCount - stoneCount - iceCount;

  const grid: Cell[][] = Array.from({ length: size }, () => Array(size).fill(null));

  const candidates: GridPos[] = [];
  for (let r = 1; r <= size - 2; r++) {
    for (let c = 1; c <= size - 2; c++) {
      candidates.push({ row: r, col: c });
    }
  }

  shuffle(candidates, rng);

  const stonePos = candidates.splice(0, stoneCount);
  const icePos = candidates.splice(0, iceCount);
  const lockPos = candidates.splice(0, lockCount);

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const isStone = stonePos.some(p => p.row === r && p.col === c);
      const isIce = icePos.some(p => p.row === r && p.col === c);
      const isLock = lockPos.some(p => p.row === r && p.col === c);

      if (isStone) {
        grid[r][c] = makeStoneCell();
      } else if (isIce) {
        grid[r][c] = makeIceCell(weightedFace(rng, weights));
      } else if (isLock) {
        grid[r][c] = makeLockCell(weightedFace(rng, weights));
      } else {
        grid[r][c] = makeDieCell(weightedFace(rng, weights));
      }
    }
  }

  return ensurePlayableGrid(grid, size, rng, weights);
}

/**
 * Applies gravity to the grid, moving normal die tiles down into empty cells.
 * @param grid The current game grid.
 * @returns An object containing the new grid and a boolean indicating if any tile moved.
 */
export function stepGravity(grid: Cell[][]): { grid: Cell[][], changed: boolean } {
  const newGrid = cloneGrid(grid);
  let changed = false;
  const rows = newGrid.length;
  const cols = newGrid[0].length;

  for (let r = rows - 2; r >= 0; r--) {
    for (let c = 0; c < cols; c++) {
      const cell = newGrid[r][c];
      if (cell.state === 'NORMAL' && isDieTile(cell)) {
        if (newGrid[r + 1][c].state === 'EMPTY') {
          newGrid[r + 1][c] = cell;
          newGrid[r][c] = makeEmptyCell();
          changed = true;
        }
      }
    }
  }
  return { grid: newGrid, changed };
}

/**
 * Checks if any normal die tile has an empty cell directly below it.
 * @param grid The current game grid.
 * @returns True if gravity can still be applied.
 */
export function hasEmptyBelow(grid: Cell[][]): boolean {
  const rows = grid.length;
  const cols = grid[0].length;
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = grid[r][c];
      if (cell.state === 'NORMAL' && isDieTile(cell)) {
        if (grid[r + 1][c].state === 'EMPTY') {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * Spawns new tiles in empty cells on the top row.
 * @param grid The current game grid.
 * @param weights The probability weights for die faces.
 * @param rng The random number generator function.
 * @returns An object containing the new grid and a boolean indicating if any tile spawned.
 */
export function spawnTiles(
  grid: Cell[][],
  weights = DEFAULT_WEIGHTS,
  rng: () => number = Math.random
): { grid: Cell[][], changed: boolean } {
  const newGrid = cloneGrid(grid);
  let changed = false;
  const cols = newGrid[0].length;

  for (let c = 0; c < cols; c++) {
    if (newGrid[0][c].state === 'EMPTY') {
      const newCell = makeDieCell(weightedFace(rng, weights));
      newCell.state = 'SPAWNING';
      newGrid[0][c] = newCell;
      changed = true;
    }
  }
  return { grid: newGrid, changed };
}

/**
 * Converts all SPAWNING cells to NORMAL state.
 * @param grid The current game grid.
 * @returns The updated grid.
 */
export function normalizeTiles(grid: Cell[][]): Cell[][] {
  const newGrid = cloneGrid(grid);
  for (let r = 0; r < newGrid.length; r++) {
    for (let c = 0; c < newGrid[0].length; c++) {
      if (newGrid[r][c].state === 'SPAWNING') {
        newGrid[r][c].state = 'NORMAL';
      }
    }
  }
  return newGrid;
}

/**
 * Applies a Standard Bomb explosion to the grid.
 * @param grid The current game grid.
 * @param bombRow The row index of the bomb.
 * @param bombCol The column index of the bomb.
 * @param isHeadhunter Whether the active player has the Headhunter role.
 * @returns The updated grid, points earned, and affected cell positions.
 */
export function applyStandardBomb(
  grid: Cell[][],
  bombRow: number,
  bombCol: number,
  isHeadhunter = false
): { grid: Cell[][], ptsEarned: number, affected: GridPos[] } {
  const newGrid = cloneGrid(grid);
  let ptsEarned = 0;
  const affected: GridPos[] = [];
  const rows = newGrid.length;
  const cols = newGrid[0].length;
  const radius = GAME_CONSTANTS.BOMB_RADIUS;

  for (let r = Math.max(0, bombRow - radius); r <= Math.min(rows - 1, bombRow + radius); r++) {
    for (let c = Math.max(0, bombCol - radius); c <= Math.min(cols - 1, bombCol + radius); c++) {
      const cell = newGrid[r][c];
      
      if (cell.state === 'LOCKED') continue;

      affected.push({ row: r, col: c });

      if (cell.type === 'STONE') {
        const damage = isHeadhunter ? 2 : 1;
        cell.health = (cell.health ?? GAME_CONSTANTS.STONE_HP) - damage;
        if (cell.health <= 0) {
          newGrid[r][c] = makeEmptyCell();
          ptsEarned += GAME_CONSTANTS.BOMB_STONE_PTS;
        }
      } else if (cell.type === 'ICE' || cell.state === 'FROZEN') {
        newGrid[r][c] = makeEmptyCell();
      } else if (isDieTile(cell)) {
        newGrid[r][c] = makeEmptyCell();
        ptsEarned += GAME_CONSTANTS.BOMB_DIE_PTS;
      }
    }
  }
  return { grid: newGrid, ptsEarned, affected };
}

/**
 * Applies a Rainbow Bomb explosion to the grid.
 * @param grid The current game grid.
 * @param targetColor The color of tiles to destroy.
 * @param settings Lobby settings containing rainbow bomb rewards.
 * @returns The updated grid, points earned, and affected cell positions.
 */
export function applyRainbowBomb(
  grid: Cell[][],
  targetColor: string,
  settings: Pick<LobbySettings, 'rainbowRedReward' | 'rainbowBlueReward'>
): { grid: Cell[][], ptsEarned: number, affected: GridPos[] } {
  const newGrid = cloneGrid(grid);
  let ptsEarned = 0;
  const affected: GridPos[] = [];
  const rows = newGrid.length;
  const cols = newGrid[0].length;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = newGrid[r][c];
      
      if (cell.state === 'LOCKED') continue;
      if (cell.type === 'STONE' || cell.type === 'ICE') continue;
      
      if (cell.type === targetColor) {
        affected.push({ row: r, col: c });
        newGrid[r][c] = makeEmptyCell();
        
        if (targetColor === 'RED') {
          ptsEarned += settings.rainbowRedReward;
        } else if (targetColor === 'BLUE') {
          ptsEarned += settings.rainbowBlueReward;
        }
      }
    }
  }
  return { grid: newGrid, ptsEarned, affected };
}

/**
 * Checks if the grid contains at least one valid scoring chain.
 * @param grid The current game grid.
 * @returns True if a valid chain exists, false otherwise.
 */
export function hasValidChain(grid: Cell[][]): boolean {
  const rows = grid.length;
  const cols = grid[0].length;

  const getNeighbors = (r: number, c: number) => {
    const neighbors: GridPos[] = [];
    if (r > 0) neighbors.push({ row: r - 1, col: c });
    if (r < rows - 1) neighbors.push({ row: r + 1, col: c });
    if (c > 0) neighbors.push({ row: r, col: c - 1 });
    if (c < cols - 1) neighbors.push({ row: r, col: c + 1 });
    return neighbors;
  };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const startCell = grid[r][c];
      if (!isDieTile(startCell)) continue;

      const queue: { path: GridPos[], faces: DieFace[] }[] = [];
      queue.push({ path: [{ row: r, col: c }], faces: [startCell.face as DieFace] });

      while (queue.length > 0) {
        const { path, faces } = queue.shift()!;
        
        if (scoreFarkle(faces).score > 0) {
          return true;
        }

        if (path.length >= GAME_CONSTANTS.MAX_CHAIN) continue;

        const lastPos = path[path.length - 1];
        const neighbors = getNeighbors(lastPos.row, lastPos.col);

        for (const n of neighbors) {
          if (path.some(p => p.row === n.row && p.col === n.col)) continue;
          
          const nCell = grid[n.row][n.col];
          if (nCell.state === 'LOCKED') continue;
          if (!isDieTile(nCell)) continue;

          queue.push({
            path: [...path, n],
            faces: [...faces, nCell.face as DieFace]
          });
        }
      }
    }
  }
  return false;
}

/**
 * Recovers a dead board by rerolling non-blocker tiles.
 * @param grid The current game grid.
 * @param rng The random number generator function.
 * @param attempts The number of recovery attempts made so far.
 * @returns A guaranteed playable grid.
 */
export function recoverDeadBoard(
  grid: Cell[][],
  rng: () => number = Math.random,
  attempts = 0
): Cell[][] {
  const newGrid = cloneGrid(grid);
  const rows = newGrid.length;
  const cols = newGrid[0].length;

  const weights: [number, number, number, number, number, number] = attempts < 2 
    ? [0.25, 0.14, 0.14, 0.06, 0.20, 0.21]
    : [0.35, 0.13, 0.13, 0.04, 0.35, 0.00];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = newGrid[r][c];
      if (cell.type !== 'STONE' && cell.type !== 'ICE' && cell.type !== 'LOCK') {
        const newFace = weightedFace(rng, weights);
        newGrid[r][c] = makeDieCell(newFace);
      }
    }
  }

  if (hasValidChain(newGrid)) {
    return newGrid;
  }

  if (attempts < 3) {
    return recoverDeadBoard(newGrid, rng, attempts + 1);
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = newGrid[r][c];
      if (cell.type !== 'STONE' && cell.type !== 'ICE' && cell.type !== 'LOCK') {
        newGrid[r][c] = makeDieCell(1);
      }
    }
  }
  return newGrid;
}

/**
 * Checks if a cell is a normal die tile.
 * @param cell The cell to check.
 * @returns True if the cell is a die tile.
 */
export function isDieTile(cell: Cell): boolean {
  return cell.face !== null && 
         cell.type !== 'NONE' && 
         cell.type !== 'STONE' && 
         cell.type !== 'ICE' && 
         cell.type !== 'LOCK';
}

/**
 * Creates a deep clone of the grid.
 * @param grid The grid to clone.
 * @returns A new grid with cloned cell objects.
 */
export function cloneGrid(grid: Cell[][]): Cell[][] {
  return grid.map(row => row.map(cell => ({ ...cell })));
}
