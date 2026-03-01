## 决策：Scripts 从项目级迁移到 CLI 命令

- 标签：cli, scripts, architecture
- 日期：2026-03-01

**摘要**：将 rebuild-index.js 和 check-graveyard.js 从项目级脚本改为 CLI 命令，避免每个项目重复相同代码。

### 背景

v0.5.0 之前，`rebuild-index.js` 和 `check-graveyard.js` 脚本通过 `devmind init` 生成到每个项目的 `.devmind/scripts/` 目录。这导致：
1. 每个项目都有相同的脚本副本
2. 脚本更新需要用户手动升级每个项目
3. 维护成本高，容易出现版本不一致

### 方案对比

| 方案 | 优点 | 缺点 |
|------|------|------|
| 全局脚本 + 路径参数 | 脚本集中管理 | 需要处理路径解析 |
| 全局脚本 + 环境变量 | 灵活配置 | 跨平台兼容性问题 |
| CLI 命令 + 内部实现 | 统一入口，TypeScript 实现 | 需要重构现有脚本 |

### 决策

采用 **CLI 命令 + 内部实现** 方案：
- 创建 `packages/cli/src/commands/rebuild-index.ts`
- 创建 `packages/cli/src/commands/check-graveyard.ts`
- 注册 CLI 命令：`devmind rebuild-index [path]` 和 `devmind check-graveyard <proposal> [path]`
- 默认使用 `process.cwd()` 作为项目路径
- 更新所有 Slash 命令模板使用新的 CLI 命令

### 理由

1. **统一入口**：所有 DevMind 功能通过 `devmind` 命令访问
2. **TypeScript 实现**：类型安全，易于维护
3. **自动更新**：用户升级 DevMind 包即可获得最新脚本逻辑
4. **向后兼容**：保留 `init.ts` 中的脚本生成逻辑，现有项目仍可使用本地脚本

### 影响

- 新项目：直接使用 CLI 命令，无需生成本地脚本
- 现有项目：可继续使用本地脚本，也可切换到 CLI 命令
- Slash 命令：从 `node .devmind/scripts/rebuild-index.js` 改为 `devmind rebuild-index`

### 相关文件

- `packages/cli/src/commands/rebuild-index.ts`（新增）
- `packages/cli/src/commands/check-graveyard.ts`（新增）
- `packages/cli/src/index.ts`（注册命令）
- `packages/cli/src/templates-commands.ts`（更新 CMD_PLAN）
- `packages/cli/src/templates-commands2.ts`（更新 CMD_REMEMBER, CMD_SYNC_MEMORY, CMD_MIGRATE）
