/**
 * @file src/utils/floodFill.ts
 * @description Connected-group detection utility using iterative DFS.
 */

import type { Cell, GridPos } from '../types/game';
import { isDieTile } from './gridUtils';

/**
 * Finds all cells connected to a starting cell that share the same type.
 * Uses an iterative Depth-First Search (DFS) with 4-directional adjacency.
 *
 * @param grid The 2D array of cells representing the game board.
 * @param startRow The row index of the starting cell.
 * @param startCol The column index of the starting cell.
 * @returns An array of GridPos objects representing all connected matching cells.
 *          Returns an empty array if the starting cell is not a die tile.
 *
 * @example
 * const group = getConnectedGroup(grid, 2, 3);
 * // Returns: [{row: 2, col: 3}, {row: 2, col: 4}, {row: 3, col: 3}]
 */
export function getConnectedGroup(
  grid: Cell[][],
  startRow: number,
  startCol: number
): GridPos[] {
  const rows = grid.length;
  if (rows === 0) return [];
  const cols = grid[0].length;

  // Boundary check
  if (startRow < 0 || startRow >= rows || startCol < 0 || startCol >= cols) {
    return [];
  }

  const startCell = grid[startRow][startCol];

  // Only process valid die tiles
  if (!isDieTile(startCell)) {
    return [];
  }

  const targetType = startCell.type;
  const visited = new Set<string>();
  const stack: GridPos[] = [];
  const group: GridPos[] = [];

  // Initialize DFS
  stack.push({ row: startRow, col: startCol });
  visited.add(`${startRow},${startCol}`);

  // 4-directional offsets: Up, Down, Left, Right
  const directions = [
    { dr: -1, dc: 0 },
    { dr: 1, dc: 0 },
    { dr: 0, dc: -1 },
    { dr: 0, dc: 1 },
  ];

  while (stack.length > 0) {
    // We know stack is not empty here, so pop() will return a GridPos
    const current = stack.pop() as GridPos;
    group.push(current);

    for (const { dr, dc } of directions) {
      const nextRow = current.row + dr;
      const nextCol = current.col + dc;
      const key = `${nextRow},${nextCol}`;

      // Check boundaries
      if (nextRow >= 0 && nextRow < rows && nextCol >= 0 && nextCol < cols) {
        // Check if already visited
        if (!visited.has(key)) {
          const nextCell = grid[nextRow][nextCol];
          
          // Check if it's a matching die tile
          if (isDieTile(nextCell) && nextCell.type === targetType) {
            visited.add(key);
            stack.push({ row: nextRow, col: nextCol });
          }
        }
      }
    }
  }

  return group;
}
