/**
 * @file src/components/Tile.tsx
 * @description Renders a 3D die or blocker cell with theme-aware styling and animations.
 */

import { memo } from 'react';
import { motion } from 'motion/react';
import type { Cell } from '../types/game';

interface TileProps {
  cell: Cell;
  row: number;
  col: number;
  isChained: boolean;
  chainIndex: number;
  chainLength: number;
  isAtCap: boolean;
  isDark: boolean;
  onPointerDown: (e: React.PointerEvent, row: number, col: number) => void;
  onPointerEnter: (row: number, col: number) => void;
  onPointerUp: () => void;
}

const DARK_BODY = ['#1a1010', '#1a1208', '#181610', '#0e1a10', '#0a1018', '#120a1a'];
const DARK_PIP = ['#ff2244', '#ff8800', '#ffdd00', '#00ff88', '#0099ff', '#cc44ff'];
const LIGHT_BODY = ['#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#2563eb', '#7c3aed'];

const DARK_GLOWS = [
  '0 12px 24px #ff000055, 0 0 16px #ff224488, 0 0 32px #ff000044, 0 4px 8px rgba(0,0,0,0.9)',
  '0 12px 24px #ff660044, 0 0 16px #ff880088, 0 0 32px #ff660033, 0 4px 8px rgba(0,0,0,0.9)',
  '0 12px 24px #ffaa0044, 0 0 20px #ffdd0088, 0 0 40px #ffaa0033, 0 4px 8px rgba(0,0,0,0.9)',
  '0 12px 24px #00aa4444, 0 0 14px #00ff8888, 0 0 28px #00ff4433, 0 4px 8px rgba(0,0,0,0.9)',
  '0 12px 24px #0044ff44, 0 0 22px #0088ff88, 0 0 44px #0055ff33, 0 4px 8px rgba(0,0,0,0.9)',
  '0 12px 24px #6600ff44, 0 0 16px #aa00ff88, 0 0 32px #ff00ff33, -3px 0 12px #ff008844, 3px 0 12px #0000ff44, 0 4px 8px rgba(0,0,0,0.9)'
];
const LIGHT_SHADOW = '6px 10px 16px rgba(0,0,0,0.28), 2px 4px 6px rgba(0,0,0,0.18)';

/**
 * Renders a single circular pip.
 *
 * @param {Object} props - The component props.
 * @param {string} props.color - The color of the pip.
 * @param {number} props.size - The size of the pip in pixels.
 * @param {boolean} props.glowing - Whether the pip should glow (dark theme).
 * @returns {JSX.Element} The rendered pip.
 */
function CirclePip({ color, size, glowing }: { color: string; size: number; glowing: boolean }) {
  if (glowing) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          border: `2px solid ${color}`,
          backgroundColor: 'transparent',
          boxShadow: `0 0 ${size}px ${color}, 0 0 ${size * 1.5}px ${color}88, inset 0 0 ${size / 3}px ${color}`,
          boxSizing: 'border-box'
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: '#111111',
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5), 0 1px 0px rgba(255,255,255,0.15)',
        boxSizing: 'border-box'
      }}
    />
  );
}

/**
 * Renders the 3x3 grid of pips for a die face.
 *
 * @param {Object} props - The component props.
 * @param {number} props.face - The face value (1-6).
 * @param {string} props.color - The color of the pips.
 * @param {boolean} props.glowing - Whether the pips should glow.
 * @param {number} props.scale - The scale factor for the pips.
 * @param {boolean} [props.isSide] - Whether this is a side face (adjusts padding and size).
 * @returns {JSX.Element} The rendered pip layout.
 */
function PipLayout({ face, color, glowing, scale, isSide = false }: { face: number; color: string; glowing: boolean; scale: number; isSide?: boolean }) {
  const pipSize = (isSide ? 6 : 10) * scale;
  
  const pips = Array(9).fill(false);
  if (face === 1) {
    pips[4] = true;
  } else if (face === 2) {
    pips[2] = true; pips[6] = true;
  } else if (face === 3) {
    pips[2] = true; pips[4] = true; pips[6] = true;
  } else if (face === 4) {
    pips[0] = true; pips[2] = true; pips[6] = true; pips[8] = true;
  } else if (face === 5) {
    pips[0] = true; pips[2] = true; pips[4] = true; pips[6] = true; pips[8] = true;
  } else if (face >= 6) {
    pips[0] = true; pips[2] = true; pips[3] = true; pips[5] = true; pips[6] = true; pips[8] = true;
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gridTemplateRows: 'repeat(3, 1fr)',
        width: '100%',
        height: '100%',
        padding: isSide ? '2px' : `${12 * scale}px`,
        boxSizing: 'border-box',
      }}
    >
      {pips.map((show, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
          {show ? <CirclePip color={color} size={pipSize} glowing={glowing} /> : <div style={{ width: '100%', height: '100%' }} />}
        </div>
      ))}
    </div>
  );
}

/**
 * Renders a 3D die or blocker cell.
 *
 * @param {TileProps} props - The component props.
 * @returns {JSX.Element} The rendered Tile component.
 */
const Tile = memo(function Tile({
  cell,
  row,
  col,
  isChained,
  chainIndex,
  chainLength,
  isAtCap,
  isDark,
  onPointerDown,
  onPointerEnter,
  onPointerUp
}: TileProps) {
  // isDark comes from props — no DOM read on every render

  if (cell.state === 'EMPTY' || cell.type === 'NONE') {
    return <div style={{ width: '100%', height: '100%' }} />;
  }

  const isStone = cell.type === 'STONE';
  const isIce = cell.type === 'ICE' || cell.state === 'FROZEN';
  const isLock = cell.state === 'LOCKED';
  const isDie = cell.face !== null &&
    cell.type !== 'STONE' &&
    cell.type !== 'ICE' &&
    cell.type !== 'LOCK';

  const faceValue = cell.face || 1;
  const faceIdx = faceValue - 1;

  let bodyColor = '';
  let pipColor = '';
  let shadow = '';
  let edgeHighlight = '';

  if (isDie) {
    if (isDark) {
      bodyColor = DARK_BODY[faceIdx];
      pipColor = DARK_PIP[faceIdx];
      shadow = DARK_GLOWS[faceIdx];
      edgeHighlight = 'rgba(255,255,255,0.15)';
    } else {
      bodyColor = LIGHT_BODY[faceIdx];
      pipColor = '#111111';
      shadow = LIGHT_SHADOW;
      edgeHighlight = 'rgba(255,255,255,0.6)';
    }
  } else if (isStone) {
    bodyColor = isDark ? '#111111' : '#9ca3af';
    shadow = isDark ? '0 0 8px rgba(255,255,255,0.2)' : LIGHT_SHADOW;
    edgeHighlight = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.6)';
  } else if (isIce) {
    bodyColor = isDark ? '#030d14' : '#e0f2fe';
    shadow = isDark ? '0 0 12px #00ffff66' : LIGHT_SHADOW;
    edgeHighlight = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.6)';
  }

  let containerScale = 1;
  let containerOpacity = 1;
  let containerFilter = 'none';
  let topFaceOutline = 'none';

  if (isChained) {
    containerScale = 1.1;
    if (isDark) {
      shadow = `${shadow}, 0 0 20px rgba(255,255,255,0.4)`;
      topFaceOutline = '2px solid rgba(255,255,255,0.8)';
    } else {
      shadow = `0 10px 20px rgba(0,0,0,0.3), 0 4px 8px rgba(0,0,0,0.2)`;
      topFaceOutline = '2px solid white';
    }
  } else if (isAtCap) {
    containerOpacity = 0.3;
    containerFilter = 'saturate(0.2)';
  }

  if (isLock) {
    if (isDark) {
      shadow = `0 4px 8px rgba(0,0,0,0.8), 0 0 8px ${DARK_PIP[faceIdx]}88`;
    }
  }

  if (isStone) {
    topFaceOutline = isDark ? (cell.health === 1 ? '2px dashed #333' : '2px solid #333') : '2px solid #6b7280';
  } else if (isIce) {
    topFaceOutline = isDark ? '1px solid #00ffff44' : '1px solid #0ea5e944';
  }

  const pointerEvents = (isStone || isIce) ? 'none' : 'auto';

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: containerScale, opacity: containerOpacity, filter: containerFilter }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 22 }}
      style={{
        position: 'relative',
        transformStyle: 'preserve-3d',
        perspective: '600px',
        width: '100%',
        height: '100%',
        touchAction: 'none',
        cursor: pointerEvents === 'auto' ? 'pointer' : 'default',
        pointerEvents: pointerEvents as React.CSSProperties['pointerEvents'],
        boxShadow: shadow,
        borderRadius: '22%',
      }}
      onPointerDown={(e) => onPointerDown(e, row, col)}
      onPointerEnter={() => onPointerEnter(row, col)}
      onPointerUp={onPointerUp}
    >
      {/* TOP FACE */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '22%',
          transform: 'rotateX(30deg) rotateY(-18deg) translateZ(8px)',
          transformOrigin: 'center center',
          backgroundColor: bodyColor,
          borderTop: `1px solid ${edgeHighlight}`,
          borderLeft: `1px solid ${edgeHighlight}`,
          outline: topFaceOutline !== 'none' ? topFaceOutline : undefined,
          outlineOffset: isChained ? '2px' : '0px',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {isDie && <PipLayout face={faceValue} color={pipColor} glowing={isDark} scale={1} />}
        {isStone && <div style={{ color: isDark ? '#fff' : '#000', fontWeight: 'bold', fontSize: '24px' }}>{cell.health}</div>}
        {isIce && (
          <>
            <div style={{ fontSize: '24px' }}>❄️</div>
            <div style={{ position: 'absolute', top: '4px', right: '6px', fontSize: '12px', fontWeight: 'bold', color: isDark ? '#fff' : '#000' }}>{faceValue}</div>
          </>
        )}
        {isLock && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(245, 158, 11, 0.2)', borderRadius: '22%' }}>
            <span style={{ fontSize: '24px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>🔒</span>
          </div>
        )}
      </div>

      {/* RIGHT SIDE FACE */}
      <div
        style={{
          position: 'absolute',
          top: '8%',
          bottom: '8%',
          right: '-18px',
          width: '18px',
          borderRadius: '0 22% 22% 0',
          transform: 'rotateY(90deg) translateZ(0px)',
          transformOrigin: 'left center',
          filter: 'brightness(0.75)',
          backgroundColor: bodyColor,
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}
      >
        {isDie && <PipLayout face={7 - faceValue} color={pipColor} glowing={isDark} scale={0.6} isSide />}
      </div>

      {/* FRONT-BOTTOM FACE */}
      <div
        style={{
          position: 'absolute',
          left: '8%',
          right: '8%',
          bottom: '-12px',
          height: '12px',
          borderRadius: '0 0 22% 22%',
          transform: 'rotateX(-90deg) translateZ(0px)',
          transformOrigin: 'top center',
          filter: 'brightness(0.55)',
          backgroundColor: bodyColor,
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}
      >
        {isDie && <PipLayout face={Math.max(1, (faceValue + 2) % 6)} color={pipColor} glowing={isDark} scale={0.4} isSide />}
      </div>

      {/* CHAIN BADGE */}
      {isChained && (
        <div
          style={{
            position: 'absolute',
            top: '-6px',
            right: '-6px',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            backgroundColor: 'white',
            color: 'black',
            fontSize: '12px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            boxShadow: '0 2px 4px rgba(0,0,0,0.5)'
          }}
        >
          {chainIndex + 1}
        </div>
      )}
    </motion.div>
  );
});

export default Tile;
