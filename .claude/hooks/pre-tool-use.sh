#!/bin/bash
# .claude/hooks/pre-tool-use.sh
# PreToolUse Hook: 模式约束拦截
# 在 Explore / Plan 模式下阻止写操作
# Claude  Code 通过 stdin 传入 JSON: {"tool_name":"...","tool_input":{...}}

set -e

DEVMIND_DIR="$(cd "$(dirname "$0")/../.." && pwd)/.devmind"

# 读取 stdin 中的 JSON 数据
HOOK_INPUT=$(cat)

# 从 JSON 中提取 tool_name
TOOL_NAME=$(printf '%s' "$HOOK_INPUT" | grep -o '"tool_name":"[^"]*"' | cut -d'"' -f4)

# 读取当前模式，文件不存在则默认 explore（最严格）
CURRENT_MODE=$(cat "$DEVMIND_DIR/current-mode.txt" 2>/dev/null || echo "explore")

# 从 JSON 中提取 file_path（纯 bash，无外部依赖）
# file_path 是顶层字符串字段，路径不含引号，此方法可靠
extract_file_path() {
    printf '%s' "$1" | grep -o '"file_path":"[^"]*"' | head -1 | cut -d'"' -f4
}

# 只拦截写操作工具
if echo "$TOOL_NAME" | grep -qE '^(Write|Edit|NotebookEdit)$'; then

    if [ "$CURRENT_MODE" = "explore" ]; then
        echo "BLOCKED: Explore 模式禁止修改文件" >&2
        echo "提示：使用 /dm:edit 或 /dm:build 进入可写模式" >&2
        exit 1
    fi

    if [ "$CURRENT_MODE" = "plan" ]; then
        # Plan 模式允许写入 devmind 内部文件（current-plan.md）
        FILE_ARG=$(extract_file_path "$HOOK_INPUT")
        if echo "$FILE_ARG" | grep -q "\.devmind/"; then
            exit 0
        fi
        echo "BLOCKED: Plan 模式仅输出方案，不修改业务代码" >&2
        echo "提示：使用 /dm:build 执行已确认的计划" >&2
        exit 1
    fi

    # Build 模式：检查文件范围约束
    if [ "$CURRENT_MODE" = "build" ]; then
        PLAN_FILE="$DEVMIND_DIR/current-plan.md"
        FILE_ARG=$(extract_file_path "$HOOK_INPUT")

        if [ -n "$FILE_ARG" ] && [ -f "$PLAN_FILE" ]; then
            # 检查是否在"明确排除"列表中
            IN_EXCLUDED=$(awk '/^### 明确排除/,/^###/' "$PLAN_FILE" | grep -v "^###" | grep -v "^$" | sed 's/^- //' | while read -r pattern; do
                if echo "$FILE_ARG" | grep -q "$pattern"; then
                    echo "yes"
                    break
                fi
            done)

            if [ "$IN_EXCLUDED" = "yes" ]; then
                echo "PAUSED: 文件 '$FILE_ARG' 在明确排除列表中" >&2
                echo "请选择：(1) 允许并更新计划范围  (2) 允许一次性例外  (3) 跳过此修改  (4) 切换到 Plan 模式" >&2
                exit 1
            fi
        fi
    fi

fi

exit 0
