---
milestone: v0.1
---

# Phase 2 CLI 子命令：init / status / recall / audit

> 生成日期：2026-02-25

## 背景

DevMind v0.1 的核心功能通过 Claude Code Slash Commands 驱动，但这些命令只能在 Claude Code 会话内使用。开发者在终端独立工作时（如 CI 脚本、git hooks、日常检查），需要一种不依赖 AI 会话的方式来查询项目状态、搜索记忆和审计操作日志。

Phase 2 引入 `devmind` CLI 工具，提供一组只读（除 `init` 外）的子命令，补全 AI 会话之外的工作流缺口。

## 方案设计

### 整体架构

```
packages/cli/
  bin/devmind.js          ← 入口（shebang + require）
  src/
    index.ts              ← commander 注册所有子命令
    commands/
      init.ts             ← 初始化项目结构
      status.ts           ← 查看当前状态
      recall.ts           ← 关键词检索记忆
      audit.ts            ← 查看操作审计日志
    utils/
      find-devmind.ts     ← walk-up 策略查找 .devmind/
```

### find-devmind：walk-up 策略

所有子命令（`init` 除外）都需要定位 `.devmind/` 目录。采用与 `git` 一致的 walk-up 策略：从 `process.cwd()` 开始，逐级向上查找，直到找到包含 `.devmind/` 的目录或到达文件系统根目录。

好处：用户可以在项目任意子目录下运行 `devmind status`，无需 `cd` 到项目根目录。

### devmind init

在当前目录生成完整的 `.devmind/` 和 `.claude/` 目录结构：

- `.devmind/`：config.yaml、flow.yaml、modes/、memory/、scripts/
- `.claude/hooks/`：pre-tool-use.sh、post-tool-use.sh（可执行权限）
- `.claude/commands/dm/`：11 条 Slash Command 模板
- `.claude/CLAUDE.md`：状态感知提示

所有文件内容来自 `templates-devmind.ts` 和 `templates-commands.ts` 中的常量字符串，**已存在的文件跳过**（不覆盖），避免破坏用户已自定义的配置。

### devmind status

读取并格式化输出：
- `current-mode.txt`：当前工作模式（带颜色标注）
- `current-plan.md`：活跃计划标题和选定方案
- `session.yaml`：检查点进度（已完成数 / 总数、最近一个暂停原因）

### devmind recall \<keyword\>

全文搜索 `memory/` 下三类目录：
- `decisions/`：技术决策记录
- `patterns/`：可复用规律和教训
- `graveyard/`：被否决方案（命中时额外警告）

搜索逻辑：文件名 + 文件全文内容，输出标题、摘要、标签和匹配上下文行。

### devmind audit

读取 `audit.log`，支持过滤参数：
- `--last N`：最近 N 条记录（默认 20）
- `--plan <name>`：按计划名过滤
- `--mode <mode>`：按工作模式过滤

以对齐表格格式输出，底部附统计摘要（各模式写操作数量）。

## 功能范围

**本次实现：**
- `devmind init`：完整项目初始化，跳过已存在文件
- `devmind status`：只读状态查看
- `devmind recall <keyword>`：记忆关键词搜索
- `devmind audit`：审计日志查看（含过滤）
- `find-devmind` 工具函数（walk-up 策略）
- npm 包 `@lich0821/devmind` v0.1.0 发布

**明确排除：**
- `devmind init` 的交互式向导（solo/team 配置问答）—— Phase 3 计划
- `devmind mode <mode>`：终端模式切换命令
- `devmind migrate`：旧版配置迁移工具
- 语义相似度搜索（recall 目前为关键词匹配）

## 关键决策

**1. walk-up 策略与 git 行为保持一致**

用户对 `git` 可以在子目录运行的体验已经形成肌肉记忆，`devmind` 遵循同样规则。统一使用 `find-devmind.ts` 工具函数，不要求用户指定 `--root` 路径，零配置开箱即用。

**2. init 跳过已存在文件，而非覆盖**

`devmind init` 是幂等操作：在已初始化的项目上重新运行时，只补全缺失文件，保留用户已自定义的配置。如需强制重置，用户可手动删除目标文件后再运行。

**3. CLI 只读优先，写操作最小化**

Phase 2 CLI 的定位是"AI 会话之外的观察窗口"。除 `init` 外所有命令均为只读，不修改任何状态文件，确保终端操作不干扰 AI 会话的上下文。

## 已知限制 / 后续计划

- `devmind init` 目前为非交互式（静默生成所有文件），计划在 Phase 3 添加问答向导（solo/team、项目名称等）
- `devmind recall` 为关键词字符串匹配，不支持语义相似度；Phase 3 计划引入本地 embedding 方案
- `devmind status` 的 session 进度解析依赖 `session.yaml` 格式，格式变更时需同步更新解析逻辑
