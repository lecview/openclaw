import type { ChatCommandDefinition } from "../../auto-reply/commands-registry.js";

export const GROKIMG_RATIO_CHOICES = [
  { value: "1:1", label: "1:1" },
  { value: "2:3", label: "2:3" },
  { value: "3:2", label: "3:2" },
  { value: "16:9", label: "16:9" },
  { value: "9:16", label: "9:16" },
] as const;

export const GROKVIDEO_RATIO_CHOICES = GROKIMG_RATIO_CHOICES;

export const GROKIMG_N_CHOICES = [
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
] as const;

export const GROKVIDEO_LENGTH_CHOICES = [
  { value: "6", label: "6" },
  { value: "10", label: "10" },
  { value: "15", label: "15" },
] as const;

export const GROKVIDEO_RES_CHOICES = [
  { value: "480p", label: "480p" },
  { value: "720p", label: "720p" },
] as const;

export const GROKVIDEO_PRESET_CHOICES = [
  { value: "normal", label: "normal" },
  { value: "fun", label: "fun" },
  { value: "spicy", label: "spicy" },
  { value: "custom", label: "custom" },
] as const;

export function buildGrokMediaCommands(): ChatCommandDefinition[] {
  const commands: ChatCommandDefinition[] = [
    {
      key: "grokimg",
      nativeName: "grokimg",
      description: "Generate image via Grok2API and reply with attachment.",
      textAliases: ["/grokimg"],
      acceptsArgs: true,
      argsParsing: "none",
      category: "media",
      scope: "both",
      args: [
        {
          name: "prompt",
          description: "Prompt",
          type: "string",
          required: true,
          captureRemaining: true,
        },
        {
          name: "ratio",
          description: "Aspect ratio",
          type: "string",
          choices: [...GROKIMG_RATIO_CHOICES],
        },
        {
          name: "n",
          description: "Number of images (1-3)",
          type: "string",
          choices: [...GROKIMG_N_CHOICES],
        },
        {
          name: "nsfw",
          description: "Allow NSFW",
          type: "boolean",
        },
      ],
      argsMenu: "auto",
    },
    {
      key: "grokvideo",
      nativeName: "grokvideo",
      description: "Generate short video via Grok2API and reply with attachment.",
      textAliases: ["/grokvideo"],
      acceptsArgs: true,
      argsParsing: "none",
      category: "media",
      scope: "both",
      args: [
        {
          name: "prompt",
          description: "Prompt",
          type: "string",
          required: true,
          captureRemaining: true,
        },
        {
          name: "ratio",
          description: "Aspect ratio",
          type: "string",
          choices: [...GROKVIDEO_RATIO_CHOICES],
        },
        {
          name: "length",
          description: "Seconds (6/10/15)",
          type: "string",
          choices: [...GROKVIDEO_LENGTH_CHOICES],
        },
        {
          name: "res",
          description: "Resolution",
          type: "string",
          choices: [...GROKVIDEO_RES_CHOICES],
        },
        {
          name: "preset",
          description: "Preset",
          type: "string",
          choices: [...GROKVIDEO_PRESET_CHOICES],
        },
      ],
      argsMenu: "auto",
    },
  ];

  return commands;
}
