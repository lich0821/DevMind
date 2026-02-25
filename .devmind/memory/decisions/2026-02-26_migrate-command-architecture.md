## 决策：migrate 命令两层架构

- 日期：2026-02-26
- 标签：migrate, cli, slash-command, architecture

**摘要**：`devmind migrate` CLI 只负责脚手架（检测项目类型、生成 checklist），实际的记忆文件填充由 `/dm:migrate` slash command 交给 Claude Code 完成，利用 AI 的代码理解能力而非硬编码规则。

### 背景

存量项目（含 OpenSpec 项目）在引入 DevMind 后需要将已有知识迁移到 memory 系统。最初考虑让 CLI 直接解析代码并写入 memory，但 CLI 无法理解代码语义，也无法识别架构决策。

### 决策内容

分两层：

1. **CLI 层**（`devmind migrate [path]`）
   - 职责：检测 tech stack、OpenSpec 结构、git log，写入 `.devmind/migrate-checklist.md`
   - 不做任何内容判断，只收集客观信息
   - 无需交互，秒级完成

2. **Slash Command 层**（`/dm:migrate`）
   - 职责：读取 checklist，探索代码库（README、目录结构、源码），提炼写入 `memory/decisions/`、`memory/patterns/`、可选 `current-plan.md` 和 `memory/graveyard/`
   - 由 AI 负责语义理解，人工审核后确认

### 理由

- CLI 处理客观信息（文件存在性、package.json 字段），AI 处理主观判断（哪些是架构决策、哪些是规律）
- 这与 DevMind 整体设计一致：工具做框架，AI 做内容
- OpenSpec archived changes → decisions 的映射也依赖 AI 读取 proposal.md 理解意图
