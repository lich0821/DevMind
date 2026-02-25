## 规律：Claude  Code Hook 数据通过 stdin 传入

**摘要**：Claude  Code 的 PreToolUse/PostToolUse Hook 将工具调用信息以 JSON 格式写入脚本的 stdin，而非环境变量；使用 `$TOOL_NAME` / `$TOOL_INPUT` 环境变量读取会始终为空。

- 标签：hooks, claude-code, shell
- 首次发现：2026-02-25
- 背景：audit.log 一直为空，排查发现 `$TOOL_NAME` 在 hook 脚本中始终为空字符串，env 中无任何 TOOL 相关变量。
- 正确做法：

```bash
# ✅ 正确：从 stdin 读取
HOOK_INPUT=$(cat)
TOOL_NAME=$(printf '%s' "$HOOK_INPUT" | grep -o '"tool_name":"[^"]*"' | cut -d'"' -f4)

# ❌ 错误：环境变量始终为空
if echo "$TOOL_NAME" | grep -qE '^(Write|Edit)$'; then  # 永远不匹配
```

- stdin JSON 结构（PostToolUse）：`{"tool_name":"Write","tool_input":{"file_path":"...","content":"..."},"tool_response":{...}}`
- stdin JSON 结构（PreToolUse）：`{"tool_name":"Write","tool_input":{"file_path":"...","content":"..."}}`

---

AI 使用提示：凡涉及编写或修改 `.claude/hooks/` 下的 shell 脚本，先读此规律。
