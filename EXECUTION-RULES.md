# 🚨 EXECUTION RULES - MUST FOLLOW

**Project:** Universal ZK-Proof Verifier (UZKV) on Arbitrum Stylus  
**Start Date:** November 19, 2025  
**Grade Target:** 100/100 (Production-Grade)

---

## 📜 MANDATORY RULES

### Rule 1: NO MOCK IMPLEMENTATIONS ❌

- **ZERO tolerance for mock code in production**
- All implementations must be production-ready
- Test fixtures are acceptable ONLY in test files
- Reference implementations (e.g., `MockGroth16Verifier` for differential testing) are acceptable if clearly documented as test infrastructure

### Rule 2: GIT COMMIT AFTER EVERY STEP ✅

- **Complete Task → Immediate Commit**
- Commit granularity examples:
  - ✅ Complete Task 3.2 → `git commit -m "feat(plonk): implement Fiat-Shamir transcript (Task 3.2)"`
  - ✅ Complete Task 3.4.2 → `git commit -m "test(groth16): add pairing verification tests (Task 3.4.2)"`
- **Exception:** Phase 0 (environment setup) does NOT require commits
- Commit message format:

  ```
  <type>(<scope>): <description> (Task X.Y.Z)

  - Detail 1
  - Detail 2
  ```

- Types: `feat`, `fix`, `test`, `docs`, `refactor`, `chore`
- Scopes: `groth16`, `plonk`, `stark`, `contracts`, `sdk`, `infra`, etc.

### Rule 3: DOCUMENTATION FOR EVERY STEP 📝

- **Generate markdown file for each completed task**
- **Location:** `C:\Users\priya\OneDrive\Documents\uzkv\execution_steps_details/`
- **Naming convention:** `task-X.Y.Z-<description>.md`
- Examples:
  - `task-0.2-core-tools-installation.md`
  - `task-1.1-monorepo-setup.md`
  - `task-2.2-groth16-verifier.md`
  - `task-3.4.2-pairing-tests.md`
- Content structure:

  ```markdown
  # Task X.Y.Z: <Title>

  **Date:** YYYY-MM-DD
  **Status:** ✅ Complete
  **Commit:** <git-commit-hash>

  ## What We Did

  - Bullet point summary

  ## How We Did It

  - Step-by-step explanation
  - Commands executed
  - Code snippets

  ## Verification

  - Tests run
  - Output confirmation

  ## Next Steps

  - What comes next
  ```

### Rule 4: GIT BASH FOR ALL TERMINAL OPERATIONS 🖥️

- **ONLY use Git Bash terminal**
- No PowerShell, no CMD, no WSL
- All commands must be bash-compatible
- Verify terminal: `echo $BASH_VERSION` should output version number

---

## 🎯 EXECUTION WORKFLOW

```
┌─────────────────────────────────────────┐
│ 1. Read Task Instructions              │
└─────────────┬───────────────────────────┘
              │
┌─────────────▼───────────────────────────┐
│ 2. Implement (NO MOCKS!)               │
└─────────────┬───────────────────────────┘
              │
┌─────────────▼───────────────────────────┐
│ 3. Test & Verify                       │
└─────────────┬───────────────────────────┘
              │
┌─────────────▼───────────────────────────┐
│ 4. Create Documentation MD File        │
│    (execution_steps_details/)          │
└─────────────┬───────────────────────────┘
              │
┌─────────────▼───────────────────────────┐
│ 5. Git Commit with Task Reference      │
└─────────────┬───────────────────────────┘
              │
┌─────────────▼───────────────────────────┐
│ 6. Move to Next Task                   │
└─────────────────────────────────────────┘
```

---

## ✅ QUALITY GATES

Before marking any task as complete:

1. ✅ **Code compiles/runs** without errors
2. ✅ **Tests pass** (if applicable)
3. ✅ **No mock implementations** (production code only)
4. ✅ **Documentation created** in `execution_steps_details/`
5. ✅ **Git commit pushed** with proper message
6. ✅ **Git Bash used** for all commands

---

## 🚫 PROHIBITED ACTIONS

- ❌ Using mock implementations in production code
- ❌ Skipping commits (every task must have a commit)
- ❌ Missing documentation (every task needs a .md file)
- ❌ Using PowerShell/CMD instead of Git Bash
- ❌ Placeholder code (e.g., `// TODO: implement later`)
- ❌ Uncommitted changes when moving to next task

---

## 📊 TRACKING

**Completed Tasks:** 13/100+ (Phase 0: 9/9 ✅, Phase 1: 3/3 ✅, Phase 2: 1/5)  
**Current Phase:** Phase 2 - Core Cryptography (Groth16)  
**Current Task:** Task 2.2 - Groth16 Verifier Module  
**Repository Status:** Active (master branch)  
**Documentation Files:** 13 (task-0.1 through task-2.1)

---

**Last Updated:** November 19, 2025  
**Status:** ✅ Rules Established - Ready for Execution
