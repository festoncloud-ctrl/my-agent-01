# my-agent

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.2.22. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.

## Tools

The agent exposes several tools to the system prompt runtime:

1. `getFileChangesInDirectoryTool` – Return diffs for changed files in a directory.
2. `generateCommitMessageTool` – Produce a Conventional Commit message from a diff + description.
3. `writeReviewMarkdownTool` – Persist a code review to a markdown file.

### generateCommitMessageTool
Input fields:
- rootDir: repository root
- description: short intent (what & why)
- optional: diff, scope, type, body, breaking, issues[]

If `type` is omitted, a heuristic infers one from the diff.

### writeReviewMarkdownTool
Writes `filename` (appends .md if missing) under `rootDir`. Fails if file exists unless `overwrite=true`.

Example (conceptual, invoked by model):

```
{"tool":"generateCommitMessageTool","args":{"rootDir":"../my-agent","description":"add commit message + markdown review tools","issues":["#12"]}}
```

```
{"tool":"writeReviewMarkdownTool","args":{"rootDir":"./","filename":"review","title":"Code Review","review":"(content)..."}}
```

