# Hook 注册位置修复

## 背景

v0.2.0 将 DevMind 的 PreToolUse/PostToolUse hooks 写入项目级 `.claude/settings.local.json`，但实际不生效，导致 Explore 模式下写操作无法被拦截。

## 根本原因

通过阅读 Claude  Code CLI 源码（`cli.js`）定位到 hook 加载函数 `QJ0()`：

```javascript
function QJ0() {
    // policySettings 优先
    let A = uB("policySettings");
    if (A?.allowManagedHooksOnly === true) return A.hooks ?? {};
    // 否则只读用户级 settings
    return NQ().hooks ?? {};  // NQ() = uB("userSettings") = ~/.claude/settings.json
}
```

Claude  Code **只从用户级 `~/.claude/settings.json` 读取 hooks**，项目级 `.claude/settings.local.json` 中的 hooks 字段完全被忽略。

## 修复方案

- `devmind init` 新增 `injectUserHooks(projectDir)` 函数
- 将 hooks 写入 `~/.claude/settings.json`，使用**绝对路径**指向项目的 hook 脚本
- 幂等：已注册则跳过，不重复写入
- `SETTINGS_LOCAL_JSON` 模板移除 hooks 字段，避免误导

## 影响

- `devmind init` 执行后 hooks 真正生效
- 每个项目的 hook 路径独立，多项目并存时互不干扰
- `~/.claude/settings.json` 可能积累多个项目的 hook 条目（预期行为）
