/**
 * @file src/components/Bomb.tsx
 * @description Renders the Standard Bomb countdown overlay that sits on top of a tile on the game board.
 */

import { motion } from 'motion/react';
import type { ActiveBomb } from '../types/game';
import { GAME_CONSTANTS } from '../types/game';

interface Props {
  bomb: ActiveBomb;
  tileSize: number;
}

/**
 * Renders a bomb overlay with a countdown fuse ring and explosion radius hint.
 *
 * @param {Props} props - The component props.
 * @param {ActiveBomb} props.bomb - The active bomb data.
 * @param {number} props.tileSize - The size of each tile in pixels.
 * @returns {JSX.Element} The rendered BombOverlay component.
 */
export default function BombOverlay({ bomb, tileSize }: Props) {
  const gap = 4;
  const padding = 8;
  const left = padding + bomb.col * (tileSize + gap);
  const top = padding + bomb.row * (tileSize + gap);

  let pct = bomb.fuseMs / GAME_CONSTANTS.FUSE_MS;
  pct = Math.max(0, Math.min(1, pct)); // Clamp between 0 and 1

  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - pct);

  const isDanger = bomb.fuseMs < 1000;
  const isCritical = pct < 0.3;

  // Explosion radius hint dimensions (3x3 grid centered on bomb)
  const hintSize = 3 * tileSize + 2 * gap;
  const hintOffset = tileSize + gap;

  return (
    <>
      {/* EXPLOSION RADIUS HINT */}
      {bomb.type === 'STANDARD' && (
        <div
          style={{
            position: 'absolute',
            left: left - hintOffset,
            top: top - hintOffset,
            width: hintSize,
            height: hintSize,
            border: '1px dashed rgba(239, 68, 68, 0.2)',
            borderRadius: '16px',
            pointerEvents: 'none',
            zIndex: 15,
            boxSizing: 'border-box',
          }}
        />
      )}

      {/* BOMB OVERLAY CONTAINER */}
      <div
        style={{
          position: 'absolute',
          left,
          top,
          width: tileSize,
          height: tileSize,
          pointerEvents: 'none',
          zIndex: 20,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* DANGER FLASH */}
        {isDanger && (
          <motion.div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '10px',
              backgroundColor: '#ef4444',
            }}
            animate={{ opacity: [0, 0.4, 0] }}
            transition={{ duration: 0.18, repeat: Infinity }}
          />
        )}

        {/* FUSE COUNTDOWN RING */}
        <svg
          viewBox="0 0 44 44"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            transform: 'rotate(-90deg)',
          }}
        >
          <circle
            cx="22"
            cy="22"
            r={radius}
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="4"
            fill="none"
          />
          <motion.circle
            cx="22"
            cy="22"
            r={radius}
            fill="none"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            animate={{
              strokeDashoffset,
              stroke: isCritical ? ['#ef4444', '#fbbf24', '#ef4444'] : '#ef4444',
            }}
            transition={{
              strokeDashoffset: { duration: 0.1, ease: 'linear' },
              stroke: isCritical ? { duration: 0.25, repeat: Infinity } : {},
            }}
          />
        </svg>

        {/* BOMB ICON + TIMER */}
        <div
          style={{
            position: 'absolute',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2,
          }}
        >
          <div style={{ fontSize: '20px', lineHeight: 1 }}>💣</div>
          <div
            style={{
              color: 'white',
              fontSize: '10px',
              fontWeight: 900,
              marginTop: '2px',
              textShadow: '0 1px 2px rgba(0,0,0,0.8)',
            }}
          >
            {(bomb.fuseMs / 1000).toFixed(1)}s
          </div>
        </div>
      </div>
    </>
  );
}
