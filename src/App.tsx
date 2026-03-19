/**
 * @file src/App.tsx
 * @description Main application entry point for Farkle Frenzy.
 * Wires up the game engine, theme management, and renders the main game interface.
 */

import { useGame } from './hooks/useGame';
import { useTheme } from './hooks/useTheme';
import Grid from './components/Grid';
import BankButton from './components/BankButton';
import MultiplierLadder from './components/MultiplierLadder';
import ThemeToggle from './components/ThemeToggle';
import type { LobbySettings } from './types/game';

const TEST_SETTINGS: LobbySettings = {
  mode: 'SOLO_FREE',
  playerCount: 1,
  turnTimerSeconds: 10,
  blockerDensity: 'MEDIUM',
  threeOnesScore: 1000,
  singleOneScore: 100,
  rainbowRedReward: 100,
  rainbowBlueReward: 50,
};

export default function App() {
  const { theme, isDark, toggleTheme } = useTheme();
  const { state, commitChain, bank, removePopup } = useGame(TEST_SETTINGS);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px',
        padding: '24px',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        <h1
          style={{
            color: 'var(--text-primary)',
            fontWeight: 900,
            fontSize: '24px',
            margin: 0,
          }}
        >
          🎲 Farkle Frenzy
        </h1>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </div>

      <MultiplierLadder step={state.multiplierStep} />

      <Grid
        grid={state.grid}
        activeBombs={state.activeBombs}
        popups={state.popups}
        disabled={state.phase !== 'IDLE'}
        settings={TEST_SETTINGS}
        multiplierStep={state.multiplierStep}
        onCommitChain={commitChain}
        onRemovePopup={removePopup}
        isFarkleAnim={state.phase === 'FARKLE_ANIM'}
        isDark={isDark}
      />

      <BankButton
        banked={state.banked}
        unbanked={state.unbanked}
        multiplierStep={state.multiplierStep}
        onBank={bank}
        disabled={state.phase !== 'IDLE'}
      />
    </div>
  );
}
