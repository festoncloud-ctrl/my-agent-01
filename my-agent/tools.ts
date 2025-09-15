import { tool } from "ai";
import { simpleGit } from "simple-git";
import { z } from "zod";
import { promises as fs } from "fs";
import path from "path";

const excludeFiles = ["dist", "bun.lock"];

const fileChange = z.object({
  rootDir: z.string().min(1).describe("The root directory"),
});

type FileChange = z.infer<typeof fileChange>;

async function getFileChangesInDirectory({ rootDir }: FileChange) {
  const git = simpleGit(rootDir);
  const summary = await git.diffSummary();
  const diffs: { file: string; diff: string }[] = [];

  for (const file of summary.files) {
    if (excludeFiles.includes(file.file)) continue;
    const diff = await git.diff(["--", file.file]);
    diffs.push({ file: file.file, diff });
  }

  return diffs;
}

export const getFileChangesInDirectoryTool = tool({
  description: "Gets the code changes made in given directory",
  inputSchema: fileChange,
  execute: getFileChangesInDirectory,
});

// Commit message generation tool
// Supports conventional commits. If no type is supplied will infer from diff heuristics.
const commitMessageInput = z.object({
  rootDir: z.string().min(1).describe("The repository root directory"),
  diff: z
    .string()
    .optional()
    .describe(
      "Optional unified diff content. If omitted, staged changes will be used.",
    ),
  description: z
    .string()
    .min(5)
    .describe(
      "Short natural language description of the change intent (what & why).",
    ),
  scope: z
    .string()
    .optional()
    .describe("Optional scope to include in commit message (e.g., api, ui)."),
  type: z
    .enum([
      "feat",
      "fix",
      "docs",
      "style",
      "refactor",
      "perf",
      "test",
      "build",
      "ci",
      "chore",
      "revert",
    ])
    .optional()
    .describe("Conventional commit type. If not provided will be inferred."),
  body: z
    .string()
    .optional()
    .describe("Optional longer body / rationale. Wrap at ~72 chars ideally."),
  breaking: z
    .boolean()
    .optional()
    .describe("Mark as breaking change (adds ! and BREAKING CHANGE footer)."),
  issues: z
    .array(z.string())
    .optional()
    .describe("Issue / ticket references like #123 to include in footer."),
});

type CommitMessageInput = z.infer<typeof commitMessageInput>;

function inferTypeFromDiff(diff: string): string {
  // Very lightweight heuristic
  if (/^\+.*(fix|bug)/im.test(diff)) return "fix";
  if (/^\+.*(test|describe\(|it\()/im.test(diff)) return "test";
  if (/package.json|bun.lock|lockfile|Dockerfile/.test(diff)) return "build";
  if (/^\+.*(TODO|typo)/im.test(diff)) return "chore";
  if (/^\+.*(perf|optimi[sz]e)/im.test(diff)) return "perf";
  if (/^\+.*(refactor)/im.test(diff)) return "refactor";
  return "feat"; // default optimistic assumption
}

async function generateCommitMessage(input: CommitMessageInput) {
  const { rootDir, diff, description, scope, type, body, breaking, issues } =
    input;
  const git = simpleGit(rootDir);
  let workingDiff = diff;
  if (!workingDiff) {
    // Get staged changes; if none, get unstaged summary as fallback
    workingDiff = await git.diff(["--staged"]);
    if (!workingDiff) {
      workingDiff = await git.diff();
    }
  }
  const inferredType = type || inferTypeFromDiff(workingDiff);
  const scopePart = scope ? `(${scope})` : "";
  const breakingMarker = breaking ? "!" : "";
  const header = `${inferredType}${scopePart}${breakingMarker}: ${description.trim()}`;

  const footerLines: string[] = [];
  if (breaking) footerLines.push("BREAKING CHANGE: Please review migration steps.");
  if (issues && issues.length) footerLines.push(issues.map((i) => `Refs ${i}`).join("\n"));

  return [header, body && body.trim(), footerLines.length ? footerLines.join("\n") : null]
    .filter(Boolean)
    .join("\n\n");
}

export const generateCommitMessageTool = tool({
  description:
    "Generates a conventional commit message from diff / description input.",
  inputSchema: commitMessageInput,
  execute: generateCommitMessage,
});

// Markdown review writer tool
const writeReviewInput = z.object({
  rootDir: z.string().min(1).describe("The output base directory"),
  filename: z
    .string()
    .min(1)
    .regex(/^[a-zA-Z0-9._-]+$/)
    .describe(
      "Filename for the markdown review (no path separators). Recommend .md extension.",
    ),
  title: z.string().min(3).describe("Title heading for the review"),
  review: z
    .string()
    .min(10)
    .describe("Full markdown body of the code review to persist."),
  overwrite: z
    .boolean()
    .optional()
    .describe("Allow overwriting existing file (default false)."),
});

type WriteReviewInput = z.infer<typeof writeReviewInput>;

async function writeReviewMarkdown({
  rootDir,
  filename,
  title,
  review,
  overwrite = false,
}: WriteReviewInput) {
  const safeName = filename.endsWith(".md") ? filename : `${filename}.md`;
  const fullPath = path.resolve(rootDir, safeName);
  try {
    if (!overwrite) {
      await fs.access(fullPath);
      // If access succeeds and overwrite false -> error
      throw new Error(
        `File ${safeName} already exists. Set overwrite=true to replace.`,
      );
    }
  } catch (err: any) {
    if (err && err.code !== "ENOENT") throw err; // real error
  }

  const timestamp = new Date().toISOString();
  const contents = `# ${title}\n\n_Generated: ${timestamp}_\n\n${review}\n`;
  await fs.writeFile(fullPath, contents, "utf8");
  return { path: fullPath, bytes: contents.length };
}

export const writeReviewMarkdownTool = tool({
  description: "Writes a markdown file containing the generated code review.",
  inputSchema: writeReviewInput,
  execute: writeReviewMarkdown,
});
