// templates-commands2.ts — Slash command templates (part 2: remember/recall/bury/audit/sync-memory/publish/release/migrate/auto)

export const CMD_AUTO = `---
description: 输入一句话需求，自动完成 explore→plan→build 全流程
---

进入 **AUTO 模式**（全自动流水线）。

## 前置操作

\`\`\`sh
echo "build" > .devmind/current-mode.txt
\`\`\`

## 模式说明

AUTO 模式将 explore → plan → build 串联为一条流水线，**低风险改动全程自动，高风险改动暂停确认**。

适用场景：
- 需求明确、改动范围可预期的新功能
- Bug 修复
- 小型重构

不适用场景：
- 架构级改动（使用 \`/dm:plan\` 手动规划）
- 不确定改动范围的探索性任务（使用 \`/dm:explore\` 先分析）

---

## 执行流程

### 阶段 0：启动准备

1. 读取 \`.devmind/memory/index.md\` 加载记忆索引
2. 检索 \`.devmind/memory/graveyard/\` 是否有与当前需求相似的否决方案
   - 若有匹配，**输出警告并暂停**，等待确认后继续
3. 读取当前需求（用户输入的一句话）

### 阶段 1：Explore（自动执行，不等待确认）

快速探索与需求相关的代码区域：
- 定位涉及的文件和模块
- 理解现有实现逻辑
- 评估改动影响范围

输出探索摘要（3-5 条关键发现），然后**直接进入阶段 2**，无需确认。

### 阶段 2：Plan + 风险评估（门控节点）

生成执行方案，然后自动进行风险评估：

**低风险条件（全部满足时自动推进）：**
- 涉及文件 ≤ 5 个
- 不新增 npm/pip/go 依赖
- 不修改 hook 脚本、配置文件 schema
- 不涉及数据库 migration 或破坏性 API 变更
- 改动类型为：新增文件、修改局部函数、增加配置项

**触发暂停的条件（任一满足时暂停等待确认）：**
- 涉及文件 > 5 个
- 需要新增依赖
- 需要修改核心基础设施文件（hooks、auth、数据库）
- 改动影响多个模块的公共接口
- 存在不确定的技术方案需要选择

暂停时输出：
\`\`\`
AUTO 模式门控：检测到中/高风险改动，需要确认后继续。

风险原因：[具体原因]
计划改动：
  - [文件1]：[改动描述]
  - [文件2]：[改动描述]

输入任意内容继续，或输入 "stop" 取消。
\`\`\`

低风险时直接输出：
\`\`\`
AUTO 模式：风险评估通过（低风险），自动推进...
涉及文件：[N] 个 | 无新依赖 | 改动类型：[类型]
\`\`\`

### 阶段 3：生成 Spec 并写入 current-plan.md

将方案写入 \`.devmind/current-plan.md\`，格式遵循标准 Spec 结构（约束、预期产出、允许范围、明确排除、执行步骤）。

写入后**直接进入阶段 4**，无需确认。

### 阶段 4：Build（自动执行）

按执行步骤逐步实现，每完成一步向 \`.devmind/session.yaml\` 写入检查点。

遇到以下情况**立即暂停**：
- 需要修改"明确排除"列表中的文件
- 发现预期外的依赖或副作用
- 编译/类型检查报错且无明确修复方向
- 需要做非预期的架构决策

### 阶段 5：验证与收尾

1. 运行项目的验证命令（lint、类型检查、测试——根据项目类型自动判断）
2. 输出完成摘要：
   \`\`\`
   AUTO 完成

   需求：[原始需求]
   改动文件：[列表]
   验证结果：[通过/失败]

   建议：使用 /dm:remember 沉淀本次决策
   \`\`\`

---

## 注意事项

- AUTO 模式下 Hook 仍然生效：explore/plan 阶段 Write/Edit 调用仍会被拦截
- 阶段 1-2 期间模式为 \`explore\`，阶段 3-4 期间模式为 \`build\`
- 任何阶段的暂停都可以通过回复继续，或输入 \`/dm:build\` 从断点续传
`;

export const CMD_REMEMBER = `---
description: 将本次会话中出现的决策和经验规律沉淀为记忆文件
---

执行 **REMEMBER**——将本次会话中出现的决策和经验规律沉淀为记忆文件。

## 执行步骤

### 步骤1：识别值得记录的内容

回顾本次会话，主动识别：

**决策（Decisions）**：选择了某个技术方案并有明确理由；确定了某个编码规范；做了架构级取舍。

**规律（Patterns）**：同类问题出现 2 次以上；某种做法被反复验证有效；值得提醒未来 AI 避免的坑。

如果没有值得记录的内容，告知开发者，不强行生成。

### 步骤2：直接写入正式目录

写入对应目录：
- Decision → \`.devmind/memory/decisions/YYYY-MM-DD_[slug].md\`
- Pattern → \`.devmind/memory/patterns/[slug].md\`

文件必须包含 \`**摘要**\` 字段（1-2句话）。

### 步骤3：重建索引

执行：
\`\`\`sh
.devmind/scripts/rebuild-index.sh
\`\`\`

### 步骤4：告知开发者

\`\`\`
已写入 N 条记忆：
- [类型] [文件名]：[摘要]

索引已更新。如需撤销，删除对应文件后重新运行 rebuild-index.sh。
\`\`\`

## 注意

- 直接写入正式目录，无需人工移动
- 摘要字段要简洁准确，这是未来检索的主要依据
- 写错了可以删除文件后重建索引撤销
`;

export const CMD_RECALL = `---
description: 关键词检索历史记忆（decisions / patterns / graveyard）
---

执行 **RECALL**——关键词检索历史记忆。

## 用法

\`\`\`
/dm:recall <关键词>
\`\`\`

## 执行步骤

### 步骤1：解析搜索词

从命令参数中提取关键词。如果没有提供关键词，提示用户输入。

### 步骤2：搜索范围

在以下位置搜索包含关键词的内容：
- \`.devmind/memory/decisions/*.md\` — 历史决策
- \`.devmind/memory/patterns/*.md\` — 经验规律
- \`.devmind/memory/graveyard/*.md\` — 被否决的方案

优先匹配顺序：文件名 → \`**摘要**\` 字段 → \`标签：\` 行 → 文件正文。

### 步骤3：输出结果

\`\`\`
找到 N 条相关记忆：

[类型] 文件名
摘要：[摘要内容]
标签：[标签]
---
\`\`\`

如果找到 Graveyard 相关结果，提示：
\`\`\`
⚠️ 发现相关的已否决方案，建议在 /dm:plan 前仔细阅读。
\`\`\`
`;

export const CMD_BURY = `---
description: 将当前被否决的方案结构化写入 Graveyard，防止未来重蹈覆辙
---

执行 **BURY**——将被否决的方案写入 Graveyard。

## 触发场景

- 刚刚否决了一个方案
- 开发者明确说"不要用 X 方案"
- 某个技术路线实验后被放弃

## 执行步骤

### 步骤1：收集信息

从上下文自动识别或询问：
1. **方案名称**
2. **原始想法**
3. **否决原因**（1-3 个具体原因）
4. **替代方案**（最终采用的是什么）
5. **关键词**（3-5 个，用于未来自动检测）

### 步骤2：生成 Graveyard 文件

写入 \`.devmind/memory/graveyard/[slug].md\`：

\`\`\`markdown
## 放弃方案：[方案名]

- 日期：YYYY-MM-DD
- 提议者：[来源]
- 关键词：[关键词1], [关键词2], [关键词3]
- 原始想法：[当时的提议]
- 放弃原因：
  1. [原因1]
  2. [原因2]
- 替代方案：[最终采用的方案]
- 相似方案特征：[如何识别重蹈覆辙的提议]

---

AI 使用提示：如果再提议类似方案，先读此文件。
\`\`\`

### 步骤3：提醒重建索引

\`\`\`
已写入 Graveyard：.devmind/memory/graveyard/[slug].md

运行以下命令更新索引：
  .devmind/scripts/rebuild-index.sh
\`\`\`
`;

export const CMD_AUDIT = `---
description: 查看文件修改审计日志，支持按计划名或数量过滤
---

执行 **AUDIT**——查看文件修改审计日志。

## 用法

\`\`\`
/dm:audit          — 显示最近 20 条记录
/dm:audit 50       — 显示最近 50 条记录
/dm:audit plan:xxx — 显示特定计划的所有记录
/dm:audit build    — 显示所有 build 模式的记录
\`\`\`

## 执行步骤

读取 \`.devmind/audit.log\`，按参数过滤，格式化输出：

\`\`\`
时间                    模式     文件                              计划
──────────────────────────────────────────────────────────────────────
2026-02-23 14:32:12    build    src/services/resourceService.ts   migrate-to-d1
\`\`\`

输出末尾附统计摘要：\`共 N 条记录，涉及 M 个文件\`

如果 \`audit.log\` 为空，输出：\`暂无审计记录。audit.log 由 PostToolUse Hook 自动写入。\`
`;

export const CMD_SYNC_MEMORY = `---
description: 同步团队记忆（git pull + 重建索引 + 冲突检测）
---

执行 **SYNC-MEMORY**——同步团队记忆。

## 执行步骤

### 步骤1：拉取最新变更

\`\`\`sh
git pull origin main
\`\`\`

如果失败（冲突或网络问题），停止并提示开发者手动处理。

### 步骤2：检查 memory/ 冲突

\`\`\`sh
git status | grep "memory/"
\`\`\`

如果有冲突文件，输出：
\`\`\`
⚠️ 发现 memory/ 目录下有合并冲突：
- [冲突文件列表]

请手动解决冲突后，重新运行 /dm:sync-memory
\`\`\`

### 步骤3：重建索引

\`\`\`sh
.devmind/scripts/rebuild-index.sh
\`\`\`

### 步骤4：输出同步摘要

\`\`\`
同步完成：
- 拉取了 N 个新提交
- memory/ 新增/修改了 M 个文件
- 索引已更新：X 条 Decisions，Y 条 Patterns，Z 条 Graveyard
\`\`\`

## 注意

个人使用时，直接运行 \`.devmind/scripts/rebuild-index.sh\` 即可，无需 git pull。
`;

export const CMD_PUBLISH = `---
description: 将当前功能整理为文档写入 docs/designs/draft/
---

进入 **PUBLISH 模式**（生成功能文档）。

## 执行步骤

### 步骤1：收集信息

读取以下内容：
- \`.devmind/current-plan.md\`（当前或刚完成的计划）
- \`.devmind/memory/decisions/\`（本次任务相关的决策，按日期判断）

### 步骤2：确定文档 slug

根据计划标题生成 slug（kebab-case，英文），向开发者确认：

\`\`\`
即将生成文档：docs/designs/draft/<slug>.md
文档标题：[标题]

确认？(1) 确认  (2) 修改 slug
\`\`\`

### 步骤3：生成文档

写入 \`docs/designs/draft/<slug>.md\`，格式如下：

\`\`\`markdown
# <功能标题>

> 生成日期：YYYY-MM-DD

## 背景

<为什么要做这个功能，解决什么问题>

## 方案设计

<具体实现方案，架构说明，关键设计决策>

## 功能范围

<本次实现了什么，明确排除了什么>

## 关键决策

<列出本次涉及的重要决策及理由>

## 已知限制 / 后续计划

<当前方案的限制，以及计划在未来版本中改进的点>
\`\`\`

### 步骤4：提示加入 milestone（可选）

输出：

\`\`\`
文档已生成：docs/designs/draft/<slug>.md

是否加入某个 milestone？
(1) 暂不归入（保留在 draft/）
(2) 输入版本号（如 v0.1），在 /dm:release 时会自动收录
\`\`\`

如果用户输入版本号，在文档头部追加 frontmatter：

\`\`\`markdown
---
milestone: vxx
---
\`\`\`

## 注意

- 文档面向人类开发者，语言清晰可读，避免 AI 元数据语言
- 不修改 \`.devmind/memory/\` 下的任何文件（那是 /dm:remember 的职责）
- 如需同时沉淀 AI 记忆，执行完后提示使用 \`/dm:remember\`
`;

export const CMD_RELEASE = `---
description: 汇总 docs/designs/draft/ 生成版本文档，归档功能文档
---

进入 **RELEASE 模式**（生成版本文档）。

## 执行步骤

### 步骤1：读取 draft/ 内容

读取 \`docs/designs/draft/\` 下所有 \`.md\` 文件（忽略 \`.gitkeep\`）。

如果 draft/ 为空，停止并提示：

\`\`\`
docs/designs/draft/ 目录为空，没有可发布的功能文档。
请先使用 /dm:publish 生成功能文档。
\`\`\`

### 步骤2：确认版本号

向开发者确认版本号：

\`\`\`
draft/ 下共有 N 个功能文档：
- <slug1>.md — <标题>
- <slug2>.md — <标题>
...

请输入版本号（如 v1.0、v0.2-beta）：
\`\`\`

### 步骤3：生成版本文档

写入 \`docs/releases/<version>.md\`，格式如下：

\`\`\`markdown
# Release <version>

> 发布日期：YYYY-MM-DD

## 本版本包含

<逐条列出各功能的简要说明，附链接到对应设计文档>

- **[功能标题](../designs/<version>/<slug>.md)**：<一句话说明>

## 架构变化

<如有重大架构调整，在此说明；无则省略>

## 已知问题 / 后续计划

<当前版本的限制，下一版本的方向>
\`\`\`

### 步骤4：归档 draft/

执行以下操作：
1. 将 \`docs/designs/draft/\` 重命名为 \`docs/designs/<version>/\`
2. 新建空的 \`docs/designs/draft/\` 目录，写入 \`.gitkeep\`

向开发者确认后执行：

\`\`\`
即将执行：
  docs/designs/draft/ → docs/designs/<version>/
  新建空 docs/designs/draft/

确认？(1) 确认  (2) 取消
\`\`\`

### 步骤5：完成提示

\`\`\`
✓ 版本文档已生成：docs/releases/<version>.md
✓ 功能文档已归档：docs/designs/<version>/
✓ draft/ 已重置，可开始记录下一版本功能

建议：使用 /dm:remember 将本版本的关键决策沉淀为 AI 记忆
\`\`\`

## 注意

- 重命名操作不可撤销，执行前必须向用户确认
- 不修改 \`.devmind/memory/\` 下的任何文件
- 版本号格式由用户决定，不强制规范
`;

export const CMD_MIGRATE = `---
description: 理解当前项目并迁移到 DevMind 记忆系统（支持通用项目和 OpenSpec 项目）
---

执行 **MIGRATE**——读取项目现状，将已有知识迁移到 DevMind 记忆系统。

## 前置操作

\`\`\`sh
echo "edit" > .devmind/current-mode.txt
\`\`\`

## 执行步骤

### 步骤1：读取迁移清单

读取 \`.devmind/migrate-checklist.md\`。

如果文件不存在，提示：
\`\`\`
未找到迁移清单。请先在终端运行：
  devmind migrate
\`\`\`

从清单中提取：
- 项目名称
- 技术栈
- 是否为 OpenSpec 项目
- 进行中 / 已归档的 OpenSpec changes（如有）

### 步骤2：探索项目

进入只读探索，**不修改任何业务文件**。

按优先级读取：
1. \`README.md\`（或 \`README.mdx\`）
2. 项目根目录结构（\`ls\` 或 \`tree -L 2\`）
3. 主要源码目录（\`src/\`、\`pkg/\`、\`lib/\` 等）顶层文件列表
4. 如果是 OpenSpec 项目：读取 \`openspec/specs/\` 下的 spec 文件

**目标**：理解项目的核心架构和关键设计决策，不要深入每个实现文件。

### 步骤3：更新 config.yaml

将 \`.devmind/config.yaml\` 中的 \`project: MyProject\` 替换为实际项目名称。

### 步骤4：提炼并写入记忆

#### 4a：架构决策 → memory/decisions/

识别 1-5 个最重要的**已落地**架构决策，写入 \`.devmind/memory/decisions/YYYY-MM-DD_[slug].md\`。

决策识别标准：
- 技术选型（为什么选 X 而不是 Y）
- 架构边界（模块如何划分）
- 数据模型核心约定
- 重要的 trade-off

如果是 OpenSpec 项目，将 \`openspec/changes/archive/\` 中的每个归档变更转换为一条 decision：
- 标题来自 \`proposal.md\` 的 H1
- 摘要来自 \`proposal.md\` 的背景/目的
- 决策内容来自 \`design.md\`（如存在）

#### 4b：开发规律 → memory/patterns/

识别 1-3 个项目特有的**开发规律**，写入 \`.devmind/memory/patterns/[slug].md\`。

规律识别标准：
- 项目独特的代码组织方式
- 特定的命名或文件结构约定
- 开发环境的特殊要求（如构建工具限制）

#### 4c：进行中的变更 → current-plan.md（仅 OpenSpec 项目）

如果存在进行中的 OpenSpec change（\`openspec/changes/<name>/\`，非 archive），
读取其 \`proposal.md\` 和 \`tasks.md\`，生成对应的 \`.devmind/current-plan.md\`：

\`\`\`markdown
# 计划：[proposal 标题]

> 迁移自 OpenSpec change: [change-name]  日期：YYYY-MM-DD

## Spec

### 预期产出（可验证）
- [ ] [tasks.md 中每个未完成的任务]

### 允许修改的文件范围
- （根据 proposal/design 推断）

## 执行步骤

[根据 tasks.md 转换]
\`\`\`

如有多个进行中的 change，只转换第一个，其余作为 decisions 记录。

#### 4d：被放弃的方案 → memory/graveyard/（可选）

如果在 git log 或项目历史中发现明显被放弃的技术方案，询问开发者：

\`\`\`
发现可能被放弃的方案：[方案描述]
是否写入 Graveyard？(y/n/skip-all)
\`\`\`

### 步骤5：重建索引

\`\`\`sh
.devmind/scripts/rebuild-index.sh
\`\`\`

### 步骤6：输出迁移摘要

\`\`\`
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
\`\`\`

## 注意

- 不修改任何业务代码（src/、lib/ 等）
- 不删除 OpenSpec 文件（只读取，不迁移掉原文件）
- 记忆文件宁可少写、写准，不要为填充数量而生成低质量条目
- 完成后将模式切回 explore：\`echo "explore" > .devmind/current-mode.txt\`
`;
