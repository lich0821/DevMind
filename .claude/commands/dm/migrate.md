---
description: 理解当前项目并迁移到 DevMind 记忆系统（支持通用项目和 OpenSpec 项目）
---

执行 **MIGRATE**——读取项目现状，将已有知识迁移到 DevMind 记忆系统。

## 前置操作

```sh
echo "edit" > .devmind/current-mode.txt
```

## 执行步骤

### 步骤1：读取迁移清单

读取 `.devmind/migrate-checklist.md`。

如果文件不存在，提示：
```
未找到迁移清单。请先在终端运行：
  devmind migrate
```

从清单中提取：
- 项目名称
- 技术栈
- 是否为 OpenSpec 项目
- 进行中 / 已归档的 OpenSpec changes（如有）

### 步骤2：探索项目

进入只读探索，**不修改任何业务文件**。

按优先级读取：
1. `README.md`（或 `README.mdx`）
2. 项目根目录结构（`ls` 或 `tree -L 2`）
3. 主要源码目录（`src/`、`pkg/`、`lib/` 等）顶层文件列表
4. 如果是 OpenSpec 项目：读取 `openspec/specs/` 下的 spec 文件

**目标**：理解项目的核心架构和关键设计决策，不要深入每个实现文件。

### 步骤3：更新 config.yaml

将 `.devmind/config.yaml` 中的 `project: MyProject` 替换为实际项目名称。

### 步骤4：提炼并写入记忆

#### 4a：架构决策 → memory/decisions/

识别 1-5 个最重要的**已落地**架构决策，写入 `.devmind/memory/decisions/YYYY-MM-DD_[slug].md`。

决策识别标准：
- 技术选型（为什么选 X 而不是 Y）
- 架构边界（模块如何划分）
- 数据模型核心约定
- 重要的 trade-off

如果是 OpenSpec 项目，将 `openspec/changes/archive/` 中的每个归档变更转换为一条 decision：
- 标题来自 `proposal.md` 的 H1
- 摘要来自 `proposal.md` 的背景/目的
- 决策内容来自 `design.md`（如存在）

#### 4b：开发规律 → memory/patterns/

识别 1-3 个项目特有的**开发规律**，写入 `.devmind/memory/patterns/[slug].md`。

规律识别标准：
- 项目独特的代码组织方式
- 特定的命名或文件结构约定
- 开发环境的特殊要求（如构建工具限制）

#### 4c：进行中的变更 → current-plan.md（仅 OpenSpec 项目）

如果存在进行中的 OpenSpec change（`openspec/changes/<name>/`，非 archive），
读取其 `proposal.md` 和 `tasks.md`，生成对应的 `.devmind/current-plan.md`：

```markdown
# 计划：[proposal 标题]

> 迁移自 OpenSpec change: [change-name]  日期：YYYY-MM-DD

## Spec

### 预期产出（可验证）
- [ ] [tasks.md 中每个未完成的任务]

### 允许修改的文件范围
- （根据 proposal/design 推断）

## 执行步骤

[根据 tasks.md 转换]
```

如有多个进行中的 change，只转换第一个，其余作为 decisions 记录。

#### 4d：被放弃的方案 → memory/graveyard/（可选）

如果在 git log 或项目历史中发现明显被放弃的技术方案，询问开发者：

```
发现可能被放弃的方案：[方案描述]
是否写入 Graveyard？(y/n/skip-all)
```

### 步骤5：重建索引

```sh
.devmind/scripts/rebuild-index.sh
```

### 步骤6：输出迁移摘要

```
迁移完成：

✓ config.yaml 已更新：project: [项目名]
✓ 写入 N 条 Decisions：
  - [文件名]：[摘要]
✓ 写入 M 条 Patterns：
  - [文件名]：[摘要]
[✓ current-plan.md 已从 OpenSpec change 转换]
✓ 索引已重建

建议下一步：
  /dm:explore — 开始探索项目，DevMind 已加载项目背景
```

## 注意

- 不修改任何业务代码（src/、lib/ 等）
- 不删除 OpenSpec 文件（只读取，不迁移掉原文件）
- 记忆文件宁可少写、写准，不要为填充数量而生成低质量条目
- 完成后将模式切回 explore：`echo "explore" > .devmind/current-mode.txt`
