import { motion, AnimatePresence } from 'framer-motion';
import type { GamePhase } from '../types/game';
import MultiplierLadder from './MultiplierLadder';
import BankButton from './BankButton';

interface HUDProps {
  banked: number;
  unbanked: number;
  multiplierStep: number;
  lastCombo?: string;
  isFarkle: boolean;
  phase: GamePhase;
  onBank: () => void;
  mode: string;
  farklePool?: number;
}

/**
 * The complete game HUD panel that sits beside the board showing scores,
 * multiplier, last combo result, and the bank button.
 */
export default function HUD({
  banked,
  unbanked,
  multiplierStep,
  lastCombo,
  isFarkle,
  phase,
  onBank,
  mode,
  farklePool
}: HUDProps) {
  const isDark = typeof document !== 'undefined'
    ? document.documentElement.getAttribute('data-theme') !== 'light'
    : true;

  return (
    <div
      style={{
        width: '256px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '16px',
        background: isDark ? 'rgba(10,10,20,0.85)' : 'rgba(255,255,255,0.85)',
        backgroundColor: 'var(--bg-surface)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.08)',
        borderRadius: '20px',
        boxShadow: isDark ? '0 0 40px rgba(0,0,0,0.5)' : '0 8px 32px rgba(0,0,0,0.15)'
      }}
    >
      {/* 1. MODE BADGE */}
      <div
        style={{
          textAlign: 'center',
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.12em',
          color: 'var(--text-label)',
          textTransform: 'uppercase'
        }}
      >
        {mode.replace(/_/g, ' ')}
      </div>

      {/* 2. BANK BUTTON SECTION */}
      <BankButton
        banked={banked}
        unbanked={unbanked}
        multiplierStep={multiplierStep}
        onBank={onBank}
        disabled={phase !== 'IDLE'}
      />

      {/* 3. MULTIPLIER SECTION */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div
          style={{
            textAlign: 'center',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.12em',
            color: 'var(--text-label)',
            textTransform: 'uppercase'
          }}
        >
          MULTIPLIER
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <MultiplierLadder step={multiplierStep} />
        </div>
      </div>

      {/* 4. LAST COMBO RESULT */}
      <div style={{ minHeight: '36px' }}>
        <AnimatePresence mode="wait">
          {lastCombo && (
            <motion.div
              key={lastCombo}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              style={{
                padding: '8px 12px',
                borderRadius: '10px',
                background: isFarkle ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.1)',
                border: isFarkle ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(245,158,11,0.3)',
                color: isFarkle ? '#f87171' : '#fcd34d',
                fontSize: '12px',
                fontWeight: 700,
                textAlign: 'center'
              }}
            >
              {isFarkle ? '💀 FARKLE — points lost!' : lastCombo}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 5. INSTRUCTIONS */}
      {unbanked === 0 && phase === 'IDLE' && (
        <div
          style={{
            fontSize: '11px',
            color: 'var(--text-muted)',
            textAlign: 'center',
            lineHeight: 1.6
          }}
        >
          Drag dice to chain • Release to score • Bank to keep
        </div>
      )}

      {/* 6. FARKLE POOL */}
      {farklePool !== undefined && farklePool > 0 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 12px',
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: '8px'
          }}
        >
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.12em',
              color: '#f87171',
              textTransform: 'uppercase'
            }}
          >
            FARKLE POOL
          </span>
          <span
            style={{
              color: '#f87171',
              fontSize: '12px',
              fontWeight: 700
            }}
          >
            {farklePool.toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
}
