import { stepCountIs, streamText } from "ai";
import { google } from "@ai-sdk/google";
import { SYSTEM_PROMPT } from "./prompts";
import { getFileChangesInDirectoryTool } from "./tools";
import path from "node:path";
import fs from "node:fs";

const codeReviewAgent = async (prompt: string) => {
  const result = streamText({
    model: google("models/gemini-2.5-flash"),
    prompt,
    system: SYSTEM_PROMPT,
    tools: {
      getFileChangesInDirectoryTool: getFileChangesInDirectoryTool,
    },
    stopWhen: stepCountIs(10),
  });

  for await (const chunk of result.textStream) {
    process.stdout.write(chunk);
  }
};

// Determine target directory: CLI arg > ENV VAR > current working directory
const rawArg = process.argv[2];
const targetDir = path.resolve(rawArg || process.env.REVIEW_DIR || process.cwd());

if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) {
  console.error(`❌ Provided review directory does not exist or is not a directory: ${targetDir}`);
  process.exit(1);
}

// Craft a clear instruction for the reviewing agent
const reviewPrompt = `Review the git changes (unstaged + staged) in the directory: ${targetDir}.\nFor each changed file:\n1. Summarize the change\n2. Provide constructive feedback (correctness, clarity, maintainability, tests, security)\n3. Suggest actionable improvements (bullets)\n4. Call out positives briefly.\nIf no changes are detected, state that explicitly.`;

await codeReviewAgent(reviewPrompt);

// Usage guidance if invoked with --help
if (["--help", "-h"].includes(rawArg || "")) {
  console.log(`\nUsage: bun run index.ts [path-to-repo]\\n\\nIf no path is provided, the current working directory is used. You can also set REVIEW_DIR env var.`);
}
