---
name: Firebase package install
description: Workspace-specific dependency installation behavior for Firebase-enabled web artifacts
---

Add JavaScript dependencies to the target artifact with a pnpm workspace filter, such as `pnpm --filter @workspace/<artifact> add <package>`. The generic package installer may target the workspace root and be rejected by pnpm.

**Why:** The workspace enforces package ownership and rejects accidental root dependency changes.

**How to apply:** When adding a dependency to a web artifact, target that artifact package explicitly.