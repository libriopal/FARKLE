/**
 * @file src/hooks/useGame.ts
 * @description Singleplayer game state machine and core game loop logic.
 */

import { useReducer, useEffect, useRef, useCallback } from 'react';
import type {
  GameState, GamePhase, Cell, GridPos, ActiveBomb,
  ScorePopup, BombType, DieColor, LobbySettings, RallyRole, DieFace
} from '../types/game';
import { GAME_CONSTANTS, getMultiplier, MULTIPLIER_LADDER } from '../types/game';
import { scoreFarkle } from '../utils/farkleScorer';
import {
  createGrid, stepGravity, hasEmptyBelow, spawnTiles,
  normalizeTiles, applyStandardBomb, applyRainbowBomb,
  damageAdjacentBlockers, hasValidChain, recoverDeadBoard,
  cloneGrid, DEFAULT_WEIGHTS
} from '../utils/gridUtils';
import { nanoid } from 'nanoid';

const COLORS: DieColor[] = ['RED', 'ORANGE', 'YELLOW', 'GREEN', 'BLUE', 'PURPLE'];

function randomColor(): DieColor {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

function initialState(settings: LobbySettings): GameState {
  const size = settings.playerCount === 1 ? 7 : settings.playerCount === 2 ? 8 : settings.playerCount === 3 ? 9 : 10;
  return {
    phase: 'IDLE',
    grid: createGrid(size, settings),
    banked: 0,
    unbanked: 0,
    multiplierStep: 0,
    consecutiveChains: 0,
    activeBombs: [],
    popups: [],
    farklePool: 0,
    lastChainResult: null
  };
}

type Action =
  | { type: 'COMMIT_CHAIN'; chain: GridPos[]; settings: LobbySettings; role?: RallyRole }
  | { type: 'BANK' }
  | { type: 'DETONATE_BOMB'; bombId: string; targetColor?: DieColor; settings: LobbySettings }
  | { type: 'TICK_BOMB'; bombId: string; deltaMs: number }
  | { type: 'REMOVE_POPUP'; id: string }
  | { type: 'END_FARKLE_ANIM' }
  | { type: 'RESET'; settings: LobbySettings }
  | { type: 'ARCHIVIST_RECOVER' };

function applyCascadeSync(
  grid: Cell[][],
  weights: [number,number,number,number,number,number]
): Cell[][] {
  let current = grid;
  let iterations = 0;
  const maxIterations = 50;

  while (iterations < maxIterations) {
    const { grid: afterGravity, changed } = stepGravity(current);
    if (changed) {
      current = afterGravity;
      iterations++;
      continue;
    }
    if (hasEmptyBelow(current)) {
      iterations++;
      continue;
    }
    const { grid: afterSpawn, changed: spawned } = spawnTiles(
      current, weights, Math.random
    );
    if (spawned) {
      current = normalizeTiles(afterSpawn);
      iterations++;
      continue;
    }
    break;
  }

  return hasValidChain(current) ? current : recoverDeadBoard(current);
}

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'COMMIT_CHAIN': {
      const { chain, settings, role } = action;
      const faces: DieFace[] = [];
      const newGrid = cloneGrid(state.grid);

      // Extract faces and clear cells
      for (const pos of chain) {
        const cell = newGrid[pos.row][pos.col];
        if (cell.face !== null) {
          faces.push(cell.face);
        }
        // Unlock locked cells and clear normal die cells
        newGrid[pos.row][pos.col] = { id: nanoid(), face: null, type: 'NONE', state: 'EMPTY' };
      }

      const result = scoreFarkle(faces, settings.threeOnesScore, settings.singleOneScore);
      const multiplier = getMultiplier(state.multiplierStep);

      if (result.isFarkle) {
        const lostPoints = state.unbanked;
        return {
          ...state,
          farklePool: state.farklePool + lostPoints,
          unbanked: 0,
          multiplierStep: 0,
          consecutiveChains: 0,
          phase: 'FARKLE_ANIM',
          popups: [...state.popups, { id: nanoid(), score: 0, label: 'FARKLE', color: 'red', row: chain[0].row, col: chain[0].col }],
          lastChainResult: { score: 0, scaledScore: 0, isFarkle: true, combo: 'Farkle', triggersBomb: null }
        };
      }

      const rawScore = result.score;
      const scaledScore = Math.round(rawScore * multiplier);
      const isSixOfAKind = faces.length === 6 && new Set(faces).size === 1;
      const isStraight = faces.length === 6 && new Set(faces).size === 6;
      const triggersBomb: BombType | null = isSixOfAKind ? 'STANDARD' : isStraight ? 'RAINBOW' : null;

      const gridAfterDamage = damageAdjacentBlockers(newGrid, chain, role === 'HEADHUNTER');

      const newActiveBombs = [...state.activeBombs];
      if (triggersBomb) {
        const center = chain[Math.floor(chain.length / 2)];
        newActiveBombs.push({
          id: nanoid(),
          type: triggersBomb,
          row: center.row,
          col: center.col,
          fuseMs: GAME_CONSTANTS.FUSE_MS
        });
      }

      let archivistBonus = 0;
      let newFarklePool = state.farklePool;
      if (role === 'ARCHIVIST' && state.farklePool > 0) {
        archivistBonus = Math.floor(state.farklePool * GAME_CONSTANTS.ARCHIVIST_PCT);
        newFarklePool -= archivistBonus;
      }

      const newStep = Math.min(state.multiplierStep + 1, MULTIPLIER_LADDER.length - 1);

      const cascadedGrid = applyCascadeSync(gridAfterDamage, DEFAULT_WEIGHTS);
      return {
        ...state,
        grid: cascadedGrid,
        unbanked: state.unbanked + scaledScore + archivistBonus,
        multiplierStep: newStep,
        consecutiveChains: state.consecutiveChains + 1,
        phase: 'IDLE',
        activeBombs: newActiveBombs,
        farklePool: newFarklePool,
        popups: [...state.popups, { id: nanoid(), score: scaledScore, label: result.combo, color: triggersBomb ? 'gold' : 'green', row: chain[Math.floor(chain.length / 2)].row, col: chain[Math.floor(chain.length / 2)].col }],
        lastChainResult: { score: rawScore, scaledScore, isFarkle: false, combo: result.combo, triggersBomb }
      };
    }

    case 'BANK': {
      if (state.unbanked === 0) return state;
      return {
        ...state,
        banked: state.banked + state.unbanked,
        unbanked: 0,
        multiplierStep: 0,
        consecutiveChains: 0,
        lastChainResult: null
      };
    }

    case 'DETONATE_BOMB': {
      const bomb = state.activeBombs.find(b => b.id === action.bombId);
      if (!bomb) return state;

      const multiplier = getMultiplier(state.multiplierStep);
      let bombResult;

      if (bomb.type === 'STANDARD') {
        bombResult = applyStandardBomb(state.grid, bomb.row, bomb.col);
      } else {
        bombResult = applyRainbowBomb(
          state.grid,
          action.targetColor ?? randomColor(),
          multiplier,
          action.settings.rainbowRedReward,
          action.settings.rainbowBlueReward
        );
      }

      const cascadedAfterBomb = applyCascadeSync(bombResult.grid, DEFAULT_WEIGHTS);
      return {
        ...state,
        grid: cascadedAfterBomb,
        unbanked: state.unbanked + bombResult.ptsEarned,
        activeBombs: state.activeBombs.filter(b => b.id !== action.bombId),
        phase: 'IDLE',
        popups: [...state.popups, { id: nanoid(), score: bombResult.ptsEarned, label: bomb.type === 'STANDARD' ? 'BOOM!' : '🌈 RAINBOW!', color: 'gold', row: bomb.row, col: bomb.col }]
      };
    }

    case 'TICK_BOMB': {
      return {
        ...state,
        activeBombs: state.activeBombs.map(bomb => {
          if (bomb.id === action.bombId) {
            return { ...bomb, fuseMs: Math.max(0, bomb.fuseMs - action.deltaMs) };
          }
          return bomb;
        })
      };
    }

    case 'REMOVE_POPUP': {
      return {
        ...state,
        popups: state.popups.filter(p => p.id !== action.id)
      };
    }

    case 'END_FARKLE_ANIM': {
      return { ...state, phase: 'IDLE' };
    }

    case 'ARCHIVIST_RECOVER': {
      if (state.farklePool === 0) return state;
      const bonus = Math.floor(state.farklePool * GAME_CONSTANTS.ARCHIVIST_PCT);
      return {
        ...state,
        farklePool: state.farklePool - bonus,
        unbanked: state.unbanked + bonus
      };
    }

    case 'RESET': {
      return initialState(action.settings);
    }

    default:
      return state;
  }
}

/**
 * Hook that manages the countdown fuse for active bombs.
 * @param activeBombs The array of currently active bombs.
 * @param dispatch The state dispatcher.
 * @param settings The lobby settings.
 * @param rainmakerChosenColor Optional color chosen by a Rainmaker role for rainbow bombs.
 */
export function useBombFuse(
  activeBombs: ActiveBomb[],
  dispatch: React.Dispatch<Action>,
  settings: LobbySettings,
  rainmakerChosenColor?: DieColor
): void {
  useEffect(() => {
    if (activeBombs.length === 0) return;

    let prevTime = Date.now();
    const intervalId = setInterval(() => {
      const now = Date.now();
      const deltaMs = now - prevTime;
      prevTime = now;

      activeBombs.forEach(bomb => {
        dispatch({ type: 'TICK_BOMB', bombId: bomb.id, deltaMs });
        if (bomb.fuseMs - deltaMs <= 0) {
          dispatch({
            type: 'DETONATE_BOMB',
            bombId: bomb.id,
            targetColor: rainmakerChosenColor,
            settings
          });
        }
      });
    }, 100);

    return () => clearInterval(intervalId);
  }, [activeBombs.length, settings, dispatch, rainmakerChosenColor]);
}

/**
 * Main hook for the singleplayer game state machine.
 * @param settings The lobby settings configuring the game.
 * @returns The current game state and bound action dispatchers.
 */
export function useGame(settings: LobbySettings): {
  state: GameState;
  commitChain: (chain: GridPos[], role?: RallyRole) => void;
  bank: () => void;
  reset: () => void;
  removePopup: (id: string) => void;
  endFarkleAnim: () => void;
} {
  const [state, dispatch] = useReducer(reducer, settings, initialState);

  useBombFuse(state.activeBombs, dispatch, settings);

  useEffect(() => {
    if (state.phase !== 'FARKLE_ANIM') return;
    const t = setTimeout(() => {
      dispatch({ type: 'END_FARKLE_ANIM' });
    }, 800);
    return () => clearTimeout(t);
  }, [state.phase]);

  const commitChain = useCallback((chain: GridPos[], role?: RallyRole) => {
    if (state.phase === 'IDLE') {
      dispatch({ type: 'COMMIT_CHAIN', chain, settings, role });
    }
  }, [state.phase, settings]);

  const bank = useCallback(() => {
    dispatch({ type: 'BANK' });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET', settings });
  }, [settings]);

  const removePopup = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_POPUP', id });
  }, []);

  const endFarkleAnim = useCallback(() => {
    dispatch({ type: 'END_FARKLE_ANIM' });
  }, []);

  return {
    state,
    commitChain,
    bank,
    reset,
    removePopup,
    endFarkleAnim
  };
}
