/**
 * @file src/components/BankButton.tsx
 * @description Renders the pulsing bank action button with at-risk score display.
 */

import { motion, AnimatePresence } from 'motion/react';
import { getMultiplier } from '../types/game';

interface BankButtonProps {
  unbanked: number;
  banked: number;
  multiplierStep: number;
  onBank: () => void;
  disabled: boolean;
}

/**
 * Renders the Bank button and the current banked/unbanked scores.
 * 
 * @param {BankButtonProps} props - The component props.
 * @param {number} props.unbanked - The current at-risk score.
 * @param {number} props.banked - The safely banked score.
 * @param {number} props.multiplierStep - The current multiplier step index.
 * @param {() => void} props.onBank - Callback fired when the bank button is clicked.
 * @param {boolean} props.disabled - Whether the bank action is currently disabled.
 * @returns {JSX.Element} The rendered BankButton component.
 * 
 * @example
 * <BankButton
 *   unbanked={1500}
 *   banked={5000}
 *   multiplierStep={2}
 *   onBank={() => console.log('Banked!')}
 *   disabled={false}
 * />
 */
export default function BankButton({
  unbanked,
  banked,
  multiplierStep,
  onBank,
  disabled
}: BankButtonProps) {
  const hasUnbanked = unbanked > 0;
  const isActive = hasUnbanked && !disabled;
  const mult = getMultiplier(multiplierStep);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
      {/* BANKED SCORE */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#71717a' }}>
          BANKED
        </div>
        <motion.div
          key={banked}
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1.12, 1] }}
          transition={{ duration: 0.3 }}
          style={{ fontSize: '32px', fontWeight: 'bold', color: '#ffffff' }}
        >
          {banked.toLocaleString()}
        </motion.div>
      </div>

      {/* AT-RISK SECTION */}
      <AnimatePresence>
        {hasUnbanked && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
          >
            <div style={{ fontSize: '12px', textTransform: 'uppercase', color: '#f59e0b' }}>
              AT RISK
            </div>
            <motion.div
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.4, repeat: Infinity }}
              style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}
            >
              {unbanked.toLocaleString()}
            </motion.div>
            <div style={{ fontSize: '12px', color: '#71717a', marginTop: '4px' }}>
              ×{mult % 1 === 0 ? mult.toFixed(1) : mult} active
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BANK BUTTON */}
      <motion.button
        onClick={() => {
          if (isActive) onBank();
        }}
        disabled={!isActive}
        animate={
          isActive
            ? {
                scale: [1, 1.04, 1],
                boxShadow: [
                  '0 0 0px rgba(245,158,11,0)',
                  '0 0 24px rgba(245,158,11,0.7), 0 0 48px rgba(245,158,11,0.3)',
                  '0 0 0px rgba(245,158,11,0)'
                ],
                backgroundColor: '#f59e0b'
              }
            : {
                scale: 1,
                boxShadow: 'none',
                backgroundColor: '#1a1a2e'
              }
        }
        transition={isActive ? { duration: 1.8, repeat: Infinity } : {}}
        whileTap={isActive ? { scale: 0.94 } : {}}
        whileHover={isActive ? { backgroundColor: '#fbbf24' } : {}}
        style={{
          padding: '12px 32px',
          borderRadius: '12px',
          fontSize: '18px',
          fontWeight: 900,
          letterSpacing: '0.05em',
          border: 'none',
          minWidth: '200px',
          color: isActive ? '#0a0a0f' : '#3f3f5a',
          cursor: isActive ? 'pointer' : 'not-allowed',
          textTransform: 'uppercase',
          // Use framer-motion for background color transitions to avoid conflicts with whileHover
        }}
      >
        {isActive ? `BANK +${unbanked.toLocaleString()}` : 'BANK'}
      </motion.button>
    </div>
  );
}
