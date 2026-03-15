/**
 * @file src/components/Grid.tsx
 * @description The game board container that wires useChain to tiles, renders the score preview banner, farkle shake animation, bomb overlays, and score popups.
 */

import { useCallback } from 'react';
import { motion } from 'motion/react';
import type {
  Cell,
  GridPos,
  ScorePopup as PopupType,
  ActiveBomb,
  LobbySettings,
  RallyRole,
  DieFace
} from '../types/game';
import { GAME_CONSTANTS } from '../types/game';
import { scoreFarkle } from '../utils/farkleScorer';
import { useChain } from '../hooks/useChain';
import Tile from './Tile';
import ScorePopup from './ScorePopup';

import BombOverlay from './Bomb';

interface GridProps {
  grid: Cell[][];
  activeBombs: ActiveBomb[];
  popups: PopupType[];
  disabled: boolean;
  settings: LobbySettings;
  multiplierStep: number;
  onCommitChain: (chain: GridPos[], role?: RallyRole) => void;
  onRemovePopup: (id: string) => void;
  playerRole?: RallyRole;
  isFarkleAnim?: boolean;
}

/**
 * Renders the main game grid, handling pointer events for chaining,
 * displaying tiles, bombs, and score popups.
 */
export default function Grid({
  grid,
  activeBombs,
  popups,
  disabled,
  settings,
  multiplierStep,
  onCommitChain,
  onRemovePopup,
  playerRole,
  isFarkleAnim
}: GridProps) {
  const size = grid.length;
  const tileSize = Math.min(82, Math.floor((window.innerWidth - 32) / size));

  const { chain, startChain, handleEnter, endChain } = useChain({
    grid,
    disabled,
    onCommit: useCallback(
      (c: GridPos[]) => onCommitChain(c, playerRole),
      [onCommitChain, playerRole]
    ),
  });

  let previewResult = null;
  if (chain.length > 0) {
    const faces = chain
      .map(p => grid[p.row][p.col].face)
      .filter((f): f is DieFace => f !== null);
    previewResult = scoreFarkle(faces, settings.threeOnesScore, settings.singleOneScore);
  }

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
            gap: '10px',
            padding: '8px',
            backgroundColor: 'rgba(10,10,15,0.9)',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.08)',
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
                    chainLength={chain.length}
                    isAtCap={isAtCap && !chainSet.has(key)}
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
      {activeBombs.map(bomb => (
        <BombOverlay key={bomb.id} bomb={bomb} tileSize={tileSize} />
      ))}

      {/* Score popups */}
      {popups.map(popup => (
        <ScorePopup
          key={popup.id}
          popup={popup}
          gridSize={size}
          tileSize={tileSize}
          onDone={() => onRemovePopup(popup.id)}
        />
      ))}
    </div>
  );
}
