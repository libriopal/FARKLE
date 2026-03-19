export type DieFace = 1 | 2 | 3 | 4 | 5 | 6;
export type DieColor = 'RED'|'ORANGE'|'YELLOW'|'GREEN'|'BLUE'|'PURPLE';
export type BlockerType = 'STONE'|'ICE'|'LOCK';
export type CellState = 'NORMAL'|'EMPTY'|'SPAWNING'|'FROZEN'|'LOCKED';
export type BombType = 'STANDARD'|'RAINBOW';
export type GamePhase = 'IDLE'|'CHAINING'|'RESOLVING'|'REFILLING'|'BOMB_FUSE'|'FARKLE_ANIM'|'REACTION'|'GAME_OVER';
export type GameMode = 'SOLO_CASINO'|'SOLO_FREE'|'VS_CASINO'|'VS_FREE'|'RALLY_FREE'|'RALLY_CASINO';
export type RallyRole = 'RAINMAKER'|'HEADHUNTER'|'ARCHIVIST'|'CONDUCTOR';

/** XP progression section — maps to one of the four Rally roles.
 *  Determines which section a player's XP is credited to. */
export type XPSection = 'HEADHUNTER' | 'CONDUCTOR' | 'RAINMAKER' | 'ARCHIVIST';

/** Display title shown next to a player's name.
 *  Derived from their highest XP section level. Cosmetic only — no RTP effect. */
export type PlayerTitle =
  | 'Recruit' | 'Apprentice' | 'Storm Chaser' | 'Scribe'
  | 'Hunter' | 'Conductor' | 'Rainmaker' | 'Archivist'
  | 'Bounty Hunter' | 'Lead' | 'Tempest' | 'Chronicler'
  | 'Elite' | 'Grand' | 'Cyclone' | 'Grand Archivist'
  | 'Master Headhunter' | 'Master Conductor'
  | 'Master Rainmaker' | 'Master Archivist';

export type ReactionVote = 'UP'|'DOWN'|null;

export const FACE_TO_COLOR: Record<DieFace,DieColor> = {
  1:'RED', 2:'ORANGE', 3:'YELLOW', 4:'GREEN', 5:'BLUE', 6:'PURPLE'
};

export const COLOR_TO_TAILWIND: Record<DieColor,string> = {
  RED:    'bg-rose-500',
  ORANGE: 'bg-orange-500',
  YELLOW: 'bg-amber-400',
  GREEN:  'bg-emerald-500',
  BLUE:   'bg-sky-500',
  PURPLE: 'bg-violet-600',
};

export interface Cell {
  id: string;
  face: DieFace | null;
  /** Die color, blocker type, bomb type, or NONE for empty cells. */
  type: DieColor | BlockerType | 'BOMB_STANDARD' | 'BOMB_RAINBOW' | 'NONE';
  state: CellState;
  health?: number;  // Stone blocker only: 2 → 1 → 0
  fuseMs?: number;  // Bomb cells only: countdown from 3000 to 0
}

export interface GridPos { row: number; col: number; }

export const MULTIPLIER_LADDER: readonly number[] = [1.0,1.25,1.5,2.0,3.0,4.0] as const;

export function getMultiplier(step: number): number {
  return MULTIPLIER_LADDER[Math.min(step, MULTIPLIER_LADDER.length - 1)];
}

export interface ActiveBomb {
  id: string; type: BombType;
  row: number; col: number;
  fuseMs: number;
  targetColor?: DieColor; // Rainbow: set at detonation
}

export interface ChainResult {
  score: number;
  scaledScore: number;
  isFarkle: boolean;
  combo: string;
  triggersBomb: BombType | null;
}

export interface ScorePopup {
  id: string; row: number; col: number;
  score: number; label: string;
  color: 'green'|'red'|'gold';
}

export interface GameState {
  phase: GamePhase;
  grid: Cell[][];
  banked: number;
  unbanked: number;
  multiplierStep: number;
  consecutiveChains: number;
  activeBombs: ActiveBomb[];
  popups: ScorePopup[];
  farklePool: number;
  lastChainResult: ChainResult | null;
}

export interface Player {
  id: string; name: string; banked: number;
  role?: RallyRole; isActive: boolean;
  vote: ReactionVote; isConnected: boolean;
}

export interface LobbySettings {
  mode: GameMode;
  playerCount: 1|2|3|4;
  turnTimerSeconds: 10|15|20;
  blockerDensity: 'LOW'|'MEDIUM'|'HIGH';
  threeOnesScore: 1000|300;
  singleOneScore: number;
  rainbowRedReward: number;
  rainbowBlueReward: number;
  betAmount?: number;
}

/**
 * Per-mode RTP configuration used by RTPEngine and Monte Carlo simulations.
 * RTP is purely decision-based (Deuces Wild model) — spawn weights are always
 * uniform and are never adjusted per player or session.
 * @property mode        - The game mode this config applies to.
 * @property targetRTP   - Base RTP target (e.g. 0.82 for SOLO floor).
 * @property platformFee - Fee deducted from pot: 0.0 FREE, 0.02 CASINO VS/RALLY.
 * @property poolSize    - Spawn pool tile count for this mode (60/66/84/102).
 */
export interface RTPConfig {
  mode: GameMode;
  targetRTP: number;
  platformFee: number;
  poolSize: number;
}

export const DEFAULT_SETTINGS: LobbySettings = {
  mode:'SOLO_FREE', playerCount:1, turnTimerSeconds:10,
  blockerDensity:'MEDIUM', threeOnesScore:1000,
  singleOneScore:100, rainbowRedReward:100, rainbowBlueReward:50
};

/**
 * Returns the correct grid size for any multiplayer session (VS or Rally)
 * based on player count. VS and Rally share identical board sizes.
 * 1P → 7×7 (SP only)  |  2P → 8×8  |  3P → 9×9  |  4P → 10×10
 */
export function multiplayerGridSize(players: number): number {
  return ({1:7,2:8,3:9,4:10} as Record<number,number>)[players] ?? 8;
}

export const GAME_CONSTANTS = {
  MAX_CHAIN: 6,
  FUSE_MS: 3000,
  BOMB_RADIUS: 1,
  STONE_HP: 2,
  BOMB_DIE_PTS: 100,
  BOMB_STONE_PTS: 50,
  ARCHIVIST_PCT: 0.15,
  REACTION_MS: 3000,
  CASCADE_MS: 80,
} as const;

export const RALLY_MILESTONES = [
  { tier:1 as const, threshold:10_000,  mult:0.5 },
  { tier:2 as const, threshold:25_000,  mult:1.0 },
  { tier:3 as const, threshold:50_000,  mult:2.0 },
  { tier:4 as const, threshold:100_000, mult:5.0 },
];

// WebSocket protocol
export type ClientMsg =
  | { type:'JOIN_ROOM';    roomId:string; clientSeed:string; playerName:string; role?:RallyRole }
  | { type:'SUBMIT_CHAIN'; chain:GridPos[] }
  | { type:'BANK' }
  | { type:'PASS' }
  | { type:'VOTE_REACT';   vote:'UP'|'DOWN'; hold:boolean }
  | { type:'LEAVE_ROOM' };

export type ServerMsg =
  | { type:'ROOM_STATE';      grid:Cell[][]; players:Player[]; activePlayerId:string; phase:GamePhase }
  | { type:'BOARD_UPDATE';    grid:Cell[][] }
  | { type:'CHAIN_RESULT';    playerId:string; result:ChainResult }
  | { type:'TURN_CHANGE';     activePlayerId:string; timerMs:number }
  | { type:'BOMB_SPAWNED';    bomb:ActiveBomb }
  | { type:'BOMB_DETONATED';  bombId:string; affectedCells:GridPos[]; totalScore:number }
  | { type:'REACTION_WINDOW'; timeMs:number; unbanked:number; multiplierStep:number }
  | { type:'VOTE_UPDATE';     votes:{playerId:string; vote:ReactionVote}[] }
  | { type:'MILESTONE_HIT';   tier:1|2|3|4; payout:number }
  | { type:'SEED_REVEAL';     serverSeed:string; combinedSeed:string }
  | { type:'GAME_OVER';       winner?:string; finalScores:Record<string,number>; replayHash:string }
  | { type:'ERROR';           message:string };
