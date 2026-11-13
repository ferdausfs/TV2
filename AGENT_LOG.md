# TV2 — Agent Log

> Continuity file. Entries are **prepended** (newest first) and never deleted.
> Every entry: session date, agent/tool, feature, what changed, touched files,
> commit hash, pending items, notes for the next agent.

---

## 2026-11-13 — Session 1 (audit + baseline)

- **Agent/tool:** OpenCode (GLM) on Android, VPS build runner (`/home/ubuntu/apps/TV2`)
- **Feature:** STEP ZERO — full TradingView parity audit (no feature code)
- **What changed:** created `TV2_PARITY_AUDIT.md` (repo map, parity matrix, bugs,
  perf risks, priority roadmap) and this log. No src changes.
- **Touched files:** `TV2_PARITY_AUDIT.md`, `AGENT_LOG.md`
- **Commit:** `<pending — filled after push>`
- **Verified baseline:** typecheck ✅ · lint 0 warnings ✅ · tests **748 passed | 1 skipped** ✅ ·
  build ✅ (VPS run `verify6`, log `/home/ubuntu/jobs/verify6.log`)
- **Key facts for the next agent:**
  - Working flow: edit on phone (`~/OpenCharts`) → `tar` changed paths to
    `ubuntu@84.13.154.150:/home/ubuntu/apps/TV2/` → typecheck/lint → `jrun` test+build →
    commit+push (git identity already `ferdausfs`). `gh` CLI is on the **phone** only.
  - CI runs on `main` + PRs; e2e.yml runs on PRs only; deploy-demo.yml deploys on `main`.
  - **Design contract = DESIGN.TV2.md** (TradingView palette). `DESIGN.md` is superseded —
    pointer rewrite is part of feature 0.
  - Roadmap order is in `TV2_PARITY_AUDIT.md` §5; feature 1 = Alerts v1 (mobile-first user value).
  - Baseline regression tests: render pump, live data, replay chain — never break these.
- **Pending:** feature 0 (theme migration) → feature 1 (Alerts v1) → …
