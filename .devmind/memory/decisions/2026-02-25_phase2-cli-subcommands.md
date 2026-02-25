## Phase 2 CLI 子命令架构：walk-up 路径发现 + 三个只读子命令

- 日期：2026-02-25
- 标签：cli, devmind, phase2, find-devmind, status, recall, audit

**摘要**：Phase 2 新增 `devmind status / recall / audit` 三个只读子命令，统一使用 walk-up 策略从 `process.cwd()` 向上查找 `.devmind/` 目录，无需用户指定路径，与 git 行为一致。

### 背景

Phase 1 仅有 `devmind init` 命令。Phase 2 目标是让用户在项目任意子目录下都能查询 DevMind 状态、搜索记忆、查看审计日志。

### 决策内容

**路径发现策略：walk-up**
- 新建 `packages/cli/src/utils/find-devmind.ts`
- `findDevmindDir(startDir)` 从起始目录向上遍历，直到找到含 `.devmind/` 的目录或到达文件系统根
- `requireDevmindDir()` 封装找不到时的 `process.exit(1)` 错误处理
- 所有子命令统一调用 `requireDevmindDir()`，不各自处理路径逻辑

**三个子命令职责划分**
| 命令 | 文件 | 核心数据源 |
|------|------|-----------|
| `status` | `commands/status.ts` | `current-mode.txt`, `current-plan.md`, `session.yaml` |
| `recall <keyword>` | `commands/recall.ts` | `memory/decisions/`, `memory/patterns/`, `memory/graveyard/` |
| `audit` | `commands/audit.ts` | `audit.log` |

**recall 实现细节**
- 关键词匹配：文件名 + 全文（大小写不敏感）
- 提取字段：第一个 `##` 标题、`**摘要**：` 行、`- 标签：` / `- 关键词：` 行
- 每个匹配文件最多显示 2 行上下文
- 分类颜色：cyan=Decision, green=Pattern, red=Graveyard

**audit 实现细节**
- 行格式：`[YYYY-MM-DD HH:MM:SS] <mode>  <file_path>  plan:<plan>`
- 支持 `--last N`（默认 20）、`--plan <name>`、`--mode <mode>` 过滤
- 文件路径截断至最后 3 段，plan 截断至 20 字符

### 否决的方案

- ~~要求用户始终在项目根目录运行~~：用户体验差，与 git 习惯不符
- ~~将路径作为命令行参数~~：增加使用负担，walk-up 策略更符合 Unix 工具惯例

### 验证

```
devmind status   → 显示 mode=build, plan=Phase 2 CLI..., 最近检查点 cp-005
devmind recall hook → 找到 2 条 Pattern 记录
devmind audit    → 显示格式化表格，13 条记录，10 个文件
tsc --noEmit     → 零错误
```
