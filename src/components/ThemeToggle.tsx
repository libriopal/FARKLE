/**
 * @file src/components/ThemeToggle.tsx
 * @description Renders a pill-shaped toggle switch for switching between light and dark themes.
 */

import { motion } from 'framer-motion';
import type { Theme } from '../hooks/useTheme';

interface ThemeToggleProps {
  theme: Theme;
  onToggle: () => void;
}

/**
 * A pill-shaped toggle switch for the application theme.
 *
 * @param {ThemeToggleProps} props - The component props.
 * @param {Theme} props.theme - The current theme ('dark' | 'light').
 * @param {() => void} props.onToggle - Callback fired when the toggle is clicked.
 * @returns {JSX.Element} The rendered ThemeToggle component.
 */
export default function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const isDark = theme === 'dark';

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    touchAction: 'none',
    userSelect: 'none',
  };

  const pillStyle: React.CSSProperties = {
    position: 'relative',
    width: '72px',
    height: '32px',
    borderRadius: '16px',
    backgroundColor: isDark ? '#1a1a2e' : '#f0ebe0',
    border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    overflow: 'hidden',
  };

  const iconStyle: React.CSSProperties = {
    position: 'absolute',
    fontSize: '14px',
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 1,
  };

  const moonStyle: React.CSSProperties = {
    ...iconStyle,
    left: '8px',
    opacity: isDark ? 1 : 0.3,
    textShadow: isDark ? '0 0 8px #ffffff' : 'none',
  };

  const sunStyle: React.CSSProperties = {
    ...iconStyle,
    right: '8px',
    opacity: isDark ? 0.3 : 1,
    textShadow: !isDark ? '0 0 8px #f59e0b' : 'none',
  };

  const thumbStyle: React.CSSProperties = {
    position: 'absolute',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: isDark ? '#e8e8f0' : '#1a1a2e',
    top: '3px',
    zIndex: 2,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '10px',
    fontWeight: 'bold',
    letterSpacing: '0.05em',
    color: isDark ? '#71717a' : '#9ca3af',
  };

  return (
    <div style={containerStyle}>
      <div style={pillStyle} onClick={onToggle}>
        <div style={moonStyle}>🌙</div>
        <div style={sunStyle}>☀️</div>
        <motion.div
          style={thumbStyle}
          animate={{ x: isDark ? 3 : 43 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      </div>
      <div style={labelStyle}>{isDark ? 'DARK' : 'LIGHT'}</div>
    </div>
  );
}
