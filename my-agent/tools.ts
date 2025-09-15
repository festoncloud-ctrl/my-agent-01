import { tool } from "ai";
import { simpleGit } from "simple-git";
import { z } from "zod";
import fs from "node:fs";
import path from "node:path";

const excludeFiles = ["dist", "bun.lock"];

const fileChange = z.object({
  rootDir: z.string().min(1).describe("The root directory"),
});

type FileChange = z.infer<typeof fileChange>;

async function getFileChangesInDirectory({ rootDir }: FileChange) {
  const resolved = path.resolve(rootDir);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    return {
      rootDir: resolved,
      error: `Directory does not exist or is not a directory: ${resolved}`,
    };
  }

  const git = simpleGit(resolved);
  const isRepo = await git.checkIsRepo().catch(() => false);
  if (!isRepo) {
    return { rootDir: resolved, error: "Target directory is not a git repository" };
  }

  const summary = await git.diffSummary();
  if (summary.files.length === 0) {
    return { rootDir: resolved, message: "No changes detected in working tree" };
  }

  const diffs: { file: string; diff: string }[] = [];
  for (const file of summary.files) {
    if (excludeFiles.includes(file.file)) continue;
    const diff = await git.diff(["--", file.file]);
    diffs.push({ file: file.file, diff });
  }

  return { rootDir: resolved, count: diffs.length, diffs };
}

export const getFileChangesInDirectoryTool = tool({
  description: "Gets git diff summary + per-file diffs for changed files in a directory (validates path + repo)",
  inputSchema: fileChange,
  execute: getFileChangesInDirectory,
});
