/**
 * @file src/components/RainbowBomb.tsx
 * @description Renders the Rainbow Bomb overlay with cycling color animation and Rainmaker color picker.
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import type { ActiveBomb, DieColor } from '../types/game';
import { GAME_CONSTANTS } from '../types/game';

const COLORS: DieColor[] = ['RED', 'ORANGE', 'YELLOW', 'GREEN', 'BLUE', 'PURPLE'];
const CYCLE_MS = 300;

const COLOR_HEX: Record<DieColor, string> = {
  RED: '#ef4444',
  ORANGE: '#f97316',
  YELLOW: '#facc15',
  GREEN: '#4ade80',
  BLUE: '#60a5fa',
  PURPLE: '#a855f7',
};

interface Props {
  bomb: ActiveBomb;
  tileSize: number;
  isRainmaker: boolean;
  onColorChosen?: (color: DieColor) => void;
}

/**
 * Renders a Rainbow Bomb overlay that cycles colors.
 * If the player is the Rainmaker, it provides a color picker to lock in a color.
 *
 * @param {Props} props - The component props.
 * @param {ActiveBomb} props.bomb - The active bomb data.
 * @param {number} props.tileSize - The size of each tile in pixels.
 * @param {boolean} props.isRainmaker - Whether the current player is the Rainmaker.
 * @param {(color: DieColor) => void} [props.onColorChosen] - Callback fired when the Rainmaker chooses a color.
 * @returns {JSX.Element} The rendered RainbowBomb component.
 */
export default function RainbowBomb({ bomb, tileSize, isRainmaker, onColorChosen }: Props) {
  const gap = 4;
  const padding = 8;
  const left = padding + bomb.col * (tileSize + gap);
  const top = padding + bomb.row * (tileSize + gap);

  const [cycleIdx, setCycleIdx] = useState(0);
  const [chosen, setChosen] = useState<DieColor | null>(null);

  useEffect(() => {
    if (chosen !== null) return;
    const interval = setInterval(() => {
      setCycleIdx((i) => (i + 1) % COLORS.length);
    }, CYCLE_MS);
    return () => clearInterval(interval);
  }, [chosen]);

  const currentColor = chosen ?? COLORS[cycleIdx];
  const currentHex = COLOR_HEX[currentColor];

  const pct = Math.max(0, Math.min(1, bomb.fuseMs / GAME_CONSTANTS.FUSE_MS));
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - pct);

  function handleChoose(c: DieColor): void {
    if (!isRainmaker) return;
    setChosen(c);
    onColorChosen?.(c);
  }

  return (
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
      {/* CYCLING COLOR OVERLAY */}
      <motion.div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '10px',
          backgroundColor: currentHex,
          opacity: 0.7,
        }}
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: CYCLE_MS / 1000, repeat: Infinity }}
      />

      {/* FUSE RING */}
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
          strokeWidth="3"
          fill="none"
        />
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          stroke={currentHex}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />
      </svg>

      {/* RAINBOW ICON + TIMER */}
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
        <div style={{ fontSize: '20px', lineHeight: 1 }}>🌈</div>
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
        {chosen && (
          <div
            style={{
              color: currentHex,
              fontSize: '9px',
              fontWeight: 'bold',
              marginTop: '2px',
              textShadow: '0 1px 2px rgba(0,0,0,0.8)',
            }}
          >
            {chosen}
          </div>
        )}
      </div>

      {/* RAINMAKER COLOR PICKER */}
      {isRainmaker && chosen === null && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#111118',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '12px',
            padding: '8px',
            width: '168px',
            pointerEvents: 'auto',
            zIndex: 30,
            boxShadow: '0 0 20px rgba(0,0,0,0.8)',
          }}
        >
          <div
            style={{
              fontSize: '9px',
              color: '#71717a',
              textAlign: 'center',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: '6px',
            }}
          >
            CHOOSE COLOR
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '4px',
            }}
          >
            {COLORS.map((color) => (
              <button
                key={color}
                onClick={() => handleChoose(color)}
                style={{
                  backgroundColor: COLOR_HEX[color],
                  width: '100%',
                  height: '24px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'white',
                  fontSize: '9px',
                  fontWeight: 900,
                  pointerEvents: 'auto',
                }}
              >
                {color.charAt(0)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
