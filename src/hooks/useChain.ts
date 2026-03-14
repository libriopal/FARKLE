/**
 * @file src/hooks/useChain.ts
 * @description React hook for capturing pointer drag events to build a scoring chain.
 */

import { useCallback, useRef, useState } from 'react';
import type { GridPos, Cell } from '../types/game';
import { GAME_CONSTANTS } from '../types/game';
import { isDieTile } from '../utils/gridUtils';

interface UseChainOptions {
  grid: Cell[][];
  onCommit: (chain: GridPos[]) => void;
  disabled?: boolean;
}

/**
 * Hook that manages the player's pointer input to build a chain of dice.
 * Enforces adjacency, backtracking, max chain length, and valid tile types.
 *
 * @param options Configuration options including the current grid, commit callback, and disabled state.
 * @returns An object containing the current chain, drag state, and pointer event handlers.
 *
 * @example
 * const { chain, startChain, handleEnter, endChain } = useChain({
 *   grid: currentGrid,
 *   onCommit: (completedChain) => processChain(completedChain),
 *   disabled: phase !== 'CHAINING'
 * });
 */
export function useChain({ grid, onCommit, disabled = false }: UseChainOptions) {
  const [chain, setChain] = useState<GridPos[]>([]);
  const isDragging = useRef<boolean>(false);

  const isAdjacent = (a: GridPos, b: GridPos): boolean => {
    return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
  };

  const chainable = (cell: Cell): boolean => {
    return isDieTile(cell) && cell.state !== 'EMPTY' && cell.state !== 'LOCKED';
  };

  const startChain = useCallback(
    (e: React.PointerEvent, row: number, col: number) => {
      if (disabled) return;

      // CRITICAL: Release pointer capture to allow cross-tile dragging on touch devices
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);

      // Ensure the starting cell is valid for chaining
      if (!chainable(grid[row][col])) return;

      isDragging.current = true;
      setChain([{ row, col }]);
    },
    [grid, disabled]
  );

  const handleEnter = useCallback(
    (row: number, col: number) => {
      if (!isDragging.current || disabled) return;

      setChain((prev) => {
        if (prev.length === 0) return prev;

        const last = prev[prev.length - 1];
        const secondLast = prev.length >= 2 ? prev[prev.length - 2] : undefined;

        // BACKTRACK: If entering the second-to-last cell, remove the last cell
        if (secondLast && secondLast.row === row && secondLast.col === col) {
          return prev.slice(0, -1);
        }

        // ALREADY IN CHAIN: Ignore if the cell is already part of the chain
        if (prev.some((p) => p.row === row && p.col === col)) {
          return prev;
        }

        // ADJACENCY: Must be exactly 1 step away (no diagonals)
        if (!isAdjacent(last, { row, col })) {
          return prev;
        }

        // CHAINABLE: Must be a valid die tile (not empty, not locked, not stone/ice)
        if (!chainable(grid[row][col])) {
          return prev;
        }

        // CAP: Enforce maximum chain length
        if (prev.length >= GAME_CONSTANTS.MAX_CHAIN) {
          return prev;
        }

        // Add the new cell to the chain
        return [...prev, { row, col }];
      });
    },
    [grid, disabled]
  );

  const endChain = useCallback(() => {
    if (!isDragging.current) return;

    isDragging.current = false;
    setChain((prev) => {
      if (prev.length > 0) {
        onCommit(prev);
      }
      return [];
    });
  }, [onCommit]);

  const cancelChain = useCallback(() => {
    isDragging.current = false;
    setChain([]);
  }, []);

  return {
    chain,
    isDragging: isDragging.current,
    startChain,
    handleEnter,
    endChain,
    cancelChain,
  };
}
