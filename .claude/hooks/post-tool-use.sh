#!/bin/bash
# .claude/hooks/post-tool-use.sh
# PostToolUse Hook: 审计日志自动捕获
# 每次写操作后自动记录到 audit.log
# Claude  Code 通过 stdin 传入 JSON: {"tool_name":"...","tool_input":{...},"tool_response":{...}}

DEVMIND_DIR="$(cd "$(dirname "$0")/../.." && pwd)/.devmind"

# 读取 stdin 中的 JSON 数据
HOOK_INPUT=$(cat)

# 从 JSON 中提取 tool_name（纯 bash，无 jq 依赖）
TOOL_NAME=$(printf '%s' "$HOOK_INPUT" | grep -o '"tool_name":"[^"]*"' | cut -d'"' -f4)

# 从 JSON 中提取 file_path
extract_file_path() {
    printf '%s' "$1" | grep -o '"file_path":"[^"]*"' | head -1 | cut -d'"' -f4
}

# 只处理写操作工具
if echo "$TOOL_NAME" | grep -qE '^(Write|Edit|NotebookEdit)$'; then

    CURRENT_MODE=$(cat "$DEVMIND_DIR/current-mode.txt" 2>/dev/null || echo "unknown")
    CURRENT_PLAN=$(head -1 "$DEVMIND_DIR/current-plan.md" 2>/dev/null | sed 's/^# //')
    FILE_PATH=$(extract_file_path "$HOOK_INPUT")
    FILE_PATH="${FILE_PATH:-unknown}"

    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $CURRENT_MODE  ${FILE_PATH}  plan:${CURRENT_PLAN:-none}" \
        >> "$DEVMIND_DIR/audit.log"
fi

exit 0
