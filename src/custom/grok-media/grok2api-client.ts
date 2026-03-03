import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

export type Grok2ApiEnv = {
  baseUrl: string;
  apiKey: string;
};

export type GrokImgRequest = {
  prompt: string;
  ratio?: string;
  n?: number;
  nsfw?: boolean;
};

export type GrokVideoRequest = {
  prompt: string;
  ratio?: string;
  length?: number;
  res?: string;
  preset?: string;
};

function resolveEnv(): Grok2ApiEnv {
  const baseUrl = (process.env.GROK2API_BASE_URL || "").trim().replace(/\/$/, "");
  const apiKey = (process.env.GROK2API_API_KEY || "").trim();
  if (!baseUrl) {
    throw new Error("Missing GROK2API_BASE_URL");
  }
  if (!apiKey) {
    throw new Error("Missing GROK2API_API_KEY");
  }
  return { baseUrl, apiKey };
}

function ratioToImageSize(ratio?: string): string {
  switch ((ratio || "").trim()) {
    case "2:3":
      return "1024x1792";
    case "3:2":
      return "1792x1024";
    case "16:9":
      return "1280x720";
    case "9:16":
      return "720x1280";
    case "1:1":
    default:
      return "1024x1024";
  }
}

function makeTmpDir(): string {
  // Use OpenClaw preferred tmp dir if set; otherwise /tmp
  const base = (process.env.OPENCLAW_TMP_DIR || "/tmp").trim() || "/tmp";
  return path.join(base, "openclaw-grok-media");
}

async function ensureDir(p: string): Promise<void> {
  await fs.mkdir(p, { recursive: true });
}

function safeName(prefix: string, ext: string): string {
  const ts = Date.now();
  const rand = crypto.randomBytes(4).toString("hex");
  return `${prefix}-${ts}-${rand}${ext}`;
}

export async function generateImages(req: GrokImgRequest): Promise<{ files: string[] }> {
  const env = resolveEnv();
  const url = `${env.baseUrl}/v1/images/generations`;
  const n = Math.max(1, Math.min(3, req.n ?? 1));
  const size = ratioToImageSize(req.ratio);

  const body = {
    model: "grok-imagine-1.0",
    prompt: req.prompt,
    n,
    size,
    response_format: "url",
    stream: false,
    nsfw: Boolean(req.nsfw),
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`grok2api images HTTP ${res.status}: ${text.slice(0, 400)}`);
  }

  const json = JSON.parse(text) as { data?: Array<{ url?: string }> };
  const urls = (json.data || []).map((it) => it.url).filter(Boolean) as string[];
  if (!urls.length) {
    throw new Error("grok2api returned no image urls");
  }

  const tmpDir = makeTmpDir();
  await ensureDir(tmpDir);

  const files: string[] = [];
  for (const imgUrl of urls.slice(0, n)) {
    const imgRes = await fetch(imgUrl);
    if (!imgRes.ok) {
      throw new Error(`Failed to download image: HTTP ${imgRes.status} from ${imgUrl}`);
    }
    const ct = (imgRes.headers.get("content-type") || "").toLowerCase();
    const ext = ct.includes("png")
      ? ".png"
      : ct.includes("webp")
        ? ".webp"
        : ct.includes("gif")
          ? ".gif"
          : ".jpg";
    const buf = Buffer.from(await imgRes.arrayBuffer());
    const local = path.join(tmpDir, safeName("grokimg", ext));
    await fs.writeFile(local, buf);
    files.push(local);
  }

  return { files };
}

function extractFirstUrl(text: string): string {
  const m = text.match(/https?:\/\/\S+\.(?:mp4|mov|webm)(?:\?\S+)?/i);
  return m?.[0] || "";
}

export async function generateVideo(req: GrokVideoRequest): Promise<{ files: string[] }> {
  const env = resolveEnv();
  const url = `${env.baseUrl}/v1/chat/completions`;

  const payload = {
    model: "grok-imagine-1.0-video",
    stream: false,
    messages: [{ role: "user", content: req.prompt }],
    video_config: {
      aspect_ratio: (req.ratio || "3:2").trim() || "3:2",
      video_length: req.length ?? 6,
      resolution_name: (req.res || "480p").trim() || "480p",
      preset: (req.preset || "normal").trim() || "normal",
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.apiKey}`,
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`grok2api video HTTP ${res.status}: ${text.slice(0, 600)}`);
  }

  const json = JSON.parse(text);
  const content = json?.choices?.[0]?.message?.content;
  const contentText = typeof content === "string" ? content : JSON.stringify(content);
  const videoUrl = extractFirstUrl(contentText);
  if (!videoUrl) {
    throw new Error(`No video url found in completion content: ${contentText.slice(0, 800)}`);
  }

  const tmpDir = makeTmpDir();
  await ensureDir(tmpDir);

  const vidRes = await fetch(videoUrl);
  if (!vidRes.ok) {
    throw new Error(`Failed to download video: HTTP ${vidRes.status} from ${videoUrl}`);
  }
  const vidBuf = Buffer.from(await vidRes.arrayBuffer());
  const local = path.join(tmpDir, safeName("grokvideo", ".mp4"));
  await fs.writeFile(local, vidBuf);

  return { files: [local] };
}
