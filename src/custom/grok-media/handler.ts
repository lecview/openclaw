import fs from "node:fs/promises";
import type { CommandHandler } from "../../auto-reply/reply/commands-types.js";
import type { ReplyPayload } from "../../auto-reply/types.js";
import { generateImages, generateVideo } from "./grok2api-client.js";

type CommandArgsLike = { values?: Record<string, unknown> };

function getValues(args: unknown): Record<string, unknown> {
  if (typeof args !== "object" || args === null) {
    return {};
  }
  const a = args as CommandArgsLike;
  if (typeof a.values !== "object" || a.values === null) {
    return {};
  }
  return a.values;
}

function resolveString(args: unknown, key: string): string {
  const v = getValues(args)[key];
  return typeof v === "string" ? v.trim() : "";
}

function resolveBool(args: unknown, key: string): boolean {
  const v = getValues(args)[key];
  return typeof v === "boolean" ? v : false;
}

function resolveInt(args: unknown, key: string, fallback: number): number {
  const v = getValues(args)[key];
  if (typeof v === "number") {
    return Math.trunc(v);
  }
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    if (Number.isFinite(n)) {
      return Math.trunc(n);
    }
  }
  return fallback;
}

async function scheduleCleanup(paths: string[], delayMs: number): Promise<void> {
  // Best-effort: the reply delivery happens after handler returns. Delay deletion.
  setTimeout(() => {
    void (async () => {
      for (const p of paths) {
        try {
          await fs.unlink(p);
        } catch {
          // ignore
        }
      }
    })();
  }, delayMs);
}

export const handleGrokMediaCommands: CommandHandler = async (params) => {
  const normalized = params.command.commandBodyNormalized;
  // Only handle native commands /grokimg and /grokvideo
  if (!normalized.startsWith("/grokimg") && !normalized.startsWith("/grokvideo")) {
    return null;
  }

  if (!params.command.isAuthorizedSender) {
    return {
      shouldContinue: false,
      reply: { text: "Not authorized." },
    };
  }

  const isImg = normalized.startsWith("/grokimg");
  const args = params.ctx.CommandArgs;

  const prompt = resolveString(args, "prompt");
  if (!prompt) {
    return {
      shouldContinue: false,
      reply: { text: isImg ? "Usage: /grokimg prompt:<text>" : "Usage: /grokvideo prompt:<text>" },
    };
  }

  try {
    if (isImg) {
      const ratio = resolveString(args, "ratio") || "1:1";
      const n = Math.max(1, Math.min(10, resolveInt(args, "n", 1)));
      const nsfw = resolveBool(args, "nsfw");

      const result = await generateImages({ prompt, ratio, n, nsfw });

      const reply: ReplyPayload = {
        text: `grokimg: ratio=${ratio} n=${n}`,
        mediaUrls: result.files,
      };

      await scheduleCleanup(result.files, 120_000);

      return { shouldContinue: false, reply };
    }

    // video
    const ratio = resolveString(args, "ratio") || "3:2";
    const length = resolveInt(args, "length", 6);
    const res = resolveString(args, "res") || "480p";
    const preset = resolveString(args, "preset") || "normal";

    const result = await generateVideo({ prompt, ratio, length, res, preset });

    const reply: ReplyPayload = {
      text: `grokvideo: ratio=${ratio} length=${length}s res=${res} preset=${preset}`,
      mediaUrls: result.files,
    };

    await scheduleCleanup(result.files, 180_000);

    return { shouldContinue: false, reply };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      shouldContinue: false,
      reply: {
        text: `grok media failed: ${msg.slice(0, 1800)}`,
      },
    };
  }
};
