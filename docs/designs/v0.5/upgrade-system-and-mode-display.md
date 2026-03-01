# DevMind 升级系统与模式可见性改进

> 生成日期：2026-03-01

## 背景

在 DevMind 的早期版本中，存在两个主要痛点：

1. **升级困难**：当 DevMind 框架更新时，用户需要手动对比和更新配置文件、命令模板、Hook 脚本等，容易遗漏或出错
2. **模式可见性差**：用户需要手动执行 `cat .devmind/current-mode.txt` 才能查看当前工作模式，在会话过程中频繁查询非常不便

这两个问题影响了用户体验，特别是当用户在不同模式间切换时，容易忘记当前所处的模式，导致误操作。

## 方案设计

### 1. 版本管理系统

在 `config.yaml` 中引入 `devmind_version` 字段，记录项目使用的 DevMind 版本：

```yaml
# DevMind 项目配置
devmind_version: "0.5.0"

project: MyProject
default_mode: explore
```

会话启动时，Claude Code 会自动读取此字段并与当前安装的 DevMind 版本对比，如果检测到版本不匹配，会提示用户升级：

```
⚠️  检测到 DevMind 有新版本可用
当前项目：v0.4.0 | 已安装：v0.5.0
建议运行：devmind init --upgrade
```

### 2. 智能升级命令

新增 `devmind init --upgrade` 命令，实现智能升级：

**升级策略**：
- **CLAUDE.md**：备份原文件为 `.claude/CLAUDE.md.backup`，提取用户自定义内容（分隔符后的部分），合并到新版本框架内容中
- **Slash 命令**：完全覆盖更新（`.claude/commands/dm/*.md`）
- **模式文档**：完全覆盖更新（`.devmind/modes/*.md`）
- **配置文件**：保留用户配置，仅确保文件存在
- **版本号**：自动更新 `config.yaml` 中的 `devmind_version`

**用户自定义内容保护**：
在 CLAUDE.md 模板末尾添加分隔符：
```markdown
---
<!-- 以下为用户自定义内容，DevMind 升级时不会被覆盖 -->
```

升级时会自动识别并保留分隔符后的所有内容。

### 3. 模式自动显示

在 CLAUDE.md 中添加"回复格式要求"章节，指示 Claude Code 在每次回复末尾显示当前模式：

```markdown
## 回复格式要求

**每次回复结束时**，读取 `.devmind/current-mode.txt` 并在末尾单独一行显示当前模式：

📍DevMind: {模式}
```

这样用户无需手动查询，就能随时了解当前所处的工作模式。

## 功能范围

### 本次实现

- ✅ 版本管理系统（`devmind_version` 字段）
- ✅ 会话启动时自动版本检测
- ✅ `devmind init --upgrade` 升级命令
- ✅ CLAUDE.md 智能合并（保留用户自定义内容）
- ✅ 自动备份机制（`.claude/CLAUDE.md.backup`）
- ✅ 模式自动显示功能
- ✅ 更新 README 文档（中英文）

### 明确排除

- ❌ 配置文件的智能合并（config.yaml、flow.yaml 暂时只确保存在，不做深度合并）
- ❌ 自动升级提示（不会自动执行升级，只提示用户手动运行）
- ❌ 版本回退功能

## 关键决策

### 1. 为什么使用备份而不是 git？

虽然用户可以通过 git 恢复文件，但并非所有用户都会提交 `.claude/` 目录。备份文件提供了一层额外保护，让用户可以快速对比和恢复。

### 2. 为什么 CLAUDE.md 使用智能合并，而配置文件不合并？

- **CLAUDE.md**：结构稳定，用户自定义内容通常在末尾追加，容易通过分隔符识别
- **config.yaml / flow.yaml**：结构可能变化，字段可能增删，智能合并容易出错。当前版本采用保守策略，未来可以考虑使用 YAML 解析器实现字段级合并

### 3. 为什么使用 exit code 2 而不是 1？

根据 Claude Code 的 Hook 规范，exit code 2 表示"阻止操作但不视为错误"，更符合 DevMind 模式约束的语义。

### 4. 为什么在每次回复末尾显示模式？

考虑过的方案：
- ❌ Claude Code status line：需要开发 VSCode 插件，复杂度高
- ❌ 系统通知：干扰性太强
- ❌ 文件监控：需要额外进程，资源消耗
- ✅ 提示词指示：零成本，实时更新，不干扰正常对话

## 已知限制 / 后续计划

### 当前限制

1. **配置文件合并不智能**：升级时不会自动合并新增的配置字段，用户需要手动对比
2. **无版本回退**：只能升级到最新版本，不支持降级或指定版本
3. **备份文件需手动清理**：升级后会留下 `.claude/CLAUDE.md.backup`，需要用户确认后手动删除

### 后续计划

- **v0.6.x**：实现配置文件的字段级智能合并
- **v0.7.x**：支持版本回退和指定版本升级
- **v0.8.x**：自动清理备份文件（在用户确认后）
- **v1.0.x**：完整的迁移和升级向导（交互式 CLI）

## 相关文件

- `packages/cli/src/commands/upgrade.ts`（新增）
- `packages/cli/src/commands/init.ts`（修改）
- `packages/cli/src/templates.ts`（添加版本检测和模式显示）
- `packages/cli/src/templates-devmind.ts`（添加 devmind_version 字段）
- `.claude/CLAUDE.md`（添加版本检测和回复格式要求）
- `README.md` / `README_CN.md`（更新 v0.5.0 说明）
