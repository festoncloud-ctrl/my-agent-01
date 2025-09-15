# my-agent

An AI-powered code review helper that streams structured review feedback for the current git working tree.

## Install

```bash
bun install
```

## Usage

Run against the current working directory (default):

```bash
bun run index.ts
```

Specify a target directory explicitly:

```bash
bun run index.ts ../some/other/repo
```

Or via environment variable:

```bash
REVIEW_DIR=../some/other/repo bun run index.ts
```

Show help:

```bash
bun run index.ts --help
```

The agent will:
1. Validate the directory exists and is a git repository.
2. Collect changed files (staged + unstaged) via `git diff`.
3. Stream a review for each file (summary, feedback, improvements, positives).
4. Report clearly if there are no changes.

## Tool Behavior

The `getFileChangesInDirectoryTool` returns one of:

- `{ rootDir, error }` when the path is invalid or not a git repo.
- `{ rootDir, message: "No changes detected in working tree" }` when clean.
- `{ rootDir, count, diffs: [{ file, diff }, ...] }` when changes exist.

## Notes

The system prompt is defined in `prompts.ts`; adjust for tone or review scope.
You can refine the review prompt composition in `index.ts` for custom guidance.

## Roadmap Ideas

- Include added/removed line counts in tool output.
- Optionally include `git diff --cached` vs working tree separation.
- Add markdown report export.
- Provide severity tagging (info / suggestion / warning).

---
This project was created using `bun init` in bun v1.2.22. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
