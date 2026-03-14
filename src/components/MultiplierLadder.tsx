/**
 * @file src/components/MultiplierLadder.tsx
 * @description Renders the multiplier ladder progress strip showing the 6 steps from ×1.0 to ×4.0.
 */

import { motion } from 'motion/react';
import { MULTIPLIER_LADDER } from '../types/game';

interface MultiplierLadderProps {
  step: number;
  compact?: boolean;
}

const COLORS = [
  '#71717a', // Step 0: zinc/grey
  '#60a5fa', // Step 1: blue
  '#4ade80', // Step 2: green
  '#facc15', // Step 3: yellow
  '#f97316', // Step 4: orange
  '#ef4444'  // Step 5: red
];

const GLOWS = [
  '0 0 8px #71717a',
  '0 0 8px #60a5fa, 0 0 16px #3b82f644',
  '0 0 8px #4ade80, 0 0 16px #22c55e44',
  '0 0 8px #facc15, 0 0 16px #eab30844',
  '0 0 10px #f97316, 0 0 20px #ea580c44',
  '0 0 12px #ef4444, 0 0 24px #dc262644, 0 0 4px #fff'
];

/**
 * Renders the multiplier ladder progress strip.
 *
 * @param {MultiplierLadderProps} props - The component props.
 * @param {number} props.step - Current index into MULTIPLIER_LADDER (0-5).
 * @param {boolean} [props.compact=false] - True to render a smaller version for player cards.
 * @returns {JSX.Element} The rendered multiplier ladder component.
 *
 * @example
 * <MultiplierLadder step={2} compact={false} />
 */
export default function MultiplierLadder({ step, compact = false }: MultiplierLadderProps) {
  const dotSize = compact ? 8 : 16;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: compact ? '4px' : '16px' }}>
      {MULTIPLIER_LADDER.map((mult, i) => {
        const isActive = i === step;
        const isPassed = i < step;
        const isFuture = i > step;

        const backgroundColor = isFuture ? '#1a1a2e' : COLORS[i];
        const opacity = isFuture ? 0.4 : 1;
        const boxShadow = isActive ? GLOWS[i] : (isPassed ? `0 0 4px ${COLORS[i]}` : 'none');
        const border = isActive ? '2px solid white' : 'none';

        return (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <motion.div
              style={{
                width: dotSize,
                height: dotSize,
                borderRadius: '50%',
                backgroundColor,
                opacity,
                boxShadow,
                border,
                boxSizing: 'border-box'
              }}
              animate={isActive ? { scale: [1, 1.4, 1] } : { scale: 1 }}
              transition={isActive ? { duration: 0.5, repeat: Infinity, repeatDelay: 1.0 } : {}}
            />
            {!compact && (
              <div
                style={{
                  marginTop: '8px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: isActive ? '#ffffff' : '#52525b',
                  userSelect: 'none'
                }}
              >
                ×{mult % 1 === 0 ? mult.toFixed(1) : mult}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
