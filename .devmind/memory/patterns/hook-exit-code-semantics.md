## 规律：Hook exit code 的语义选择

- 标签：hooks, exit-code, claude-code

**摘要**：Claude Code Hook 应使用 exit code 2（而非 1）来阻止操作，语义更清晰：阻止但不视为错误。

### 问题

在实现 DevMind 的 PreToolUse Hook 时，需要选择合适的 exit code 来阻止不符合模式约束的操作。

### 发现

根据 Claude Code 的 Hook 规范：
- **exit 0**：允许操作继续
- **exit 1**：错误，操作失败
- **exit 2**：阻止操作，但不视为错误

### 规律

对于"模式约束"这类场景，应该使用 **exit 2**：
- 不是代码错误或系统故障
- 只是当前模式不允许该操作
- 用户可以通过切换模式来解决

使用 exit 1 会让用户误以为是 Hook 脚本出错了。

### 应用

DevMind 的 `dm-pre-tool-use.js` 在以下场景使用 exit 2：
- Explore 模式阻止 Write/Edit/NotebookEdit
- Plan 模式阻止修改业务代码
- Build 模式阻止修改计划外文件

### 相关文件

- `packages/cli/src/bin/install-hooks.ts` (Hook 安装逻辑)
- 全局 Hook 目录：`~/.devmind/hooks/dm-pre-tool-use.js`
