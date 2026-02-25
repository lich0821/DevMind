// templates.ts — All file templates for `devmind init`
// Split into logical groups to keep the file manageable.

// ─── Hooks ───────────────────────────────────────────────────────────────────

export const PRE_TOOL_USE_SH = `#!/bin/bash
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
extract_file_path() {
    printf '%s' "$1" | grep -o '"file_path":"[^"]*"' | head -1 | cut -d'"' -f4
}

# 拦截 Bash 工具中的危险命令（所有模式下均检测）
if [ "$TOOL_NAME" = "Bash" ]; then
    COMMAND=$(printf '%s' "$HOOK_INPUT" | grep -o '"command":"[^"]*"' | head -1 | cut -d'"' -f4)
    for DANGER in "rm -rf" "DROP TABLE" "DELETE FROM" "git push --force" "git push -f"; do
        if echo "$COMMAND" | grep -qi "$DANGER"; then
            echo "BLOCKED: 检测到危险命令：$DANGER" >&2
            echo "命令：$COMMAND" >&2
            echo "如需执行，请在终端手动运行并明确确认后果。" >&2
            exit 1
        fi
    done
fi

# 只拦截写操作工具
if echo "$TOOL_NAME" | grep -qE '^(Write|Edit|NotebookEdit)$'; then

    if [ "$CURRENT_MODE" = "explore" ]; then
        echo "BLOCKED: Explore 模式禁止修改文件" >&2
        echo "提示：使用 /dm:edit 或 /dm:build 进入可写模式" >&2
        exit 1
    fi

    if [ "$CURRENT_MODE" = "plan" ]; then
        FILE_ARG=$(extract_file_path "$HOOK_INPUT")
        if echo "$FILE_ARG" | grep -q "\\.devmind/"; then
            exit 0
        fi
        echo "BLOCKED: Plan 模式仅输出方案，不修改业务代码" >&2
        echo "提示：使用 /dm:build 执行已确认的计划" >&2
        exit 1
    fi

    if [ "$CURRENT_MODE" = "build" ]; then
        PLAN_FILE="$DEVMIND_DIR/current-plan.md"
        FILE_ARG=$(extract_file_path "$HOOK_INPUT")

        if [ -n "$FILE_ARG" ] && [ -f "$PLAN_FILE" ]; then
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
`;

export const POST_TOOL_USE_SH = `#!/bin/bash
# .claude/hooks/post-tool-use.sh
# PostToolUse Hook: 审计日志自动捕获
# 每次写操作后自动记录到 audit.log
# Claude  Code 通过 stdin 传入 JSON: {"tool_name":"...","tool_input":{...},"tool_response":{...}}

DEVMIND_DIR="$(cd "$(dirname "$0")/../.." && pwd)/.devmind"

# 读取 stdin 中的 JSON 数据
HOOK_INPUT=$(cat)

# 从 JSON 中提取 tool_name
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
    FILE_PATH="\${FILE_PATH:-unknown}"

    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $CURRENT_MODE  \${FILE_PATH}  plan:\${CURRENT_PLAN:-none}" \\
        >> "$DEVMIND_DIR/audit.log"
fi

exit 0
`;

// ─── CLAUDE.md ────────────────────────────────────────────────────────────────

export const CLAUDE_MD = `# DevMind 状态感知

> 本段由 DevMind 框架注入，适用于本项目所有 Claude  Code 会话。

## 会话启动检查

每次会话开始时，执行以下操作：

1. **读取当前模式**：\`cat .devmind/current-mode.txt\`
   - \`explore\`：只读，禁止修改任何文件
   - \`edit\`：可小范围修改，跨文件改动（超过2个文件）需确认
   - \`plan\`：仅输出方案，不修改业务代码
   - \`build\`：按 \`current-plan.md\` 中的 Spec 执行
   - 文件不存在时，默认进入 \`explore\` 模式

2. **检查会话状态**：如果 \`.devmind/session.yaml\` 存在，读取并告知开发者上次任务状态，包括：
   - 上次执行的计划
   - 已完成和待续的检查点
   - 是否有未解决的暂停原因

3. **加载记忆索引**：读取 \`.devmind/memory/index.md\`（轻量级，仅包含摘要和标签）

## 模式切换提示

当开发者输入的意图与当前模式不符时，主动提示可用的模式命令：

\`\`\`
用户："帮我改这个 bug"
当前模式：explore（只读）
→ 提示：检测到修改意图，当前处于 explore 模式（只读）。
  建议：
  - 先定位问题？继续使用 /dm:explore
  - 已知问题位置？使用 /dm:edit 进入编辑模式
  - 需要大范围修改？使用 /dm:plan 制定方案后再 /dm:build
\`\`\`

## 模式约束说明（Hook 强制执行）

- Explore / Plan 模式下，Write / Edit / NotebookEdit 工具调用会被 \`pre-tool-use.sh\` 拦截
- Build 模式下，修改"明确排除"列表中的文件会触发暂停
- 所有写操作都由 \`post-tool-use.sh\` 自动记录到 \`audit.log\`

## 可用命令速览

| 命令 | 用途 |
|------|------|
| \`/dm:explore\` | 进入只读分析模式 |
| \`/dm:edit\` | 进入小范围编辑模式 |
| \`/dm:plan\` | 制定结构化方案（强制检索 Graveyard） |
| \`/dm:build\` | 按计划执行（支持断点续传） |
| \`/dm:remember\` | 将本次决策沉淀为记忆 |
| \`/dm:recall\` | 检索历史记忆 |
| \`/dm:bury\` | 记录被否决的方案到 Graveyard |
| \`/dm:audit\` | 查看操作审计日志 |
| \`/dm:sync-memory\` | 同步团队记忆（git pull + 重建索引） |
| \`/dm:publish\` | 将当前功能整理为文档写入 \`docs/designs/draft/\` |
| \`/dm:release\` | 汇总 draft/ 生成版本文档，归档功能文档 |
`;

// ─── settings.local.json ──────────────────────────────────────────────────────

export const SETTINGS_LOCAL_JSON = `{
  "permissions": {
    "allow": [
      "Bash(chmod:*)",
      "Bash(tree:*)",
      "Bash(python:*)",
      "Bash(python3:*)",
      "Bash(.devmind/scripts/rebuild-index.sh:*)",
      "Bash(bash:*)"
    ],
    "deny": [],
    "ask": []
  },
  "hooks": {
    "PreToolUse": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": ".claude/hooks/pre-tool-use.sh"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": ".claude/hooks/post-tool-use.sh"
          }
        ]
      }
    ]
  }
}
`;
