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

const DARK_BODY = ['#1c0a0a', '#1c1005', '#1a1800', '#0a1c0a', '#050a1c', '#100518'];
const DARK_PIP = ['#ff2244', '#ff8800', '#ffdd00', '#00ff88', '#0099ff', '#cc44ff'];
const LIGHT_BODY = ['#e53535', '#f06000', '#d4a000', '#18a83a', '#1a5fd4', '#7c22e8'];

const DARK_GLOWS = [
  '0 16px 28px #ff000066, 0 6px 14px #ff224444, 0 0 18px #ff224455',
  '0 16px 28px #ff660055, 0 6px 14px #ff880033, 0 0 18px #ff880055',
  '0 16px 28px #ffaa0055, 0 6px 14px #ffdd0033, 0 0 22px #ffdd0055',
  '0 16px 28px #00660044, 0 6px 14px #00ff8833, 0 0 18px #00ff8855',
  '0 16px 28px #0033ff55, 0 6px 14px #0099ff33, 0 0 22px #0099ff55',
  '0 16px 28px #6600ff55, 0 6px 14px #cc44ff33, 0 0 18px #cc44ff55, -2px 0 10px #ff008844, 2px 0 10px #0000ff44'
];
const LIGHT_SHADOW = '8px 14px 22px rgba(0,0,0,0.32), 3px 5px 8px rgba(0,0,0,0.22)';

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
          backgroundColor: color,
          boxShadow: `0 0 ${size * 0.8}px ${color}, 0 0 ${size * 2.0}px ${color}99, 0 0 ${size * 3.5}px ${color}44, inset 0 0 ${size * 0.4}px rgba(255,255,255,0.7)`,
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
        backgroundColor: '#1a1a1a',
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.7), 0 1px 1px rgba(255,255,255,0.25)',
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
  const pipSize = isSide ? 5 * scale : 9 * scale;
  
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
        padding: isSide ? '2px' : `${10 * scale}px`,
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
  let topFaceBackground = '';
  let topFaceBoxShadow = '';

  if (isDie || isLock) {
    if (isDark) {
      bodyColor = DARK_BODY[faceIdx];
      pipColor = DARK_PIP[faceIdx];
      shadow = DARK_GLOWS[faceIdx];
      edgeHighlight = 'rgba(255,255,255,0.14)';
      topFaceBackground = `radial-gradient(ellipse at center, ${pipColor}18 0%, ${pipColor}08 40%, transparent 70%), ${bodyColor}`;
    } else {
      bodyColor = LIGHT_BODY[faceIdx];
      pipColor = '#111111';
      shadow = LIGHT_SHADOW;
      edgeHighlight = 'rgba(255,255,255,0.55)';
      topFaceBackground = `linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 40%, transparent 65%), ${bodyColor}`;
    }
  } else if (isStone) {
    bodyColor = isDark ? '#1e2228' : '#c4b49a';
    shadow = isDark ? '0 8px 18px rgba(0,0,0,0.9), 0 0 6px rgba(100,120,140,0.2)' : '6px 10px 16px rgba(0,0,0,0.3), 2px 4px 6px rgba(0,0,0,0.18)';
    edgeHighlight = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.35)';
    topFaceBackground = isDark
      ? 'linear-gradient(135deg, #252b32 0%, #1a1e24 40%, #222830 70%, #161a20 100%)'
      : 'linear-gradient(135deg, #d4c4aa 0%, #b8a48a 40%, #c8b898 70%, #a89878 100%)';
    if (cell.health === 1) {
      topFaceBoxShadow = isDark ? 'inset 2px 2px 4px rgba(0,0,0,0.8)' : 'inset 2px 2px 4px rgba(0,0,0,0.3), inset -1px -1px 3px rgba(255,255,255,0.1)';
    }
  } else if (isIce) {
    bodyColor = isDark ? 'rgba(20,40,80,0.6)' : 'rgba(220,235,255,0.55)';
    shadow = isDark ? '0 0 20px rgba(100,160,255,0.3), 0 8px 16px rgba(0,0,0,0.8)' : '0 4px 12px rgba(100,150,255,0.2), inset 0 1px 0 rgba(255,255,255,0.9)';
    edgeHighlight = isDark ? 'rgba(0,255,255,0.35)' : 'rgba(100,200,255,0.55)';
    topFaceBackground = bodyColor;
  }

  let containerScale = 1;
  let containerOpacity = 1;
  let containerFilter = 'none';
  let topFaceBorder = 'none';
  let topFaceBackdropFilter = 'none';

  if (isChained) {
    containerScale = 1.12;
    shadow = `${shadow}, 0 0 0 3px rgba(255,255,255,0.95), 0 0 20px rgba(255,255,255,0.2)`;
  } else if (isAtCap) {
    containerOpacity = 0.25;
    containerFilter = 'saturate(0.12) brightness(0.65)';
  }

  if (isStone) {
    topFaceBorder = isDark ? (cell.health === 1 ? '2px dashed rgba(140,140,140,0.55)' : '2px solid rgba(90,90,90,0.6)') : (cell.health === 1 ? '2px dashed rgba(140,140,140,0.55)' : '2px solid rgba(90,90,90,0.6)');
  } else if (isIce) {
    topFaceBorder = isDark ? '1px solid rgba(100,160,255,0.3)' : '1px solid rgba(255,255,255,0.8)';
    topFaceBackdropFilter = 'blur(4px)';
  }

  const pointerEvents = (isStone || isIce) ? 'none' : 'auto';

  const chainColor = isDark ? 'rgba(80,80,80,0.8)' : 'rgba(150,150,150,0.7)';

  return (
    <motion.div
      key={cell.id}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: containerScale, opacity: containerOpacity, filter: containerFilter }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      style={{
        position: 'relative',
        transformStyle: 'preserve-3d',
        perspective: '500px',
        width: '100%',
        height: '100%',
        touchAction: 'none',
        cursor: pointerEvents === 'auto' ? 'pointer' : 'default',
        pointerEvents: pointerEvents as React.CSSProperties['pointerEvents'],
        boxShadow: shadow,
        borderRadius: '24%',
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
          borderRadius: '24%',
          transform: 'rotateX(28deg) rotateY(-16deg) translateZ(6px)',
          transformOrigin: 'center center',
          background: topFaceBackground,
          borderTop: `1px solid ${edgeHighlight}`,
          borderLeft: `1px solid ${edgeHighlight}`,
          border: topFaceBorder !== 'none' ? topFaceBorder : undefined,
          boxShadow: topFaceBoxShadow || undefined,
          backdropFilter: topFaceBackdropFilter !== 'none' ? topFaceBackdropFilter : undefined,
          overflow: 'hidden',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {(isDie || isLock) && <PipLayout face={faceValue} color={pipColor} glowing={isDark} scale={1} />}
        {isStone && <div style={{ color: isDark ? '#8090a0' : '#5a4030', fontWeight: 900, fontSize: '20px' }}>{cell.health}</div>}
        {isIce && (
          <>
            <div style={{ color: isDark ? 'rgba(100,160,255,0.5)' : 'rgba(60,80,120,0.7)', fontSize: '18px', fontWeight: 900 }}>{faceValue}</div>
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(135deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.05) 50%, transparent 100%)',
              borderRadius: 'inherit',
              pointerEvents: 'none'
            }} />
          </>
        )}
        {isLock && (
          <>
            <div style={{
              position: 'absolute',
              inset: 0,
              background: `repeating-linear-gradient(45deg, transparent 0px, transparent 6px, ${chainColor} 6px, ${chainColor} 8px)`
            }} />
            <div style={{
              position: 'absolute',
              inset: 0,
              background: `repeating-linear-gradient(-45deg, transparent 0px, transparent 6px, ${chainColor} 6px, ${chainColor} 8px)`
            }} />
            <div style={{
              position: 'absolute',
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              backgroundColor: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 5
            }}>
              <span style={{ fontSize: '14px' }}>🔒</span>
            </div>
          </>
        )}
      </div>

      {/* RIGHT SIDE FACE */}
      <div
        style={{
          position: 'absolute',
          top: '6%',
          bottom: '6%',
          right: '-16px',
          width: '16px',
          borderRadius: '0 24% 24% 0',
          transform: 'rotateY(90deg) translateZ(0)',
          transformOrigin: 'left center',
          filter: isDark ? 'brightness(0.45)' : 'brightness(0.58)',
          backgroundColor: bodyColor,
          overflow: 'hidden',
          boxSizing: 'border-box'
        }}
      >
        {(isDie || isLock) && <PipLayout face={7 - faceValue} color={pipColor} glowing={isDark} scale={0.6} isSide />}
      </div>

      {/* FRONT-BOTTOM FACE */}
      <div
        style={{
          position: 'absolute',
          left: '6%',
          right: '6%',
          bottom: '-10px',
          height: '10px',
          borderRadius: '0 0 24% 24%',
          transform: 'rotateX(-90deg) translateZ(0)',
          transformOrigin: 'top center',
          filter: isDark ? 'brightness(0.32)' : 'brightness(0.44)',
          backgroundColor: bodyColor,
          overflow: 'hidden',
          boxSizing: 'border-box'
        }}
      >
        {(isDie || isLock) && <PipLayout face={Math.max(1, (faceValue + 2) % 6)} color={pipColor} glowing={isDark} scale={0.4} isSide />}
      </div>

      {/* CHAIN BADGE */}
      {isChained && (
        <div
          style={{
            position: 'absolute',
            top: '-8px',
            right: '-8px',
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            backgroundColor: 'white',
            color: 'black',
            fontSize: '11px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            boxShadow: '0 2px 6px rgba(0,0,0,0.7)'
          }}
        >
          {chainIndex + 1}
        </div>
      )}
    </motion.div>
  );
});

export default Tile;
