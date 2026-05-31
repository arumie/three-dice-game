# Agent Instructions

Guidance for AI agents working in this repository.

## Package manager

Use **Bun** for all package and script commands. Do not use npm, yarn, or pnpm.

```bash
bun install
bun dev
bun run <script>
```

## Verification

Before finishing a task, run these checks (in order):

```bash
bun run lint
bun test
bun run build
```

- `bun run lint` — Biome lint and format check
- `bun test` — unit tests (Bun test runner)
- `bun run build` — production build

For CI-equivalent verification, use:

```bash
bun run build:ci
```

## Commit messages

Use **gitmoji** in the subject line. Do not use conventional-commit prefixes like `fix:` or `feat:`.

Format:

```
<gitmoji> <short imperative summary>
```

Examples from this repo:

```
✨ Add admin debug panel to create and delete throwaway test games
🐛 Prevent accidental turn skips with End Turn cooldown and mobile button spacing
♿️ Set autocomplete semantics on new game form password fields
💄 Improve new game form UX
⬆️ Update packages
📝 Update TODO
```

Common gitmojis:

| Emoji | Use for |
|-------|---------|
| ✨ | New feature |
| 🐛 | Bug fix |
| 💄 | UI/UX change |
| ♿️ | Accessibility |
| ⬆️ | Dependency upgrades |
| 📝 | Documentation or TODO updates |
| ♻️ | Refactor |
| ✅ | Tests |

Keep the subject line concise. Optional body text is fine for extra context; avoid long subjects.
