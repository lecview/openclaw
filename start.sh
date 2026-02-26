#!/bin/bash
set -e

mkdir -p /home/node/.openclaw

# 写入配置文件 - 注意这里用单引号heredoc避免shell解释,然后用sed替换变量
cat > /home/node/.openclaw/openclaw.json << 'OPENCLAW_CONFIG_END'
{
  models: {
    mode: "merge",
    providers: {
      "cpa-proxy": {
        baseUrl: "__CPA_BASE_URL__",
        apiKey: "__CPA_API_KEY__",
        api: "openai-completions",
        models: [
          { id: "grok-4.1-fast", name: "Grok 4.1 Fast (CPA)" },
          { id: "grok-4.1", name: "Grok 4.1 (CPA)" },
          { id: "grok-4.1-thinking", name: "Grok 4.1 Thinking (CPA)" },
          { id: "grok-4.20-beta", name: "Grok 4.20 Beta (CPA)" },
          { id: "qwen3.5-plus", name: "Qwen 3.5 Plus (CPA)" },
          { id: "qwen-3.5-plus", name: "Qwen 3.5 Plus (Alt) (CPA)" },
          { id: "qwen3-coder-plus", name: "Qwen3 Coder Plus (CPA)" },
          { id: "qwen3-coder-flash", name: "Qwen3 Coder Flash (CPA)" },
          { id: "gpt-5.1", name: "GPT-5.1 (CPA)" },
          { id: "gpt-5.2", name: "GPT-5.2 (CPA)" },
          { id: "gpt-5.2-codex", name: "GPT-5.2 Codex (CPA)" },
          { id: "gpt-5.3-codex", name: "GPT-5.3 Codex (CPA)" },
          { id: "gpt-5.3-codex-spark", name: "GPT-5.3 Codex Spark (CPA)" },
        ],
      },
    },
  },
  agents: {
    defaults: {
      model: {
        primary: "cpa-proxy/grok-4.1-fast",
        fallbacks: ["cpa-proxy/gpt-5.2", "cpa-proxy/grok-4.1"],
      },
      models: {
        "cpa-proxy/grok-4.1-fast": { alias: "Grok 4.1 Fast" },
        "cpa-proxy/grok-4.1": { alias: "Grok 4.1" },
        "cpa-proxy/grok-4.1-thinking": { alias: "Grok 4.1 Thinking" },
        "cpa-proxy/grok-4.20-beta": { alias: "Grok 4.20 Beta" },
        "cpa-proxy/qwen3.5-plus": { alias: "Qwen 3.5 Plus" },
        "cpa-proxy/qwen-3.5-plus": { alias: "Qwen 3.5 Plus (Alt)" },
        "cpa-proxy/qwen3-coder-plus": { alias: "Qwen3 Coder Plus" },
        "cpa-proxy/qwen3-coder-flash": { alias: "Qwen3 Coder Flash" },
        "cpa-proxy/gpt-5.1": { alias: "GPT-5.1" },
        "cpa-proxy/gpt-5.2": { alias: "GPT-5.2" },
        "cpa-proxy/gpt-5.2-codex": { alias: "GPT-5.2 Codex" },
        "cpa-proxy/gpt-5.3-codex": { alias: "GPT-5.3 Codex" },
        "cpa-proxy/gpt-5.3-codex-spark": { alias: "GPT-5.3 Codex Spark" },
      },
      workspace: "/home/node/.openclaw/workspace",
    },
  },
  channels: {
    telegram: {
      enabled: true,
      dmPolicy: "allowlist",
      allowFrom: ["tg:__TELEGRAM_ALLOWED_USER__"],
      groups: {
        "*": { requireMention: true },
      },
      streaming: "partial",
      linkPreview: true,
      actions: { reactions: true, sendMessage: true },
    },
  },
  gateway: {
    controlUi: {
      dangerouslyAllowHostHeaderOriginFallback: true,
    },
  },
}
OPENCLAW_CONFIG_END

# 用sed替换占位符为实际环境变量值
sed -i "s|__CPA_BASE_URL__|${CPA_BASE_URL}|g" /home/node/.openclaw/openclaw.json
sed -i "s|__CPA_API_KEY__|${CPA_API_KEY}|g" /home/node/.openclaw/openclaw.json
sed -i "s|__TELEGRAM_ALLOWED_USER__|${TELEGRAM_ALLOWED_USER}|g" /home/node/.openclaw/openclaw.json

# 调试输出 - 确认配置文件已写入
echo "=== OpenClaw config written ==="
cat /home/node/.openclaw/openclaw.json
echo "=== Starting OpenClaw Gateway ==="

exec node openclaw.mjs gateway --allow-unconfigured --bind lan --port 18789
