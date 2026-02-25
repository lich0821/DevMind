---
milestone: v0.1
---

# 记忆系统：remember / recall / bury / sync-memory

> 生成日期：2026-02-25

## 背景

AI 编码助手在不同会话之间没有持久记忆：上次讨论的"不用 class 组件"决定，下次会话里一干二净。DevMind 的记忆系统通过本地 Markdown 文件存储跨会话知识，并提供轻量索引和检索机制，让 AI 在每次会话开始时能快速加载上下文，在制定方案时能主动避开已被否决的路径。

## 方案设计

### 目录结构

```
.devmind/memory/
  decisions/        ← 技术决策记录（why we did X）
  patterns/         ← 可复用规律和教训（how we do things）
  graveyard/        ← 被否决的方案（what NOT to do）
  index.md          ← 轻量索引（自动生成，会话启动时加载）
```

### 文件格式

**decisions/**：记录一次技术决策的背景、选项、理由和结论。每个决策一个文件，命名格式 `YYYY-MM-DD_slug.md`。

**patterns/**：记录可复用的工程规律或教训，如"nvm 在非交互 shell 下的用法"。帮助 AI 在类似场景中直接采用已验证的方案。

**graveyard/**：记录被明确否决的方案，含否决原因和关键词。`/dm:plan` 执行时强制调用 `check-graveyard.py` 检测，命中时发出警告，防止 AI 重复提议同类方案。

### index.md：轻量索引

会话启动时 `CLAUDE.md` 要求 AI 加载 `memory/index.md`。该文件为轻量摘要，包含每条记忆的标题、标签和一句话摘要，体积远小于全文加载三个目录。详细内容需要时再通过 `/dm:recall` 检索。

`index.md` 由 `rebuild-index.sh` 自动生成，不手动编辑。

### rebuild-index.sh

Shell 脚本内嵌 Python3，遍历三个记忆目录，从每个 `.md` 文件提取：
- 标题（`## 决策：` / `## 规律：` / `## 放弃方案：` 字段）
- 标签（`- 标签：` 字段）
- 摘要（`**摘要**：` 字段）
- 关键词（Graveyard 的 `- 关键词：` 字段）

生成格式化的 `index.md`，同时向 stderr 输出计数摘要。

使用 Python3（而非纯 bash）处理文件内容，原因是中文字符在 bash 的 `grep`/`sed` 处理中容易出现编码问题。

### check-graveyard.py

接受提议描述字符串，加载所有 Graveyard 文件的关键词，检测词语重叠：

1. 将提议按空格/逗号/标点分词
2. 对每个 Graveyard 条目，计算词语集合交集
3. 同时检查关键词是否是提议文本的子串（处理中文连续词）
4. 发现匹配时打印警告（含匹配关键词和否决原因），以非零退出码退出

供 `/dm:plan` 的 Slash Command 在制定方案前调用。

### Slash Commands

- **`/dm:remember`**：从当前会话提炼值得记录的决策或规律，AI 根据对话内容生成结构化文件，写入对应目录，然后调用 `rebuild-index.sh` 重建索引
- **`/dm:recall <keyword>`**：关键词搜索三类记忆目录，输出标题/摘要/标签和匹配上下文行；Graveyard 命中时额外警告
- **`/dm:bury`**：将被否决的方案写入 `graveyard/`，记录否决原因和关键词
- **`/dm:sync-memory`**：`git pull` + 检测 `memory/` 合并冲突 + 重建索引，用于多人共享记忆场景

## 功能范围

**本次实现：**
- 三层记忆目录结构（decisions / patterns / graveyard）
- `rebuild-index.sh`：自动生成轻量 `index.md`
- `check-graveyard.py`：关键词匹配检测，Plan 模式强制调用
- 4 条记忆相关 Slash Commands（remember/recall/bury/sync-memory）
- `CLAUDE.md` 中的会话启动检查（自动加载 index.md）

**明确排除：**
- 语义相似度搜索（当前为关键词字符串匹配）
- 记忆条目的自动老化/归档（config.yaml 中有配置字段，但未实现执行逻辑）
- Web UI 或可视化界面

## 关键决策

**1. 记忆文件格式为 Markdown，而非数据库或 JSON**

Markdown 文件可以直接被 AI 读取（无需解析器），也可以被人类浏览和编辑，还能通过 git 版本控制和多人共享。代价是检索需要全文扫描，v0.1 规模下（数十条记忆）性能完全可接受。

**2. index.md 只含摘要，不含全文**

会话启动时加载完整三个目录会消耗大量 token 上下文。`index.md` 作为"目录页"，让 AI 能在不超载上下文的情况下感知记忆全貌，需要详细内容时再按需检索。

**3. Graveyard 永不过期**

`config.yaml` 中 `graveyard.never_expire: true`。被否决的方案之所以值得记录，正是因为"错误容易重复"——随时间推移风险不降反升（新团队成员不了解历史）。

**4. /dm:remember 去掉草稿中间层**

原设计要求 AI 先写入 `memory/drafts/`，人工审核后再移入正式目录。实践发现摩擦过高，草稿会堆积成垃圾桶。改为直接写入正式目录，以"删除文件"作为撤销路径，降低日常使用摩擦。

## 已知限制 / 后续计划

- `rebuild-index.sh` 使用 python3 调用，需要系统安装 Python3（macOS/Linux 默认有，Windows 需额外配置）
- `check-graveyard.py` 的分词为简单按标点分割，中文长词（如"状态管理"）若不在关键词列表中会漏检
- Phase 3 计划引入本地 embedding 方案（embed-local / embed-ollama），支持语义相似度搜索
- `devmind recall` CLI 命令已在 Phase 2 实现，与 `/dm:recall` Slash Command 功能对等
