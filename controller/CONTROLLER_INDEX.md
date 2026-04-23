# CONTROLLER SYSTEM INDEX

## 1. SYSTEM OVERVIEW

The `ff-controller` system is a deterministic, automated patch management framework within the Farkle Frenzy monorepo. It manages the lifecycle of code modifications from LLM-based generation to validated production integration.

- **Current behavior:** Manual or semi-automated patching using external controller logic for staging and validation. It leverages AST/Regex for foundational fixes, AI for targeted diffs/rewrites, and an isolated test-driven loop for verification.
- **How patches are applied today:** Patches are initiated either via direct CLI commands using the `ff-controller` or through AI studio prompts that trigger the self-healing loop by appending the trigger block to the prompt generation.
- **How validation works:** Validation is performed via a three-layered approach: bash integration scripts (for side effects), isolated and reverted test runs using `vitest`, and finally, global `tsc` checks.
- **How repair/self-healing works:** The Repair Engine processes failures iteratively (max 5 cycles). It attempts structured AST fixes (`ts-morph`), then regex-based cleanup, then AI-driven differential patches, and finally, a full module rewrite, all within an isolated staging environment.

---

## 2. TARGET BEHAVIOR (CRITICAL)

The intended system is a fully automated patch-and-repair loop:

1. **User sends:** "controller [PROMPT_ID] --auto" (or triggers via Studio prompt).
2. **System:**
   1. **Ingest-Generate:** Maps PROMPT_ID to target file in `ff-config.json`, ingests patch prompt, and generates initial code.
   2. **Stage:** Writes code to a temporary, isolated staging file (`.ff-verify/temp/`).
   3. **Validate:** Executes Bash validation → Isolated Vitest run.
   4. **Self-heal Loop:** If validation fails, the Repair Engine attempts:
      - AST Fixes
      - Regex Fixes
      - AI Patch Application
      - AI Full Rewrite
      - Loop validation until success (or failure after 5 attempts).
   5. **Commit/Output:** Only upon successful validation is the staging file atomically renamed to the target file.
   6. **Verify:** Final global `tsc --noEmit` check.
   7. **Commit:** Git commit of the validated changes.

- **Studio self-healing loop behavior:** Integrated via the `TRIGGER_SELF_HEALING_LOOP` block appended to patch prompts, ensuring automated execution without manual manual prompting between iterations.
- **External controller loop behavior:** Full CLI-driven, non-interactive shell execution.
- **Expected automation level:** Minimal manual oversight; manual intervention reserved for escalation reports (`.ff-verify/reports/`).

---

## 3. FILE INDEX

[FILE]
Path: /controller/ff-config.json
Type: config
Purpose: Maps PROMPT_ID to target source scope.
Used By: /controller/controller.ts
Depends On: N/A

[FILE]
Path: /controller/controller.ts
Type: controller
Purpose: CLI entry point, pre-flight environment checks, orchestrator initialization.
Used By: CLI
Depends On: /controller/validator.ts, /controller/orchestrator.ts, /controller/fileManager.ts

[FILE]
Path: /controller/orchestrator.ts
Type: controller
Purpose: Workflow manager bridging Git, AI generation, testing, and atomic rollback/writes.
Used By: /controller/controller.ts
Depends On: /controller/gitService.ts, /controller/aiService.ts, /controller/repairEngine.ts

[FILE]
Path: /controller/fileManager.ts
Type: validator
Purpose: Disk staging, atomic file operations, lock handling.
Used By: /controller/orchestrator.ts, /controller/repairEngine.ts
Depends On: fs, path

[FILE]
Path: /controller/gitService.ts
Type: controller
Purpose: Manages Git safety checks, clean-room commit/push/escalation.
Used By: /controller/orchestrator.ts
Depends On: /controller/validator.ts

[FILE]
Path: /controller/aiService.ts
Type: controller
Purpose: Gemini API interface for generation/diff/rewriting.
Used By: /controller/orchestrator.ts, /controller/repairEngine.ts
Depends On: @google/genai

[FILE]
Path: /controller/repairEngine.ts
Type: repair
Purpose: The iteration loop managing repair heuristics and logging.
Used By: /controller/orchestrator.ts
Depends On: /controller/logger.ts, /controller/deterministicRepair.ts, /controller/aiService.ts

[FILE]
Path: /controller/deterministicRepair.ts
Type: repair
Purpose: AST-based and Regex-based code corrections.
Used By: /controller/repairEngine.ts
Depends On: ts-morph

[FILE]
Path: /controller/logger.ts
Type: validator
Purpose: Aggregates attempt metrics, logs hashes, handles escalation dumps.
Used By: /controller/repairEngine.ts
Depends On: fs, path, crypto

[FILE]
Path: /controller/pipelineValidator.ts
Type: validator
Purpose: Sequenced execution of Bash validation → Vitest Isolated Integration.
Used By: /controller/orchestrator.ts, /controller/repairEngine.ts
Depends On: /controller/validator.ts

[FILE]
Path: /controller/validator.ts
Type: validator
Purpose: Secured wrapper for external shell commands (`child_process`).
Used By: /controller/controller.ts, /controller/gitService.ts, /controller/pipelineValidator.ts
Depends On: child_process

[FILE]
Path: /controller/patchinstructions.md
Type: controller
Purpose: Studio-specific prompt instructions for automated consistency.
Depends On: /controller/system_instructions.md

---

## 4. PATCH FILES (APPEND DIRECTORY)

[PATCH]
Name: A1
Purpose: Shared types patch
Target File: packages/shared/src/types.ts
Self-Healing Enabled: YES
Notes: Base foundation patch.

[PATCH]
Name: A2
Purpose: SixPoolManager integration
Target File: packages/engine/src/gridUtils.ts
Self-Healing Enabled: YES
Notes: Major structural logic replacement.

[PATCH]
Name: A3
Purpose: Wild Blocker resolution
Target File: packages/engine/src/farkleScorer.ts
Self-Healing Enabled: YES
Notes: Extends base scoring system.

[PATCH]
Name: A4
Purpose: Monte Carlo + RTP Patch
Target File: packages/engine/src/monteCarlo.ts
Self-Healing Enabled: YES
Notes: High-stakes simulation update.

[PATCH]
Name: B1
Purpose: Energy tick hook
Target File: apps/client/src/hooks/useEnergy.ts
Self-Healing Enabled: YES
Notes: New hook, no previous state.

[PATCH]
Name: B2
Purpose: Game loop energy patch
Target File: apps/client/src/hooks/useGame.ts
Self-Healing Enabled: YES
Notes: Major reducer modification.

[PATCH]
Name: C1
Purpose: Energy meter component
Target File: apps/client/src/components/EnergyMeter.tsx
Self-Healing Enabled: YES
Notes: Pure visual component.

[PATCH]
Name: C2
Purpose: Frenzy overlay visual
Target File: apps/client/src/components/FrenzyOverlay.tsx
Self-Healing Enabled: YES
Notes: Pure visual component.

[PATCH]
Name: C3
Purpose: Tile visual branch
Target File: apps/client/src/components/Tile.tsx
Self-Healing Enabled: YES
Notes: Patch addition to existing tile renderers.

[PATCH]
Name: C4
Purpose: Vault/Heist components
Target File: apps/client/src/components/VaultDisplay.tsx
Self-Healing Enabled: YES
Notes: Multi-component new file generation.

[PATCH]
Name: C5
Purpose: Energy Minimap
Target File: apps/client/src/components/EnergyMinimap.tsx
Self-Healing Enabled: YES
Notes: New visual dashboard component.

[PATCH]
Name: D1
Purpose: Auth foundation
Target File: packages/shared/src/types.ts
Self-Healing Enabled: YES
Notes: Multi-file patch foundation.

[PATCH]
Name: D2
Purpose: Auth screen screen
Target File: apps/client/src/screens/AuthScreen.tsx
Self-Healing Enabled: YES
Notes: New complex form screen.

[PATCH]
Name: D3
Purpose: Chat system
Target File: apps/client/src/hooks/useChat.ts
Self-Healing Enabled: YES
Notes: E2E encryption logic.

[PATCH]
Name: D4
Purpose: Account/Settings
Target File: apps/client/src/components/AccountTab.tsx
Self-Healing Enabled: YES
Notes: Multi-component.

[PATCH]
Name: D5
Purpose: Heist Lobby Panel
Target File: apps/client/src/components/HostLobbyPanel.tsx
Self-Healing Enabled: YES
Notes: Complex reactive UI.

[PATCH]
Name: D6
Purpose: Game Screen Revision
Target File: apps/client/src/components/GameScreen.tsx
Self-Healing Enabled: YES
Notes: Full screen overhaul.

[PATCH]
Name: D7
Purpose: Final App Routing
Target File: apps/client/src/App.tsx
Self-Healing Enabled: YES
Notes: Final production routing.

[PATCH]
Name: E1
Purpose: Server Game Room
Target File: apps/server/src/gameRoom.ts
Self-Healing Enabled: YES
Notes: High-stakes server-side integration.

---

## 5. EXECUTION FLOW (CURRENT)

1. CLI Trigger: `controller [PROMPT_ID] --auto`.
2. Environment pre-flight check.
3. Lock acquisition.
4. AI generates patch code to temp file.
5. Bash validation → Isolated Vitest run.

---

## 6. EXECUTION FLOW (TARGET)

1. CLI Trigger: `controller [PROMPT_ID] --auto`.
2. Environment pre-flight check.
3. Lock acquisition.
4. AI generates patch code to temp file.
5. Validate (Bash integration, Isolated Vitest).
6. Repair loop (Max 5 attempts: AST → Regex → AI Patch → AI Rewrite).
7. Final TSC check.
8. Atomic write to real target file.
9. Git commit of successful result.
10. Lock release.

---

## 7. VALIDATION PIPELINE

1. **Bash Integration:** `scripts/example.sh <PROMPT_ID> <TEMP_FILE>`
2. **Vitest Unit/Integration Testing:** `vitest run --reporter=json` (Isolated replacement)
3. **TSC Check:** `tsc --noEmit` (Global block-level structural check)

---

## 8. SELF-HEALING PIPELINE

1. **AST Fix:** `ts-morph` (Missing structure, class exports)
2. **Regex Fix:** Clean up artifacts, banned libraries, format irregularities.
3. **AI Diff Patch:** Targeted repair based on error logs.
4. **AI Full Rewrite:** Complete module rebuild satisfying requirements.

---

## 9. KNOWN WEAKNESSES

- **Architectural risks:** Heavy reliance on AI for module rewrites if AST/Regex fail; large patches might exceed context limits.
- **Missing safety features:** No automatic rollback if Git commit itself fails; limited network-level safety in WebSocket handling.
- **Incomplete automation:** No automated PR creation pipeline (escalation only).
- **Fragile components:** High dependence on exact regex cleanup; `ts-morph` might fail on extremely malformed JS/TS.

---

## 10. PRODUCTION READINESS

- **Production-ready?** NO.
- **Why?** Requires more robust Git integration (error-tolerant commits, rollback mechanisms), more advanced structural AST generation that minimizes raw AI reliance, and formal CI platform integration.
- **What is missing?** Automated testing for the CLI controller itself, integration with a formal CI/CD pipeline, and fine-tuning of AI prompt boundaries.

---

## 11. RECOMMENDED IMPROVEMENTS

- **Required fixes:** Implement robust Git rollback mechanism on commit failure.
- **Optimizations:** Fine-tune AI repairing log parsing to prevent redundant attempts.
- **Simplifications:** Consolidate repair engine logic and reduce reliance on temp disk files where in-memory buffers suffice.
