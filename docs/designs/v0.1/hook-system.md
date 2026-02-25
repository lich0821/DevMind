---
milestone: v0.1
---

# Hook 系统：模式约束与审计日志

> 生成日期：2026-02-25

## 背景

DevMind 的工作模式（explore/plan/build/edit）要在 AI 工具调用层而非对话层强制执行。如果仅在 `CLAUDE.md` 提示词中声明约束，AI 在上下文压力大时可能"遗忘"规则，用户无法信任模式边界。

Claude  Code 的 PreToolUse / PostToolUse Hook 机制提供了一个工具调用拦截点：每次 AI 调用写操作工具时，先执行 Hook 脚本，脚本退出码非 0 则工具调用被阻断。这是实现"强制执行而非建议遵守"的基础设施。

## 方案设计

### 整体架构

```
AI 发起写操作（Write/Edit/NotebookEdit）
    ↓
pre-tool-use.sh（PreToolUse Hook）
    ├── 读取 current-mode.txt
    ├── explore 模式 → exit 1（拦截）
    ├── plan 模式 → 检查文件路径 → 非 .devmind/ → exit 1（拦截）
    ├── build 模式 → 检查"明确排除"列表 → 命中 → exit 1（暂停）
    └── 其他 → exit 0（放行）
         ↓
工具调用执行
         ↓
post-tool-use.sh（PostToolUse Hook）
    └── 写操作成功 → 追加记录到 audit.log
```

### Hook 数据输入

Claude  Code 将工具调用信息以 JSON 格式写入脚本的 **stdin**，不使用环境变量：

```json
{"tool_name": "Write", "tool_input": {"file_path": "/path/to/file", ...}}
```

脚本通过 `cat` 读取 stdin，再用纯 bash 的 `grep -o` 提取字段，无需 `jq` 等外部依赖。

### pre-tool-use.sh：模式约束

拦截目标工具：`Write`、`Edit`、`NotebookEdit`

**explore 模式**：所有写操作直接 `exit 1`，输出错误提示和切换建议。

**plan 模式**：允许写 `.devmind/` 内部文件（AI 需要写 `current-plan.md`），拦截其他路径，提示使用 `/dm:build`。

**build 模式**：解析 `current-plan.md` 中的 `### 明确排除` 部分，用 `awk` 提取列表项，逐条与目标文件路径做 `grep` 匹配，命中时 `exit 1` 并列出选项（允许/例外/跳过/切回Plan）。

**edit 模式**：当前版本放行所有写操作（文件数量计数由 AI 层处理），Hook 层不做额外限制。

### post-tool-use.sh：审计日志

每次写操作成功后，追加一行到 `audit.log`：

```
[2026-02-25 18:30:00] build  packages/cli/src/templates-devmind.ts  plan:更新模板配置
```

格式：`[时间戳] 模式  文件路径  plan:计划标题`

同时读取 `current-mode.txt` 和 `current-plan.md` 的首行，即使文件不存在也有默认值（`unknown` / `none`），不会导致脚本出错。

## 功能范围

**本次实现：**
- `pre-tool-use.sh`：explore/plan/build 模式的写操作拦截
- `post-tool-use.sh`：写操作审计日志自动记录
- 无外部依赖（纯 bash + awk，不依赖 jq/python）

**明确排除：**
- edit 模式的文件数量计数（当前在 Hook 层不实现，依赖 AI 自律 + 提示词约束）
- Bash 工具调用的拦截（当前只拦截 Write/Edit/NotebookEdit）
- build 模式的文件白名单正向检查（当前只做黑名单/排除检查）

## 关键决策

**1. 使用 stdin 而非环境变量**

Claude  Code 的 Hook 将工具数据写入 stdin，`$TOOL_NAME` / `$TOOL_INPUT` 环境变量始终为空。早期版本曾尝试读取环境变量导致脚本始终放行所有操作，问题发现后改为 `HOOK_INPUT=$(cat)` 从 stdin 读取。

**2. 纯 bash 解析 JSON，不依赖 jq**

Hook 脚本需要在任意开发机上开箱即用，不能假设安装了 `jq`。Hook 只需提取 `tool_name` 和 `file_path` 两个顶层字符串字段，用 `grep -o '"key":"[^"]*"'` 足够可靠，不需要完整 JSON 解析器。

**3. 绝对路径定位 DEVMIND_DIR**

`"$(cd "$(dirname "$0")/../.." && pwd)/.devmind"` 从 hook 脚本自身位置推算项目根目录，无需依赖 `$PWD` 或用户配置的路径，在任意工作目录下调用都能找到正确的 `.devmind/`。

## 已知限制 / 后续计划

- `pre-tool-use.sh` 的"明确排除"检测使用字符串匹配，复杂的 glob 模式（如 `src/**/*.ts`）不支持
- Bash 工具调用（如 `rm`、`git`）不在拦截范围内，build 模式下 AI 仍可通过 Bash 工具修改文件
- 计划支持 `flow.yaml` 中定义的危险命令检测（DROP TABLE、rm -rf 等），v0.1 尚未实现
