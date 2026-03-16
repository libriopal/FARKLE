# FARKLE FRENZY PROJECT MEMORY

## SECTION 1 — PROJECT OVERVIEW

* **Title:** Farkle Frenzy
* **Type:** Casino-grade browser puzzle game
* **Stack:** React 19 + TypeScript 5.8 + Vite 6 + Tailwind CSS v4 + Motion v12 + Express v4 + WebSocket + Supabase
* **Build:** Google AI Studio + Gemini 2.5 Pro (Claude verifies all output)
* **Platform:** Mobile-first browser game
* **Status:** Update 05 of 10 complete

---

## SECTION 2 — GAME MODES

**Six modes:**
* `SOLO_FREE` (renamed from SP_FREE)
* `SOLO_CASINO` (renamed from SP_CASINO)
* `VS_FREE`
* `VS_CASINO`
* `RALLY_FREE`
* `RALLY_CASINO`

**Grid sizes:**
* **SOLO:** 7×7
* **2 players:** 8×8
* **3 players:** 9×9
* **4 players:** 10×10
* *Note:* VS and Rally share identical grid sizes. Use function: `multiplayerGridSize()`

**Display to players:**
* Free modes only shown in lobby.
* Casino modes hidden behind `/admin` route.
* Admin password: `FARKLE_ADMIN` (temp).
* Future: full admin user auth via Supabase.

---

## SECTION 3 — SCORING TERMINOLOGY & MATH

### Terminology Table

| Term | Symbol | Definition |
| :--- | :---: | :--- |
| **Die** | `d` | Individual game piece |
| **Face** | - | Value 1-6 on a die |
| **Rolling Chain** | `r` | Pre-committed, user still dragging |
| **Rolled Chain** | `R` | Committed, sent to scorer |
| **Partition** | `p` | Subset of R forming one combo |
| **Valid Partition** | `v` | `score(p) > 0` |
| **Farkled Partition** | `φ` | `score(p) = 0` |
| **Partitioned Chain** | `P` | Grouping of partitions |
| **Validated Chain** | `V` | `λ=∅` AND `σ=false` AND all `p` valid |
| **Farkled Chain** | `F` | `λ≠∅` OR `σ=true` OR `score=0` |
| **Score** | `S` | `Σ score(p)` for all `p` in `Π(R)` |
| **Multiplier** | `M` | Current ladder multiplier |
| **Scaled Score** | `S'` | `S × M` |
| **Solo Single** | `σ` | `\|R\|=1` AND face ∈ `{1,5}` |
| **Leftover Die** | `λ` | Die in `R` belonging to no valid `p` |
| **Max Partition** | `Π` | Optimal non-overlapping partitions |
| **Farkled** | event | Chain fails validation |
| **Validated** | event | Chain passes validation |

### Math & Logic

```text
R = {d₁...dₙ} where 2 ≤ n ≤ 6
Π(R) = optimal non-overlapping partitions
λ(R) = R − Σ die used in Π(R)
```

**Key Inequalities:**
* `V ≠ P`, `V ⊂ P`, `F ∩ V = ∅`
* `S(F) = 0`, `S(V) > 0`
* `λ(V) = ∅`, `λ(F) ≠ ∅ ∨ σ`

### Language Rules
* ✅ "The chain was Farkled"
* ✅ "A Farkled chain scores zero"
* ✅ "The chain was Validated"
* ❌ "The chain is a Farkle"
* ❌ "Farkle chain"

---

## SECTION 4 — SCORING COMBINATIONS TABLE

| Combination | Points |
| :--- | :--- |
| Single 1 | 100pts |
| Single 5 | 50pts |
| Three 1s | 1000pts (configurable) |
| Three N | N × 100pts |
| Four of a Kind | 1000pts |
| Five of a Kind | 2000pts |
| Six of a Kind | 3000pts + Standard Bomb |
| Straight (1-2-3-4-5-6) | 1500pts + Rainbow Bomb |
| Three Pairs | 1500pts |
| Two Triplets | 2500pts |
| Four + Pair | 1500pts |

### New V/F Rules
* **Solo Single (σ):** `[1]` or `[5]` alone = Farkled
* **Leftover die (λ):** Any die not in a valid partition = entire chain Farkled
* **Order independence:** `[1,5,1,1]` scores same as `[1,1,1,5]` = 1050pts

### Validated/Farkled Examples
* `[1,1,1,5]` → **Validated** S=1050
* `[1,5]` → **Validated** S=150
* `[1,3,3,3]` → **Validated** S=400
* `[1,2,3]` → **Farkled** S=0
* `[1,5,3]` → **Farkled** S=0
* `[1]` alone → **Farkled** S=0
* `[5]` alone → **Farkled** S=0

---

## SECTION 5 — MULTIPLIER LADDER

* **Steps:** ×1.0 / ×1.25 / ×1.5 / ×2.0 / ×3.0 / ×4.0
* **Advances:** On each Validated chain.
* **Resets:** On Farkled chain OR Bank action.
* **Bombs:** Do NOT reset or advance the ladder.
* **Cap:** Step 5 (×4.0).

---

## SECTION 6 — CHAIN MECHANICS

* 4-directional adjacency only (no diagonals).
* Maximum 6 tiles, minimum 2 tiles.
* Any mix of face values (no same-type requirement).
* **Backtrack:** Re-enter second-to-last tile removes last.
* **Commit:** On pointer-up or pointer-leave from board.
* **Lock Blockers:** Can be chained (to unlock).
* **Stone and Ice:** Cannot be chained.
* **`releasePointerCapture`:** Called on pointerdown (critical for mobile cross-tile drag).

---

## SECTION 7 — BLOCKERS

### STONE
* **Durability:** 2 hits
* **Damage:** Adjacent chain damage
* **Bomb:** Destroyable (1 hit with Headhunter)
* **Points:** 50pts when destroyed
* Cannot be chained

### ICE
* **Destruction:** Bomb-only destruction
* Cannot be chained
* **Points:** 0pts
* Chains cannot include

### LOCK
* **Destruction:** Chain-to-unlock (must score > 0)
* Contributes face value to chain score
* Immune to all bombs
* Can be chained

---

## SECTION 8 — BOMBS

### STANDARD BOMB
* **Trigger:** Six of a Kind
* **Radius:** 3×3 (`BOMB_RADIUS = 1`)
* **Fuse:** 3000ms
* **Normal die:** 100pts each
* **Stone:** 50pts each
* **Ice:** 0pts (still destroyed)
* **Lock:** Immune
* Does NOT reset multiplier

### RAINBOW BOMB
* **Trigger:** Straight (1-2-3-4-5-6)
* **Effect:** Board-wide color clear
* **Fuse:** 3000ms cycling
* **Red tiles:** `rainbowRedReward × multiplier`
* **Blue tiles:** `rainbowBlueReward × multiplier`
* **Others:** 0pts (still destroyed)
* **Rainmaker role:** Chooses target color
* Does NOT reset multiplier

---

## SECTION 9 — RALLY ROLES

* **RAINMAKER:** Chooses Rainbow Bomb color (XP Section: 3)
* **HEADHUNTER:** Destroys Stone Blockers in 1 hit (XP Section: 1)
* **ARCHIVIST:** Recovers 15% of Farkle Pool per Validated chain (XP Section: 4)
* **CONDUCTOR:** Pass gives incoming player +1 multiplier step (XP Section: 2)

**Rally options:** Continue / Bank / Pass
**Reaction window:** 3 seconds for non-active players

---

## SECTION 10 — RTP SYSTEM

**Skill-based RTP scaling:**
* **Floor:** 82% (new player)
* **Ceiling:** 102% (master player)
* **Formula:** `RTP(skill) = 0.82 + (skill × 0.20)`
* **Benchmark:** 1,000,000 simulated sessions
* **Update:** Every 10 sessions

**Mode RTP targets:**
* `SOLO_FREE`: 82% → 102% skill-scaled
* `SOLO_CASINO`: 82% → 102% skill-scaled
* `VS_FREE`: 100% (PvP balanced)
* `VS_CASINO`: ~98% (100% minus 2% platform fee)
* `RALLY_FREE`: 82% → 102% skill-scaled
* `RALLY_CASINO`: ~98% ante + skill-scaled bonus

**VS/Rally betting:**
* **Model:** Ante pool — winner takes pot
* **Platform fee:** 2% of total pot
* **Side bets:** Planned Update 17+
* No house edge on main bet (PvP is skill game)

**Casino modes:**
* Hidden in lobby (admin only)
* Admin route: `/admin`
* Temp password: `FARKLE_ADMIN`
* Future: Supabase admin user auth

---

## SECTION 11 — LEVEL & XP SYSTEM

* **Total levels:** 46,656 (matches base-6 index space)

**4 Sections:**
* **Section 1 Headhunter:** levels 1 → 11,664
* **Section 2 Conductor:** levels 11,665 → 23,328
* **Section 3 Rainmaker:** levels 23,329 → 34,992
* **Section 4 Archivist:** levels 34,993 → 46,656

* **Overall level:** Sum of all 4 section levels
* **Title:** Highest section
* *Example:* `username123[lv3788 Headhunter]`

**XP Formula:**
* **Solo/VS:** `xp = S × quality(1-4) × casino_mult`
* **Rally:** `xp = S × casino_mult → section[role]`
* **Casino multiplier:** ×1.5 vs free mode

**Section titles by level range (each section):**
* **1-999:** Recruit / Apprentice / Storm Chaser / Scribe
* **1000-2999:** Hunter / Conductor / Rainmaker / Archivist
* **3000-5999:** Bounty Hunter / Lead / Tempest / Chronicler
* **6000-9999:** Elite / Grand / Cyclone / Grand Archivist
* **10000+:** Master [Section Name]

---

## SECTION 12 — REWARDS SYSTEM

**Unlock types:**
* Thumbnails, Theme Packs, Coins, Avatar Items (wearables), Avatar Base

**Unlock triggers:**
* Level milestones (every 100 levels)
* Section completion
* Casino play bonus coins
* Streaks (no-farkle streak rewards)
* Daily login bonus

**Coin economy:**
* **Earn:** Gameplay, login, level up
* **Spend:** Avatar items, theme packs, special casino table entry
* Never pay-to-win — cosmetic only

---

## SECTION 13 — CHAIN INDEX OPTIMIZATION

**Base-6 encoding with length prefix (Option C):**
```text
encode(faces, length):
  base6 = Σ (face[i]-1) × 6^(5-i)
  index = (length-1) × 46656 + base6
```

* **Table size:** 279,936 entries (6 × 46,656)
* **Bitmap:** ~273KB (fits L3 cache)
* **Score table:** ~2.2MB
* **Lookup:** O(1) array access

**Integrity check:**
* **Write:** `faces[]` + `length`
* **Store:** `(length-1)×46656 + base6`
* **Read:** `decode` → original `faces[]`
* **Collision:** Length prefix prevents any ambiguity
* **Round trip:** `encode(decode(x)) = x` ✅

**Smart spawn (dead board prevention):**
* Check bitmap per spawn position
* Bias 70% toward valid-chain-creating faces
* Dead board probability: ~0%
* `recoverDeadBoard()`: deleted
* `hasValidChain()` full scan: safety net only

**Performance improvement:**
* Score lookup: O(n!) → O(1) (~500× faster)
* Dead board check: O(n×6^6) → O(n×neighbors)
* Monte Carlo: ~2000ms → ~100ms startup

---

## SECTION 14 — BUILD SEQUENCE

**Updates 01-05: COMPLETE ✅**
* 01: Foundation (types, scorer, csprng, RTPEngine)
* 02: Grid & Chain (gridUtils, floodFill, useChain)
* 03: State Machine (useGame)
* 04: Core UI (Tile, Grid, MultiplierLadder, BankButton, ScorePopup)
* 05: Bombs/HUD/Audio (Bomb, RainbowBomb, HUD, useAudio)

**Current patches in progress:**
* `chainIndex.ts` (new)
* `rtpConfig.ts` (new)
* `monteCarlo.ts` (new)
* `farkleScorer.ts` (V/F rules + O(1))
* `gridUtils.ts` (smartSpawn)
* `RTPEngine.ts` (O(1) scoring)
* `Grid.tsx` (score preview O(1) + useMemo)
* `useGame.ts` (new scoring system)
* `scripts/monte-carlo.sh` + `.ts`

**Updates 06-10: PLANNED**
* 06: Lobby & Routing
* 07: WebSocket Server
* 08: Multiplayer UI
* 09: Supabase Leaderboard
* 10: Production + WebGL2 Canvas

**Future Updates 11+:**
* 11: XP system + level tracking
* 12: Player profile + titles
* 13: Avatar system
* 14: Rewards + coin economy
* 15: Theme packs
* 16: Social features + hosting
* 17: Side bets (VS/Rally)

---

## SECTION 15 — TECHNICAL CONSTRAINTS

* TypeScript strict mode — no implicit any
* All game types in `src/types/game.ts`
* **CSPRNG:** HMAC-SHA256 via Web Crypto API
  * `Math.random()`: never for game events
  * *Exception:* `randomColor()` (cosmetic only)
  * *Exception:* audio noise buffer (synthesis)
  * *Exception:* Monte Carlo simulations
* **nanoid:** all unique IDs
* **`multiplayerGridSize()`:** VS and Rally both use this (NOT `rallyGridSize()`)
* **State authority:**
  * Singleplayer: `useGame` hook
  * Multiplayer: `GameRoom` server class
* **better-sqlite3:** not available on Android/Termux
  * *Replacement:* `sql.js` (pure JS SQLite)
* **`CASCADE_MS`:** 80 (configurable in `GAME_CONSTANTS`)
* **React StrictMode:** disabled (breaks cascade timing)

---

## SECTION 16 — AD INTEGRATION

**Networks:** Google AdSense (web) + AppLovin MAX (mobile)

**Placements:**
* **Lobby banner:** 728×90 (AdSense)
* **Pre-game interstitial:** full screen (AppLovin)
* **Post-game banner:** 320×50 (AdSense)
* **GameOver:** rewarded ad option (AppLovin)

**Rewarded ad mechanic:**
* After Farkle: "Watch ad to recover 50% of Farkle Pool" — retention mechanic
* After game over: "Watch ad to continue"

**Current status:** Placeholder components only
* `AdSlot.tsx` with correct size containers
* Real SDK drops in when monetization begins

---

## SECTION 17 — VISUAL DESIGN

**Two themes:** Dark and Light
**Toggle:** Pill switch in lobby settings

**Dark theme:**
* **Background:** `#0a0a0f`
* **Die body:** Very dark charcoal with color tint
* **Pips:** Solid filled glowing circles
* Glow bleeds onto die face and shadow
* **Board:** Near-black felt surface

**Light theme:**
* **Background:** `#f0ebe0` warm cream
* **Die body:** Fully saturated vivid solid color
* **Pips:** Small solid black circles
* **Shadow:** Long directional soft drop shadow
* **Board:** Warm light surface

**3D dice:** Three visible faces (top, right, bottom)
* **Corner radius:** 24% (near-spherical cube)
* **Top face:** Primary, shows pips
* **Right face:** 40-45% brightness
* **Bottom face:** 32-44% brightness

**Planned:**
* WebGL2 canvas overlay (Update 10)
* Particle bursts on chain commit
* Combo shockwave
* Board tilt with inertia
* Post-launch: WebGPU tile mesh extrusion

---

## SECTION 18 — ADMIN SYSTEM

**Route:** `/admin`
**Current auth:** Hardcoded password `FARKLE_ADMIN`
**Future auth:** Supabase admin user table (email + password + admin role, session-based access)

**Admin features:**
* Casino mode unlock in lobby
* Bot player creation and management
* RTP dashboard per mode
* Monte Carlo simulation runner
* Leaderboard management
* XP/level adjustment tools

**Access method roadmap:**
* **Now:** `/admin` URL + password
* **Later:** Secret tap sequence on logo (5 taps)
* **Future:** Dedicated admin user credentials
