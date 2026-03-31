/**
 * @file src/components/Grid.tsx
 * @description The game board container that wires useChain to tiles, renders the score preview banner, farkle shake animation, bomb overlays, and score popups.
 */

import { useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import type {
  Cell,
  GridPos,
  ScorePopup as PopupType,
  LobbySettings,
  RallyRole,
  DieFace
} from '../types/game';
import { GAME_CONSTANTS } from '../types/game';
import { scoreFarkle } from '../utils/farkleScorer';
import { useChain } from '../hooks/useChain';
import Tile from './Tile';
import ScorePopup from './ScorePopup';


interface GridProps {
  grid: Cell[][];
  popups: PopupType[];
  disabled: boolean;
  settings: LobbySettings;
  multiplierStep: number;
  onCommitChain: (chain: GridPos[], role?: RallyRole) => void;
  onRemovePopup: (id: string) => void;
  playerRole?: RallyRole;
  isFarkleAnim?: boolean;
  isDark?: boolean;
}

/**
 * Renders the main game grid, handling pointer events for chaining,
 * displaying tiles, bombs, and score popups.
 */
export default function Grid({
  grid,
  popups,
  disabled,
  onCommitChain,
  onRemovePopup,
  playerRole,
  isFarkleAnim,
  isDark = true
}: GridProps) {
  const size = grid.length;
  const tileSize = Math.min(78, Math.floor((window.innerWidth - 40) / size));

  const { chain, startChain, handleEnter, endChain } = useChain({
    grid,
    disabled,
    onCommit: useCallback(
      (c: GridPos[]) => onCommitChain(c, playerRole),
      [onCommitChain, playerRole]
    ),
  });

  const previewResult = useMemo(() => {
    if (chain.length === 0) return null;
    const faces = chain
      .map(p => grid[p.row][p.col]?.face)
      .filter((f): f is DieFace => f !== null);
    return scoreFarkle(faces);
  }, [chain, grid]);

  const isAtCap = chain.length >= GAME_CONSTANTS.MAX_CHAIN;
  const chainSet = new Set(chain.map(p => `${p.row},${p.col}`));

  return (
    <div style={{ position: 'relative', userSelect: 'none', touchAction: 'none' }}>
      {/* Score preview banner — only when chain.length > 0 */}
      {chain.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: -36,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: 14,
            fontWeight: 'bold',
            zIndex: 30,
            color: previewResult?.isFarkle ? '#f87171' : '#fcd34d'
          }}
        >
          {previewResult?.isFarkle
            ? '⚠ FARKLE'
            : previewResult?.score && previewResult.score > 0
            ? `${previewResult.combo} = ${previewResult.score}`
            : 'Select dice...'}
        </div>
      )}

      {/* Farkle shake wrapper */}
      <motion.div
        animate={
          isFarkleAnim
            ? {
                x: [0, -12, 12, -10, 8, -6, 4, -2, 0],
                transition: { duration: 0.5 }
              }
            : {}
        }
      >
        {/* Board */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${size}, ${tileSize}px)`,
            gap: '8px',
            padding: '6px',
            backgroundColor: typeof document !== 'undefined' &&
              document.documentElement.getAttribute('data-theme') === 'light'
              ? 'rgba(176,196,212,0.95)'
              : 'rgba(10,10,15,0.95)',
            borderRadius: '16px',
            border: typeof document !== 'undefined' &&
              document.documentElement.getAttribute('data-theme') === 'light'
              ? '1px solid rgba(0,0,0,0.08)'
              : '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 0 40px rgba(0,0,0,0.8), inset 0 0 20px rgba(0,0,0,0.5)',
          }}
          onPointerLeave={endChain}
          onPointerUp={endChain}
        >
          {grid.map((row, r) =>
            row.map((cell, c) => {
              const key = `${r},${c}`;
              const idx = chain.findIndex(p => p.row === r && p.col === c);
              return (
                <div key={cell.id} style={{ width: tileSize, height: tileSize }}>
                  <Tile
                    cell={cell}
                    row={r}
                    col={c}
                    isChained={chainSet.has(key)}
                    chainIndex={idx}
                    isAtCap={isAtCap && !chainSet.has(key)}
                    isDark={isDark}
                    onPointerDown={startChain}
                    onPointerEnter={handleEnter}
                    onPointerUp={endChain}
                  />
                </div>
              );
            })
          )}
        </div>
      </motion.div>

      {/* Bomb overlays */}
      

      {/* Score popups */}
      {popups.map(popup => (
        <ScorePopup
          key={popup.id}
          popup={popup}
          
          tileSize={tileSize}
          onDone={() => onRemovePopup(popup.id)}
        />
      ))}
    </div>
  );
}
