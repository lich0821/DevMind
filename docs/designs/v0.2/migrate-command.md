# 添加 migrate 命令

> 生成日期：2026-02-26

## 背景

DevMind 通过 `devmind init` 初始化项目框架，但对于已有代码的存量项目，init 只能建立空的 `.devmind/` 目录结构，无法将项目已有的架构知识、技术决策和开发规律迁移进来。

这导致 AI 在新项目中缺乏背景，每次会话都需要重新探索，无法利用 DevMind 记忆系统的优势。

同时，部分项目已使用 [OpenSpec](https://github.com/Fission-AI/OpenSpec) 管理变更，其 `openspec/changes/archive/` 中沉淀了大量已完成的架构决策，需要一条迁移路径将这些知识导入 DevMind。

## 方案设计

### 两层架构

迁移功能分为两层，各司其职：

**第一层：CLI（`devmind migrate [path]`）**

负责客观信息收集，无需 AI 参与：

1. 检测 `.devmind/` 是否存在，若无则先执行 `init`
2. 扫描项目信息：
   - 技术栈（`package.json` / `go.mod` / `pyproject.toml` / `Cargo.toml` 等）
   - 是否为 OpenSpec 项目（检测 `openspec/` 目录）
   - OpenSpec 已归档变更数量 / 进行中变更列表
   - `README.md` 是否存在
   - git log 最近 20 条（供 AI 参考）
3. 生成 `.devmind/migrate-checklist.md`，包含上述信息和迁移任务清单
4. 提示用户在 Claude  Code 中执行 `/dm:migrate`

**第二层：Slash Command（`/dm:migrate`）**

负责语义理解和内容填充，由 Claude  Code 执行：

1. 读取 `migrate-checklist.md`，了解项目基本情况
2. 进入只读探索：README、目录结构、主要源码顶层
3. 更新 `config.yaml` 中的 `project:` 字段
4. 提炼并写入记忆：
   - `memory/decisions/`：识别 1-5 个核心架构决策
   - `memory/patterns/`：识别 1-3 个项目特有开发规律
   - `current-plan.md`（仅 OpenSpec 项目）：将第一个进行中的 change 转换
   - `memory/graveyard/`（可选）：记录发现的被放弃方案
5. 重建索引，输出迁移摘要

### OpenSpec 映射规则

| OpenSpec 来源 | DevMind 目标 |
|--------------|-------------|
| `openspec/changes/archive/<name>/proposal.md` | `memory/decisions/YYYY-MM-DD_<name>.md` |
| `openspec/changes/<active>/`（第一个） | `.devmind/current-plan.md` |
| `openspec/changes/<active>/`（其余） | `memory/decisions/` |
| 被放弃的 changes | `memory/graveyard/`（询问用户） |

## 功能范围

**本次实现：**

- `packages/cli/src/commands/migrate.ts`：CLI 命令逻辑，含 `detectTechStack`、`detectOpenSpec`、`getGitLog`、`buildChecklist`、`runMigrate`
- `.claude/commands/dm/migrate.md`：`/dm:migrate` slash command（6 步迁移流程）
- `packages/cli/src/templates-commands2.ts`：`CMD_MIGRATE` 常量（与 `migrate.md` 同步，由 `devmind init` 安装到新项目）
- `packages/cli/src/commands/init.ts`：`buildFileMap()` 添加 `migrate.md` 条目
- `packages/cli/src/index.ts`：注册 `migrate [path]` 命令

**明确不在范围内：**

- 不自动提交 git（迁移后由用户决定是否提交）
- 不提供交互式向导（CLI 无交互，AI 负责内容判断）
- 不支持 `.dev.md` 格式的迁移
- 不修改 OpenSpec 原文件（只读取）

## 关键决策

**为什么 CLI 不直接写入 memory 文件？**

CLI 只能处理客观信息（文件是否存在、字段值），无法判断哪些是"架构决策"、哪些是"开发规律"——这需要语义理解。将内容填充交给 AI，与 DevMind 整体设计一致：工具做框架，AI 做内容。

**为什么生成 checklist 而不是直接启动 AI 会话？**

checklist 是 CLI 和 slash command 之间的异步契约。用户可以在任意时间执行 `devmind migrate`（终端）和 `/dm:migrate`（Claude  Code），两者不需要在同一会话中完成。

**模板同步约束：**

`CMD_MIGRATE` 常量内容必须与 `.claude/commands/dm/migrate.md` 保持同步。`devmind init` 通过 `buildFileMap()` 将常量内容安装到新项目中，不同步会导致已安装和新安装的项目行为不一致。

## 已知限制 / 后续计划

- `detectTechStack()` 目前仅检测顶层 `package.json`，monorepo 中的子包技术栈不会被识别
- `/dm:migrate` 对大型项目（数百个源文件）的探索深度有限，可能遗漏深层架构决策——但这是设计取舍（宁可少写、写准）
- 后续可考虑：`devmind migrate --dry-run` 选项，只输出 checklist 不写文件
