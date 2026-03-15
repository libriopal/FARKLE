/**
 * @file src/components/RainbowBomb.tsx
 */

import { memo, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import type { Bomb as BombType, DieFace } from '../types/game';

interface RainbowBombProps {
  bomb: BombType;
  tileSize: number;
  isDark: boolean;
  onSelectColor: (bombId: string, face: DieFace) => void;
}

const RainbowBomb = memo(function RainbowBomb({ bomb, tileSize, isDark, onSelectColor }: RainbowBombProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (bomb.fuseMs <= 3000 && bomb.fuseMs > 0) {
      const interval = setInterval(() => {
        setFlash(f => !f);
      }, Math.max(100, bomb.fuseMs / 10));
      return () => clearInterval(interval);
    } else {
      setFlash(false);
    }
  }, [bomb.fuseMs]);

  const progress = bomb.fuseMs / bomb.maxFuseMs;
  const isDanger = bomb.fuseMs <= 3000;
  
  const sphereSize = tileSize * 0.7;
  const fuseHeight = tileSize * 0.2;

  const shadow = isDark
    ? '0 8px 20px rgba(0,0,0,0.9), 0 0 24px rgba(180,100,255,0.4)'
    : '4px 8px 16px rgba(0,0,0,0.4), 0 0 20px rgba(200,100,255,0.3)';

  const filter = isDark ? 'saturate(1.2) brightness(0.85)' : 'saturate(1.4) brightness(1.1)';

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0, filter: 'brightness(2) blur(10px)' }}
      style={{
        position: 'absolute',
        top: bomb.row * tileSize,
        left: bomb.col * tileSize,
        width: tileSize,
        height: tileSize,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: showPicker ? 30 : 20,
      }}
    >
      {/* COUNTDOWN RING */}
      <svg
        width={tileSize * 0.9}
        height={tileSize * 0.9}
        style={{
          position: 'absolute',
          transform: 'rotate(-90deg)',
          pointerEvents: 'none',
        }}
      >
        <circle
          cx={tileSize * 0.45}
          cy={tileSize * 0.45}
          r={tileSize * 0.4}
          fill="none"
          stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}
          strokeWidth="4"
        />
        <circle
          cx={tileSize * 0.45}
          cy={tileSize * 0.45}
          r={tileSize * 0.4}
          fill="none"
          stroke={isDanger ? '#ff4444' : (isDark ? '#fff' : '#000')}
          strokeWidth="4"
          strokeDasharray={Math.PI * 2 * (tileSize * 0.4)}
          strokeDashoffset={Math.PI * 2 * (tileSize * 0.4) * (1 - progress)}
          style={{ transition: 'stroke-dashoffset 0.1s linear' }}
        />
      </svg>

      {/* SPHERE */}
      <motion.div
        onClick={() => setShowPicker(!showPicker)}
        style={{
          position: 'relative',
          width: sphereSize,
          height: sphereSize,
          borderRadius: '50%',
          background: 'conic-gradient(from 0deg, #ff0000, #ff8800, #ffdd00, #00ff88, #0099ff, #cc44ff, #ff0088, #ff0000)',
          boxShadow: shadow,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          filter: flash ? `brightness(1.5) drop-shadow(0 0 10px red) ${filter}` : filter,
        }}
        animate={{ filter: [`hue-rotate(0deg) ${filter}`, `hue-rotate(360deg) ${filter}`] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
      >
        {/* SHINE OVERLAY */}
        <div
          style={{
            position: 'absolute',
            width: '40%',
            height: '40%',
            top: '10%',
            left: '15%',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.2) 50%, transparent 100%)',
            pointerEvents: 'none',
          }}
        />

        {/* FUSE */}
        <div
          style={{
            position: 'absolute',
            top: -fuseHeight + 2,
            left: '50%',
            width: '3px',
            height: fuseHeight,
            background: 'linear-gradient(to top, #8b6914, #c8a020)',
            borderRadius: '2px',
            transform: 'translateX(-50%) rotate(15deg)',
            transformOrigin: 'bottom center',
            pointerEvents: 'none',
          }}
        >
          {/* SPARK */}
          {bomb.fuseMs > 0 && (
            <motion.div
              animate={{ opacity: [1, 0.3, 1], scale: [1, 1.3, 1] }}
              transition={{ duration: 0.15, repeat: Infinity }}
              style={{
                position: 'absolute',
                top: -4,
                left: -2.5,
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, #fff 0%, #ffdd00 40%, #ff8800 70%, transparent 100%)',
              }}
            />
          )}
        </div>

        {/* FACE NUMBER */}
        <div
          style={{
            position: 'absolute',
            color: 'rgba(255,255,255,0.6)',
            fontSize: '10px',
            fontWeight: 900,
            zIndex: 2,
            pointerEvents: 'none',
          }}
        >
          {bomb.face}
        </div>
      </motion.div>

      {/* COLOR PICKER */}
      {showPicker && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: '8px',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '4px',
            background: isDark ? 'rgba(0,0,0,0.9)' : 'rgba(255,255,255,0.9)',
            padding: '8px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            zIndex: 40,
          }}
        >
          {([1, 2, 3, 4, 5, 6] as DieFace[]).map(face => (
            <div
              key={face}
              onClick={(e) => {
                e.stopPropagation();
                onSelectColor(bomb.id, face);
                setShowPicker(false);
              }}
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                background: isDark ? '#333' : '#eee',
                color: isDark ? '#fff' : '#000',
                fontWeight: 'bold',
                fontSize: '12px',
              }}
            >
              {face}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
});

export default RainbowBomb;
