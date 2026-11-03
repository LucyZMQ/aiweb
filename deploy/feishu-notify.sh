#!/usr/bin/env bash
set -euo pipefail

# 用法: ./feishu-notify.sh "标题" "success|failure" "Markdown 详情" "https://站点"
TITLE="${1:-MOYU 部署通知}"
STATUS="${2:-success}"
DETAILS="${3:-}"
SITE_URL="${4:-}"

if [[ -z "${FEISHU_WEBHOOK:-}" ]]; then
  echo "FEISHU_WEBHOOK is not set, skip notification"
  exit 0
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required for Feishu notification" >&2
  exit 1
fi

if [[ "$STATUS" == "success" ]]; then
  TEMPLATE="green"
  EMOJI="✅"
else
  TEMPLATE="red"
  EMOJI="❌"
fi

PAYLOAD=$(jq -n \
  --arg title "$EMOJI $TITLE" \
  --arg template "$TEMPLATE" \
  --arg details "$DETAILS" \
  --arg url "$SITE_URL" \
  '{
    msg_type: "interactive",
    card: {
      config: { wide_screen_mode: true },
      header: {
        template: $template,
        title: { tag: "plain_text", content: $title }
      },
      elements: (
        [
          {
            tag: "div",
            text: { tag: "lark_md", content: $details }
          }
        ]
        + (if $url == "" then [] else [{
            tag: "action",
            actions: [{
              tag: "button",
              text: { tag: "plain_text", content: "打开站点" },
              url: $url,
              type: "primary"
            }]
          }] end)
      )
    }
  }')

curl -fsS -X POST \
  -H 'Content-Type: application/json' \
  -d "$PAYLOAD" \
  "$FEISHU_WEBHOOK" >/dev/null

echo "Feishu notification sent"
