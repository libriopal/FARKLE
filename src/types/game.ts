/**
 * @file game.ts
 * @description Master TypeScript type definitions for Match-3 Farkle Frenzy.
 * Contains all shared types, interfaces, enums, and constants used across the application.
 */

// ============================================================================
// PRIMITIVE TYPES & CONSTANTS
// ============================================================================

/** The six possible face values of a die. */
export type DieFace = 1 | 2 | 3 | 4 | 5 | 6;

/** The visual colors corresponding to the six die faces. */
export type DieColor = 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN' | 'BLUE' | 'PURPLE';

/** The three distinct types of blockers in the game. */
export type BlockerType = 'STONE' | 'ICE' | 'LOCK';

/** The overarching type of a cell's contents. */
export type CellType = DieColor | BlockerType | 'NONE';

/** The interactive state of a cell. */
export type CellState = 'NORMAL' | 'EMPTY' | 'SPAWNING' | 'FROZEN' | 'LOCKED';

/** The six steps of the multiplier ladder. */
export type MultiplierStep = 0 | 1 | 2 | 3 | 4 | 5;

/** The actual multiplier values corresponding to each step. */
export const MULTIPLIER_LADDER: readonly [number, number, number, number, number, number] = [
  1.0, 1.25, 1.5, 2.0, 3.0, 4.0
] as const;

// ============================================================================
// GRID & CELL STRUCTURES
// ============================================================================

/**
 * Represents a single cell on the game board.
 */
export interface Cell {
  /** Stable unique ID for React key reconciliation (nanoid). */
  id: string;
  /** Die face value; null if the cell is a blocker or empty. */
  face: DieFace | null;
  /** Derived from face or blocker status; used for rendering. */
  type: CellType;
  /** Current interactive state. */
  state: CellState;
  /** Stone Blocker durability; 2=intact, 1=cracked. Undefined for other types. */
  health?: number;
}

/** A 2D array representing the game board. */
export type Grid = Cell[][];

/** A simple coordinate pair for grid positions. */
export interface Position {
  row: number;
  col: number;
}

// ============================================================================
// SCORING & GAME MECHANICS
// ============================================================================

/**
 * The result returned by the pure Farkle scoring engine.
 */
export interface ScorerResult {
  /** The maximum possible score for the evaluated chain. */
  score: number;
  /** True if the chain scored 0 (a Farkle). */
  isFarkle: boolean;
  /** A human-readable string describing the scoring combination(s). */
  combo: string;
  /** True if the chain contained six of the same face (triggers Standard Bomb). */
  isSixOfAKind: boolean;
  /** True if the chain contained faces 1-2-3-4-5-6 (triggers Rainbow Bomb). */
  isStraight: boolean;
}

/** The two types of bombs available in the game. */
export type BombType = 'STANDARD' | 'RAINBOW';

/**
 * Represents an active bomb currently ticking down on the board.
 */
export interface ActiveBomb {
  /** Unique ID for the bomb instance. */
  id: string;
  /** The type of bomb (Standard or Rainbow). */
  type: BombType;
  /** Row position of the bomb. */
  row: number;
  /** Column position of the bomb. */
  col: number;
  /** Remaining fuse time in milliseconds. */
  fuseMs: number;
  /** The target color for a Rainbow Bomb (determined at detonation). */
  targetColor?: DieColor;
}

/**
 * Represents a floating score popup animation.
 */
export interface ScorePopup {
  /** Unique ID for the popup instance. */
  id: string;
  /** The score value to display. */
  score: number;
  /** The text label to display alongside the score. */
  label: string;
  /** Row position where the popup should originate. */
  row: number;
  /** Column position where the popup should originate. */
  col: number;
  /** True if the popup represents a Farkle (styles it red). */
  isFarkle?: boolean;
}

// ============================================================================
// MODES, ROLES & SETTINGS
// ============================================================================

/** The six available game modes. */
export type GameMode = 
  | 'SP_FREE' 
  | 'SP_CASINO' 
  | 'VS_FREE' 
  | 'VS_CASINO' 
  | 'RALLY_FREE' 
  | 'RALLY_CASINO';

/** The four distinct roles available in Rally modes. */
export type PlayerRole = 'RAINMAKER' | 'HEADHUNTER' | 'ARCHIVIST' | 'CONDUCTOR';

/** The density tiers for blocker generation. */
export type BlockerDensity = 'LOW' | 'MEDIUM' | 'HIGH';

/**
 * Configuration settings for a game session, determined in the lobby.
 */
export interface LobbySettings {
  /** The selected game mode. */
  mode: GameMode;
  /** Number of players (1 for SP, 2-4 for VS/Rally). */
  playerCount: 1 | 2 | 3 | 4;
  /** Turn timer duration in seconds (multiplayer only). */
  turnTimerSeconds: 10 | 15 | 20;
  /** The density of blockers to spawn on the board. */
  blockerDensity: BlockerDensity;
  /** Score override for Three 1s (default 1000). */
  threeOnesScore: number;
  /** Score override for a Single 1 (default 100). */
  singleOneScore: number;
  /** Score override for a Red tile destroyed by a Rainbow Bomb (default 100). */
  rainbowRedReward: number;
  /** Score override for a Blue tile destroyed by a Rainbow Bomb (default 50). */
  rainbowBlueReward: number;
  /** Bet amount for casino modes ($1 to $1000). */
  betAmount: number;
}

// ============================================================================
// GAME STATE
// ============================================================================

/** The high-level phases of the game state machine. */
export type GamePhase = 
  | 'IDLE' 
  | 'REFILLING' 
  | 'BOMB_COUNTDOWN' 
  | 'REACTION_WINDOW' 
  | 'GAME_OVER';

/**
 * The core state object for a singleplayer game session.
 */
export interface GameState {
  /** The 2D array of cells. */
  grid: Grid;
  /** The current phase of the game loop. */
  phase: GamePhase;
  /** The permanent, safe score total. */
  banked: number;
  /** The at-risk score total accumulated during the current streak. */
  unbanked: number;
  /** The current step on the multiplier ladder (0-5). */
  multiplierStep: MultiplierStep;
  /** The number of consecutive scoring chains (used to cap multiplierStep). */
  consecutiveChains: number;
  /** Active floating score popups. */
  popups: ScorePopup[];
  /** Active bombs ticking down on the board. */
  bombs: ActiveBomb[];
  /** The shared pool of lost points (used primarily in Rally mode). */
  farklePool: number;
}

// ============================================================================
// MULTIPLAYER & WEBSOCKET PROTOCOL
// ============================================================================

/**
 * Represents a player in a multiplayer session.
 */
export interface Player {
  /** Unique ID for the player. */
  id: string;
  /** Display name of the player. */
  name: string;
  /** The player's assigned role (Rally mode only). */
  role?: PlayerRole;
  /** The player's current banked score. */
  banked: number;
  /** True if the player's WebSocket is currently connected. */
  isConnected: boolean;
}

// --- Client to Server Messages ---

export interface JoinRoomPayload { roomId: string; clientSeed: string; playerName: string; role?: PlayerRole; }
export interface SubmitChainPayload { chain: Position[]; }
export interface VoteReactPayload { vote: 'UP' | 'DOWN'; hold: boolean; }

/** All possible messages sent from the Client to the Server. */
export type ClientMessage =
  | { type: 'JOIN_ROOM'; payload: JoinRoomPayload }
  | { type: 'SUBMIT_CHAIN'; payload: SubmitChainPayload }
  | { type: 'BANK' }
  | { type: 'PASS' }
  | { type: 'VOTE_REACT'; payload: VoteReactPayload }
  | { type: 'LEAVE_ROOM' };

// --- Server to Client Messages ---

export interface RoomStatePayload { grid: Grid; players: Player[]; activePlayerId: string; phase: GamePhase; }
export interface BoardUpdatePayload { grid: Grid; }
export interface ChainResultPayload { playerId: string; result: ScorerResult; }
export interface TurnChangePayload { activePlayerId: string; timerMs: number; }
export interface BombSpawnedPayload { bomb: ActiveBomb; }
export interface BombDetonatedPayload { bombId: string; affectedCells: Position[]; totalScore: number; }
export interface ReactionWindowPayload { timeMs: number; unbanked: number; multiplierStep: MultiplierStep; }
export interface VoteUpdatePayload { votes: { playerId: string; vote: 'UP' | 'DOWN' }[]; }
export interface MilestoneHitPayload { tier: number; payout: number; playerPayouts: Record<string, number>; }
export interface SeedRevealPayload { serverSeed: string; combinedSeed: string; }
export interface GameOverPayload { winner?: string; finalScores: Record<string, number>; replayHash: string; }
export interface ErrorPayload { message: string; }

/** All possible messages sent from the Server to the Client. */
export type ServerMessage =
  | { type: 'ROOM_STATE'; payload: RoomStatePayload }
  | { type: 'BOARD_UPDATE'; payload: BoardUpdatePayload }
  | { type: 'CHAIN_RESULT'; payload: ChainResultPayload }
  | { type: 'TURN_CHANGE'; payload: TurnChangePayload }
  | { type: 'BOMB_SPAWNED'; payload: BombSpawnedPayload }
  | { type: 'BOMB_DETONATED'; payload: BombDetonatedPayload }
  | { type: 'REACTION_WINDOW'; payload: ReactionWindowPayload }
  | { type: 'VOTE_UPDATE'; payload: VoteUpdatePayload }
  | { type: 'MILESTONE_HIT'; payload: MilestoneHitPayload }
  | { type: 'SEED_REVEAL'; payload: SeedRevealPayload }
  | { type: 'GAME_OVER'; payload: GameOverPayload }
  | { type: 'ERROR'; payload: ErrorPayload };

// ============================================================================
// DATABASE SCHEMA (SUPABASE)
// ============================================================================

/**
 * Represents a row in the Supabase 'scores' table.
 */
export interface ScoreRecord {
  /** UUID primary key. */
  id: string;
  /** Persistent anonymous ID from localStorage. */
  player_id: string;
  /** Display name (max 20 chars). */
  player_name: string;
  /** Final banked score. */
  score: number;
  /** The game mode played. */
  mode: GameMode;
  /** The role played (Rally mode only). */
  role?: PlayerRole;
  /** The team size (Rally mode only). */
  team_size?: number;
  /** SHA-256 hash for provably fair verification. */
  seed_hash: string;
  /** Timestamp of score submission. */
  achieved_at: string;
}

// FILE COMPLETE

/*
INTEGRATION NOTE:
- Imported by: Almost every file in the project (utils, hooks, components, server).
- Imports from: None (this is the root dependency).
- Key exports: DieFace, Cell, Grid, ScorerResult, GameState, ClientMessage, ServerMessage, MULTIPLIER_LADDER.
*/
