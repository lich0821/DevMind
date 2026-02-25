// templates-commands2.ts — Slash command templates (part 2: remember/recall/bury/audit/sync-memory/publish/release)

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
