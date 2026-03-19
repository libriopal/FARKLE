/**
 * @file src/utils/gridUtils.ts
 * @description Board factory and grid mutation functions for Farkle Frenzy.
 */

import type { Cell, DieFace, GridPos, LobbySettings } from '../types/game';
import { FACE_TO_COLOR, GAME_CONSTANTS } from '../types/game';
import { lookupScore, buildScoreTable } from './chainIndex';
import { seededRng } from './csprng';
import { nanoid }  from 'nanoid';

/** Lazily-built score table for dead-board detection. */
let _scanTable: Int32Array | null = null;
function getScanTable(): Int32Array {
  if (!_scanTable) _scanTable = buildScoreTable();
  return _scanTable;
}

/**
 * Provably fair tile spawn pool using the Deuces Wild model.
 * Pool contains equal counts of each face value (poolSize/6 of each).
 * Tiles are drawn in strict shuffle order. Pool reshuffles when depleted.
 * All players in a session draw from the same global pool instance.
 *
 * Pool sizes by player count:
 *   1P → 60  (7×7 grid, 10 of each face)
 *   2P → 66  (8×8 grid, 11 of each face)
 *   3P → 84  (9×9 grid, 14 of each face)
 *   4P → 102 (10×10 grid, 17 of each face)
 *
 * Formula: size = 6 + playerCount
 *          poolSize = ceil(size² / 6) × 6
 */
export class SpawnPool {
  private pool: DieFace[];
  private idx: number;
  private rng: () => number;

  /**
   * Creates a new SpawnPool for the given player count.
   * @param playerCount Number of players (1-4).
   * @param rng Synchronous RNG function for shuffling.
   */
  constructor(playerCount: number, rng: () => number) {
    this.rng = rng;
    const size = 6 + playerCount;
    const poolSize = Math.ceil((size * size) / 6) * 6;
    const perFace = poolSize / 6;
    this.pool = [];
    for (let f = 1; f <= 6; f++) {
      for (let n = 0; n < perFace; n++) {
        this.pool.push(f as DieFace);
      }
    }
    this.idx = 0;
    this.reshuffle();
  }

  /**
   * Draws the next tile from the pool.
   * Reshuffles automatically when the pool is depleted.
   * @returns The next DieFace value.
   */
  draw(): DieFace {
    if (this.idx >= this.pool.length) {
      this.reshuffle();
    }
    return this.pool[this.idx++];
  }

  /**
   * Fisher-Yates shuffle of the entire pool using the stored rng.
   * Resets the draw index to 0.
   */
  reshuffle(): void {
    for (let i = this.pool.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [this.pool[i], this.pool[j]] = [this.pool[j], this.pool[i]];
    }
    this.idx = 0;
  }

  /**
   * Returns the number of tiles remaining before the next reshuffle.
   * @returns Remaining tile count.
   */
  remaining(): number {
    return this.pool.length - this.idx;
  }
}

const BLOCKER_DENSITY_RANGES = {
  LOW: { min: 3, max: 4 },
  MEDIUM: { min: 5, max: 7 },
  HIGH: { min: 8, max: 12 },
};

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

function shuffle<T>(arr: T[], rng: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Creates a new game grid with randomly placed blockers and die tiles.
 * @param size The width and height of the grid.
 * @param settings Lobby settings containing blockerDensity.
 * @param pool The SpawnPool to draw tiles from.
 * @param seedNum The numeric seed for the PRNG.
 * @returns A fully initialized 2D array of Cells.
 */
export function createGrid(
  size: number,
  settings: Pick<LobbySettings, 'blockerDensity'>,
  pool: SpawnPool,
  seedNum = Date.now()
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
        grid[r][c] = makeIceCell(pool.draw());
      } else if (isLock) {
        grid[r][c] = makeLockCell(pool.draw());
      } else {
        grid[r][c] = makeDieCell(pool.draw());
      }
    }
  }

  return grid;
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
      if (cell.state === 'NORMAL' && (isDieTile(cell) || cell.type === 'BOMB_STANDARD' || cell.type === 'BOMB_RAINBOW')) {
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
 * @param pool The SpawnPool to draw tiles from.
 * @returns An object containing the new grid and a boolean indicating if any tile spawned.
 */
export function spawnTiles(
  grid: Cell[][],
  pool: SpawnPool
): { grid: Cell[][], changed: boolean } {
  const newGrid = cloneGrid(grid);
  let changed = false;
  const cols = newGrid[0].length;

  for (let c = 0; c < cols; c++) {
    if (newGrid[0][c].state === 'EMPTY') {
      if (newGrid[0][c].type === 'BOMB_STANDARD' || newGrid[0][c].type === 'BOMB_RAINBOW') {
        continue;
      }
      const newCell = makeDieCell(pool.draw());
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
 * @param multiplier The current multiplier.
 * @param rainbowRedReward The base reward for red tiles.
 * @param rainbowBlueReward The base reward for blue tiles.
 * @returns The updated grid, points earned, and affected cell positions.
 */
export function applyRainbowBomb(
  grid: Cell[][],
  targetColor: string,
  multiplier: number,
  rainbowRedReward: number,
  rainbowBlueReward: number
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
          ptsEarned += rainbowRedReward * multiplier;
        } else if (targetColor === 'BLUE') {
          ptsEarned += rainbowBlueReward * multiplier;
        }
      }
    }
  }
  return { grid: newGrid, ptsEarned, affected };
}

/**
 * Damages Stone Blockers adjacent (4-directional) to any cell in the chain.
 * Called after a scoring chain is cleared. Does not affect cells inside
 * the chain itself — only their neighbors.
 * Lock Blockers are immune. Ice Blockers are immune (bomb-only).
 *
 * @param grid The current game grid (already has chain cells cleared).
 * @param chain The GridPos array of the committed chain.
 * @param isHeadhunter If true, deals 2 damage instead of 1 (destroys in 1 hit).
 * @returns The updated grid.
 */
export function damageAdjacentBlockers(
  grid: Cell[][],
  chain: GridPos[],
  isHeadhunter = false
): Cell[][] {
  const g = cloneGrid(grid);
  const rows = g.length;
  const cols = g[0].length;
  const dirs = [
    { dr: -1, dc: 0 }, { dr: 1, dc: 0 },
    { dr: 0, dc: -1 }, { dr: 0, dc: 1 }
  ];
  const chainSet = new Set(chain.map(p => `${p.row},${p.col}`));

  for (const pos of chain) {
    for (const { dr, dc } of dirs) {
      const nr = pos.row + dr;
      const nc = pos.col + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      if (chainSet.has(`${nr},${nc}`)) continue; // skip chain cells
      const cell = g[nr][nc];
      if (cell.type !== 'STONE') continue; // only Stone takes adjacent damage
      const damage = isHeadhunter ? 2 : 1;
      const newHealth = Math.max(0, (cell.health ?? 2) - damage);
      if (newHealth === 0) {
        g[nr][nc] = { id: cell.id, face: null, type: 'NONE', state: 'EMPTY' };
      } else {
        g[nr][nc] = { ...cell, health: newHealth };
      }
    }
  }
  return g;
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
        
        if (lookupScore(faces, getScanTable()) > 0) {
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
 * Checks if a cell is a normal die tile.
 * @param cell The cell to check.
 * @returns True if the cell is a die tile.
 */
export function isDieTile(cell: Cell): boolean {
  return cell.face !== null && 
         cell.type !== 'NONE' && 
         cell.type !== 'STONE' && 
         cell.type !== 'ICE' && 
         cell.type !== 'LOCK' &&
         cell.type !== 'BOMB_STANDARD' &&
         cell.type !== 'BOMB_RAINBOW';
}

/**
 * Creates a deep clone of the grid.
 * @param grid The grid to clone.
 * @returns A new grid with cloned cell objects.
 */
export function cloneGrid(grid: Cell[][]): Cell[][] {
  return grid.map(row => row.map(cell => ({ ...cell })));
}
