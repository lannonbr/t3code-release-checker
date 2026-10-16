import { readFile, writeFile } from "node:fs/promises";

const releaseEndpoint = "https://api.github.com/repos/pingdotgg/t3code/releases/latest";
// Resolve against the script so the working directory doesn't affect storage.
const versionFile = new URL("./last-seen-version.txt", import.meta.url);

function normalizeVersion(version: string): string {
  return version.trim().replace(/^v/i, "");
}

async function sendDiscordMessage(message: string): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    throw new Error("Set DISCORD_WEBHOOK_URL to send release-change notifications.");
  }

  const endpoint = new URL(webhookUrl);
  // Ask Discord to confirm that the message was saved before updating our state.
  endpoint.searchParams.set("wait", "true");
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: message, allowed_mentions: { parse: [] } }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error(`Discord webhook returned HTTP ${response.status} ${response.statusText}`);
  }
}

async function checkRelease(): Promise<void> {
  let previousVersion: string | null = null;
  try {
    previousVersion = normalizeVersion(await readFile(versionFile, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "t3code-release-checker",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  // GitHub's latest release endpoint excludes drafts and prereleases.
  const response = await fetch(releaseEndpoint, {
    headers,
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error(`GitHub returned HTTP ${response.status} ${response.statusText}`);
  }

  const release: unknown = await response.json();
  if (
    typeof release !== "object" ||
    release === null ||
    !("tag_name" in release) ||
    typeof release.tag_name !== "string" ||
    !("draft" in release) ||
    release.draft !== false ||
    !("prerelease" in release) ||
    release.prerelease !== false
  ) {
    throw new Error("GitHub did not return a valid stable release.");
  }

  const latestVersion = normalizeVersion(release.tag_name);
  if (!latestVersion) throw new Error("GitHub returned an empty release version.");

  if (previousVersion === latestVersion) {
    console.log(`No change. Latest stable T3 Code release: ${latestVersion}`);
    return;
  }

  if (previousVersion) {
    await sendDiscordMessage(`T3 Code release changed: ${previousVersion} -> ${latestVersion}`);
  }

  // Preserve the previous version if delivery fails, so the next check retries.
  await writeFile(versionFile, `${latestVersion}\n`, "utf8");
  if (!previousVersion) {
    console.log(`First check. Latest stable T3 Code release: ${latestVersion}`);
  }
}

checkRelease().catch((error: unknown) => {
  console.error(`Release check failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
