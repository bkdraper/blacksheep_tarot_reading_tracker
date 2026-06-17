# Tarot Tracker - Specification Files

## Overview
Detailed specifications for features and systems. These are implementation-level docs — for high-level architecture and rules, see `.kiro/steering/`.

## Current Version: v4.0.1 | Tests: 223 passing

## Spec Files

### Core Systems (Implemented ✅)
- **[session-management.md](session-management.md)** — Session state, normalized DB, auth integration
- **[readings-management.md](readings-management.md)** — Reading CRUD, payment/source sheets, real-time totals
- **[timer-system.md](timer-system.md)** — Canvas countdown, Web Audio alarms, Wake Lock
- **[pwa-offline-support.md](pwa-offline-support.md)** — Service worker, caching, installability
- **[analytics-notifications.md](analytics-notifications.md)** — Automated insights and notifications

### ChatGPSY Features (AI Assistant)
- **[chatgpsy-phase2-persistence.md](chatgpsy-phase2-persistence.md)** — Message persistence and error handling (NOT STARTED)
- **[chatgpsy-phase4-visualization.md](chatgpsy-phase4-visualization.md)** — Charts and sparklines (NOT STARTED)

### Refactoring
- **[refactoring-settings-ui.md](refactoring-settings-ui.md)** — Extract settings UI to module (NOT STARTED)

## What's Been Removed / Merged

| Old Spec | Reason |
|---|---|
| `lambda-architecture.md` | Merged into `.kiro/steering/architecture.md` |
| `chatgpsy-phase3-context-awareness.md` | ✅ Complete (context injection, quick actions, multi-turn all working) |

## Related Steering Docs
- `development-rules.md` (auto) — rules, deployment, data structures
- `architecture.md` (fileMatch) — DB schema, Lambda architecture, Bedrock integration
- `roadmap.md` (manual) — feature progress and priorities
- `session-ux-spec.md` (manual) — session UX redesign plan

## How to Use
1. Read the relevant spec before starting work on a feature
2. Follow implementation plan step-by-step
3. Run `npm test` to verify (223 tests must pass)
4. Bump version in index.html, README.md, and steering/development-rules.md
5. Update docs/CHANGELOG.md
