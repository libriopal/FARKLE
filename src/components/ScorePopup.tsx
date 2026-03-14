/**
 * @file src/components/ScorePopup.tsx
 * @description Renders a floating score animation that rises from a tile position and fades out.
 */

import { motion } from 'motion/react';
import type { ScorePopup as PopupType } from '../types/game';

interface Props {
  popup: PopupType;
  gridSize: number;
  tileSize: number;
  onDone: () => void;
}

const COLOR_MAP: Record<string, string> = {
  green: '#86efac',
  red: '#f87171',
  gold: '#fcd34d',
};

/**
 * A floating score animation that rises from a tile position and fades out.
 *
 * @param {Props} props - The component props.
 * @param {PopupType} props.popup - The popup data containing score, label, color, row, and col.
 * @param {number} props.gridSize - The size of the grid (number of rows/cols).
 * @param {number} props.tileSize - The size of each tile in pixels.
 * @param {() => void} props.onDone - Callback fired when the animation completes to remove the popup.
 * @returns {JSX.Element} The rendered ScorePopup component.
 */
export default function ScorePopup({ popup, gridSize, tileSize, onDone }: Props) {
  const gap = 4;
  const left = popup.col * (tileSize + gap) + tileSize / 2 + 8;
  const top = popup.row * (tileSize + gap);

  const color = COLOR_MAP[popup.color] || '#ffffff';

  return (
    <motion.div
      initial={{ opacity: 1, y: 0, scale: 1 }}
      animate={{ opacity: 0, y: -56, scale: 1.15 }}
      transition={{ duration: 0.75, ease: 'easeOut' }}
      onAnimationComplete={onDone}
      style={{
        position: 'absolute',
        left,
        top,
        color,
        pointerEvents: 'none',
        zIndex: 40,
        fontWeight: 'bold',
        fontSize: '13px',
        whiteSpace: 'nowrap',
        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))',
        transform: 'translateX(-50%)', // Center horizontally over the tile
      }}
    >
      {popup.score > 0 ? `+${popup.score.toLocaleString()} ${popup.label}` : popup.label}
    </motion.div>
  );
}
