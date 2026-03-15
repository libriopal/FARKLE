/**
 * @file src/components/Bomb.tsx
 */

import { memo, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import type { Bomb as BombType } from '../types/game';

interface BombProps {
  bomb: BombType;
  tileSize: number;
  isDark: boolean;
}

const Bomb = memo(function Bomb({ bomb, tileSize, isDark }: BombProps) {
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
    ? '0 6px 16px rgba(0,0,0,0.9), 0 0 8px rgba(255,255,255,0.05), inset -3px -3px 8px rgba(0,0,0,0.8)'
    : '4px 8px 16px rgba(0,0,0,0.5), inset -2px -2px 6px rgba(0,0,0,0.6)';

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
        pointerEvents: 'none',
        zIndex: 20,
      }}
    >
      {/* COUNTDOWN RING */}
      <svg
        width={tileSize * 0.9}
        height={tileSize * 0.9}
        style={{
          position: 'absolute',
          transform: 'rotate(-90deg)',
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
      <div
        style={{
          position: 'relative',
          width: sphereSize,
          height: sphereSize,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 30%, #4a4a4a 0%, #1a1a1a 50%, #0a0a0a 100%)',
          boxShadow: shadow,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          filter: flash ? 'brightness(1.5) drop-shadow(0 0 10px red)' : 'none',
          transition: 'filter 0.1s',
        }}
      >
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
          }}
        >
          {bomb.face}
        </div>
      </div>
    </motion.div>
  );
});

export default Bomb;
