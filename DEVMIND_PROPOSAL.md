# DevMind 产品方案

> 让 AI 编程协作真正"记得住、分得清、停得下"——与 Claude  Code 深度整合的开发者工作流框架

**DevMind** = **Dev**eloper + **Mind**（工作记忆）

开发者在工作时有一套"工作记忆"：知道当前在做什么任务、之前做过哪些决定、哪些方向踩过坑。这种工作记忆让人类开发者能在任意时间点切换上下文、恢复任务、不重蹈覆辙。

当前的 AI 编程工具没有这种能力——每次对话都是一张白纸。DevMind 的目标是给 AI 补上这块"工作记忆"，让 AI 协作从"聪明的一次性助手"变成"有记忆的长期搭档"。

## 一、问题背景

### 1.1 现状观察

当前主流 AI 编程工具（Claude  Code、Cursor、GitHub Copilot、Cline 等）在单次对话中表现出色，但在**持续性协作**上存在结构性缺陷。开发者普遍反映以下痛点：

| # | 痛点 | 典型场景 |
|---|------|---------|
| 1 | **无模式感知** | AI 不知道当前是在探索代码还是已经开始修改，随手就改了不该改的文件 |
| 2 | **跨会话失忆** | 上次说好"不用 class 组件"，新对话又写出来了；决策理由消失，只剩结果 |
| 3 | **审批粒度错误** | 要么全部放行（完全自主），要么每步都问（极度打断），没有中间档 |
| 4 | **规格漂移** | 三轮对话之后，AI 的实现和最初的设计已经悄悄偏离 |
| 5 | **置信度不透明** | AI 给出方案时不说"我不确定"，开发者无法判断该深挖还是直接采纳 |
| 6 | **方向坟场** | 尝试过但放弃的技术路线没有记录，下次会话可能重蹈覆辙 |

### 1.2 根本原因

这些缺陷指向同一个根源：**AI 工具被设计为无状态的问答机器，而开发者需要的是有状态的协作伙伴。**

```
当前模型：
  开发者 ──→ 指令 ──→ AI ──→ 输出
                              ↑
                        每次从零开始

理想模型：
  开发者 ──→ 指令 ──→ AI ──→ 输出
                  ↑              ↓
              [项目记忆]  ←── [决策沉淀]
```

### 1.3 现有工具的局限与 DevMind 的定位

**OpenSpec** 是目前最接近"AI 协作流程管理"的工具，解决了"大功能如何规范推进"的问题。但它存在结构性限制：

| 维度 | OpenSpec 的问题 |
|------|----------------|
| 流程结构 | 线性推进（new → ff → apply → verify → archive），不支持探索、调试等非线性任务 |
| 跨会话记忆 | 无。每次会话从零开始，上次决定的事项无法自动带入 |
| 放弃方向记录 | 无。尝试过的方案被否决后消失，下次可能重蹈覆辙 |
| 不确定性表达 | 无。AI 无法说明"这里我不确定"，开发者无法据此判断风险 |
| 小任务支持 | 弱。日常 bug 修复、探索性调试不值得走完整 OpenSpec 流程 |
| 断点恢复 | 无。任务中断后无法从检查点继续，只能重新开始 |

**DevMind 的定位**：填补 AI 协作工具链中"状态管理"的空白——覆盖 OpenSpec 的使用场景，并额外支持跨会话记忆、非线性模式切换、放弃方向记录等关键能力。对于已在使用 OpenSpec 的团队，DevMind 提供完整的迁移路径（见附录）。

## 二、解决方案总览

### 2.1 设计原则

1. **渐进增强**：保持零安装成本（纯文件），新增功能可选启用
2. **系统保证优先**：能用 Hook 机制的不用 prompt 约束
3. **上下文经济**：记忆加载从"全量注入"改为"索引 + 按需"
4. **透明不确定性**：用结构化清单替代伪精确数字
5. **Spec 驱动执行**：计划不只是自然语言描述，而是可验证的规格约束

### 2.2 五层架构

```
┌─────────────────────────────────────────────────────────────┐
│              Mode Layer（模式层）                             │
│   prompt + hook 双重保障，系统级拦截写操作                    │
├─────────────────────────────────────────────────────────────┤
│             Memory Layer（记忆层）                            │
│   索引 + 按需检索，Decisions · Patterns · Graveyard          │
│   每条记忆含摘要字段，兼顾关键词检索与未来语义检索             │
├─────────────────────────────────────────────────────────────┤
│              Flow Layer（流程层）                             │
│   Hook 自动捕获，可配置 Checkpoint + 结构化暂停选项            │
├─────────────────────────────────────────────────────────────┤
│             Session Layer（会话层）                           │
│   跨会话状态恢复，检查点链，智能模式推荐                       │
├─────────────────────────────────────────────────────────────┤
│           Collaboration Layer（协作层）                       │
│   Ownership + 冲突解决策略                                    │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 Spec Coding vs Vibe Coding

DevMind 的模式层直接对应两种 AI 编码风格：

| DevMind 模式 | 对应风格 | 特征 |
|---|---|---|
| Explore | Vibe Coding | 自由探索，无约束，快速理解 |
| Plan | Spec 生成 | 输出可验证的 Spec（current-plan.md）|
| Build | Spec 执行 | 严格按 Spec，不允许即兴发挥 |
| Debug | 混合 | 局部 Spec（隔离范围）+ 局部 Vibe（诊断过程）|

Plan 模式的产出不只是自然语言描述，而是包含**可验证约束**的正式 Spec，Build 模式以此为唯一执行依据。

### 2.4 与现有工具的关系

```
工具            定位                        角色
───────────────────────────────────────────────────────────────
CLAUDE.md       全局规范注入                静态约束层（语言规范、代码风格）
DevMind         AI 协作状态管理             动态执行层（模式、记忆、流程、会话）
OpenSpec        大功能规格驱动开发          DevMind 可完整覆盖其场景，并提供迁移路径
```

DevMind 与 OpenSpec 的能力对比：

| 维度 | OpenSpec | DevMind |
|------|----|-----|
| **Spec 驱动执行** | 是 | 是（Plan → current-plan.md Spec 区块） |
| **流程结构** | 线性（只能前进） | 非线性（随时切换模式） |
| **适用场景** | 大功能开发 | 全场景：探索、调试、规划、实现 |
| **跨会话记忆** | 无 | 三层记忆（Decisions / Patterns / Graveyard） |
| **放弃方向记录** | 无 | Graveyard 机制 |
| **不确定性表达** | 无 | 结构化清单（确定 / 不确定 / 需验证 / 风险） |
| **断点恢复** | 无 | session.yaml 检查点链 |
| **误操作防护** | 无 | Hook 系统级拦截 |
| **从 OpenSpec 迁移** | — | 命令一一对应，见附录 |

**一句话**：DevMind 是"有状态的、支持所有任务粒度的 AI 协作框架"——覆盖了 OpenSpec 的场景，同时补全了 OpenSpec 未涉及的能力。

## 三、解决方案详细设计

### 3.1 模式约束的系统级保障

#### 背景

四种工作模式（Explore / Debug / Plan / Build）若仅靠 prompt 约束，AI 仍可调用 Write/Edit 工具。Explore 模式声明"只读"只是提示，不是系统保证。

#### 四种模式定义

| 模式 | 触发命令 | 权限约束 | 适用场景 |
|------|---------|---------|---------|
| **Explore** | `/explore` | 只读，禁止修改任何文件 | 看懂代码、定位问题、理解架构 |
| **Debug** | `/debug` | 分析 + 小范围隔离修改，跨文件改动需确认 | 定位 bug、验证假设 |
| **Plan** | `/plan` | 只输出方案对比，不执行，等待开发者选择 | 功能设计、架构决策 |
| **Build** | `/build` | 按计划执行，遇到计划外分叉自动暂停 | 实现已确认的功能 |

#### 解决方案：Hook 机制

利用 Claude  Code 的 **PreToolUse Hook** 在工具调用前拦截：

```bash
# .claude/hooks/pre-tool-use.sh
#!/bin/bash
CURRENT_MODE=$(cat .devmind/current-mode.txt 2>/dev/null || echo "explore")

if echo "$TOOL_NAME" | grep -qE '^(Write|Edit|NotebookEdit)$'; then
    if [ "$CURRENT_MODE" = "explore" ]; then
        echo "BLOCKED: Explore 模式禁止修改文件"
        echo "提示：使用 /debug 或 /build 进入可写模式"
        exit 1
    fi
    if [ "$CURRENT_MODE" = "plan" ]; then
        echo "BLOCKED: Plan 模式仅输出方案，不执行修改"
        exit 1
    fi
fi

exit 0
```

每个模式命令在进入时写入状态文件，以 explore 为例：

```markdown
<!-- .claude/commands/explore/prompt.md -->

进入 EXPLORE 模式（只读）。加载项目记忆并分析代码，但不修改任何文件。

执行前置操作：
```sh

echo "explore" > .devmind/current-mode.txt
```
```

#### 降级方案

如果运行环境不支持 Hooks，回退到 prompt 约束：

```yaml
enforcement_level: prompt_only  # 可选值：hook（推荐）| prompt_only
```

### 3.2 记忆的分级加载策略

#### 背景

`load_on_session_start: [decisions, patterns]` 会将所有记忆文件全文注入上下文。随着项目成熟（50+ 决策文件），上下文快速膨胀，相关性低的记忆稀释有用内容。

#### 解决方案：索引 + 按需检索

每次会话只注入轻量级索引，AI 需要时再检索全文。

**索引文件结构**：

```markdown
<!-- .devmind/memory/index.md（自动生成，勿手动编辑） -->

## Decisions 索引（共 23 条）

- `2026-02-10_no-class-components` - 不使用 Class 组件（React）
- `2026-01-28_kv-to-d1-migration` - KV 迁移到 D1 数据库（存储）
- `2026-01-15_api-rate-limiting` - API 限流策略（安全）

## Patterns 索引（共 8 条）

- `kv-naming-convention` - KV 键名约定（存储）
- `error-handling-standard` - 统一错误处理模式（架构）

## Graveyard 索引（共 5 条）

- `redis-cache-layer` - 放弃 Redis 缓存层（存储）
- `graphql-api` - 放弃 GraphQL API（架构）

---

使用提示：需要详细内容时，使用 `/recall <关键词>` 检索
```

**索引生成脚本**：

```bash
# .devmind/scripts/rebuild-index.sh
#!/bin/bash
set -e
DEVMIND_DIR="$(cd "$(dirname "$0")/.." && pwd)"

{
    echo "## Decisions 索引（共 $(ls "$DEVMIND_DIR/memory/decisions/"*.md 2>/dev/null | wc -l | tr -d ' ') 条）"
    echo ""
    for file in "$DEVMIND_DIR/memory/decisions/"*.md; do
        [ -f "$file" ] || continue
        title=$(grep -m1 "^## 决策：" "$file" | sed 's/## 决策：//')
        tags=$(grep "标签：" "$file" | sed 's/.*标签：//' | head -1)
        basename=$(basename "$file" .md)
        echo "- \`$basename\` - $title（$tags）"
    done
    echo ""
    echo "## Patterns 索引（共 $(ls "$DEVMIND_DIR/memory/patterns/"*.md 2>/dev/null | wc -l | tr -d ' ') 条）"
    echo ""
    for file in "$DEVMIND_DIR/memory/patterns/"*.md; do
        [ -f "$file" ] || continue
        title=$(grep -m1 "^## 规律：" "$file" | sed 's/## 规律：//')
        tags=$(grep "标签：" "$file" | sed 's/.*标签：//' | head -1)
        basename=$(basename "$file" .md)
        echo "- \`$basename\` - $title（$tags）"
    done
    echo ""
    echo "## Graveyard 索引（共 $(ls "$DEVMIND_DIR/memory/graveyard/"*.md 2>/dev/null | wc -l | tr -d ' ') 条）"
    echo ""
    for file in "$DEVMIND_DIR/memory/graveyard/"*.md; do
        [ -f "$file" ] || continue
        title=$(grep -m1 "^## 放弃方案：" "$file" | sed 's/## 放弃方案：//')
        tags=$(grep "关键词：" "$file" | sed 's/.*关键词：//' | head -1)
        basename=$(basename "$file" .md)
        echo "- \`$basename\` - $title（$tags）"
    done
    echo ""
    echo "---"
    echo ""
    echo "使用提示：需要详细内容时，使用\`/recall <关键词>\`检索"
} > "$DEVMIND_DIR/memory/index.md"

echo "索引已重建：$DEVMIND_DIR/memory/index.md"
```

**配置更新**：

```yaml
# .devmind/config.yaml
memory:
  load_on_session_start:
    - index_only              # 只加载索引，不加载全文
  auto_retrieve_on:
    - plan_mode               # Plan 模式自动检索相关 Graveyard
    - decision_conflict       # 检测到决策冲突时检索相关 Decision

  # 检索后端（retrieval_backend）是渐进式配置项，按需升级
  # 见 5.技术路线图 各阶段说明
  retrieval_backend: keyword  # keyword | embed-local | embed-ollama | embed-api
```

### 3.3 方案不确定性的结构化表达

#### 背景

"置信度 85%"这样的数字没有依据，LLM 无法输出校准的概率，反而给开发者错误的安全感。

#### 解决方案：不确定点清单 + 维度评分

不再使用单一百分比，改为结构化的不确定点清单：

```markdown
## 方案 A：使用 FTS5 全文检索

### 确定的部分
- D1 原生支持 FTS5 扩展
- 数据量级（< 10 万条）在 FTS5 适用范围内
- 查询语法与现有 SQL 兼容

### 不确定的部分
- ⚠️ 并发写入性能：未在生产环境测试过
- ⚠️ 索引重建时间：数据量增长后可能影响部署
- ⚠️ 边缘节点同步延迟：FTS 索引是否会增加同步时间

### 需要验证的假设
1. 假设：FTS5 索引不会显著增加数据库体积
   验证方式：在测试环境导入 5 万条数据，对比索引前后体积
2. 假设：查询延迟 < 100ms（P95）
   验证方式：压测工具模拟 100 QPS

### 风险评估
- 技术风险：中（有成熟方案但未实测）
- 回滚成本：低（可保留 KV 作为降级方案）
- 学习曲线：低（团队熟悉 SQL）
```

多方案对比时，使用维度评分矩阵替代单一数字：

```markdown
## 方案对比矩阵

| 维度 | 方案 A (FTS5) | 方案 B (KV 优化) | 方案 C (外部搜索) |
|------|-------------|----------------|----------------|
| 实现复杂度 | ★★（简单） | ★★★（中等） | ★★★★★（复杂） |
| 性能预期 | ★★★★（好） | ★★★（中） | ★★★★★（优秀） |
| 运维成本 | ★★（低） | ★（极低） | ★★★★（高） |
| 可验证性 | ★★★（中） | ★★★★★（高） | ★★（低） |

推荐：方案 A（综合平衡最优）
```

Flow Layer 配置新增不确定点触发：

```yaml
# .devmind/flow.yaml
checkpoints:
  - trigger: uncertainty_declared
    action: pause
    message: "方案存在不确定点，请确认是否继续"
    options:
      - label: "已了解风险，继续执行"
        action: proceed
      - label: "先验证假设，暂不执行"
        action: pause_for_validation
      - label: "返回 Plan 模式重新评估"
        action: switch_to_plan
```

### 3.4 跨会话状态恢复与检查点链

#### 背景

如果开发者直接提问而不触发模式命令，AI 不会主动提醒当前模式约束，跨会话的任务上下文也会丢失。此外，Build 任务中途暂停后，下次会话无法从断点恢复。

#### 解决方案：Session Layer + Checkpoint 链

**CLAUDE.md 状态感知段落**（静态追加，无需动态注入）：

```markdown
<!-- .claude/CLAUDE.md 末尾 -->

---

## DevMind 状态感知

开始任何任务前，先读取 `.devmind/current-mode.txt` 确认当前模式：
- **explore**：只读，禁止修改文件
- **debug**：可小范围修改，跨文件改动需确认
- **plan**：仅输出方案，不执行
- **build**：按计划执行

如果文件不存在，默认进入 explore 模式。
执行任何写操作前，确认当前模式允许该操作。
如果 `.devmind/session.yaml` 存在，读取并告知开发者上次的任务状态。
```

**智能模式推荐**：

```
用户："帮我改这个 bug"
AI：检测到修改意图，当前处于 explore 模式（只读）。
    建议：
    - 如果需要先定位问题，继续使用 explore
    - 如果已知问题位置，使用 /debug 进入调试模式
    - 如果需要大范围重构，使用 /plan 制定方案
    请选择或直接说明需求。
```

**session.yaml：检查点链**

`checkpoints` 列表记录 Build 模式的执行进度，支持断点恢复：

```yaml
# .devmind/session.yaml（自动维护）

last_mode: build
last_plan: migrate-to-d1
last_active: 2026-02-23T14:35:00Z
context:
  - 正在执行 D1 迁移
  - 已完成 resourceService.ts 修改
  - 下一步：更新 index.ts 路由

# 检查点链（Build 模式执行进度）
checkpoints:
  - id: cp-001
    timestamp: "2026-02-23T10:15:00"
    description: "完成 resourceService.ts KV → D1 替换"
    files_modified:
      - src/services/resourceService.ts
    status: done

  - id: cp-002
    timestamp: "2026-02-23T14:33:00"
    description: "迁移脚本 migrations/002_add_index.sql"
    files_modified:
      - migrations/002_add_index.sql
    status: done

  - id: cp-003
    description: "更新 index.ts 路由"
    status: paused
    pause_reason: "需要修改计划外文件 src/index.ts"
    resume_options:
      - "确认此修改必要，扩展计划范围后继续"
      - "跳过此步，保持 index.ts 不变"

next_checkpoint: cp-003
```

下次会话进入 `/build` 时，AI 读取 session.yaml，直接告知：
> "上次在 cp-003 暂停，原因：src/index.ts 超出计划范围。请选择：(1) 扩展范围继续 (2) 跳过"

### 3.5 审计日志的自动捕获

#### 背景

audit.log 若由 AI 手动写入，可能遗漏操作或写错文件名，没有可靠性保证。

#### 解决方案：PostToolUse Hook 自动捕获

```bash
# .claude/hooks/post-tool-use.sh
#!/bin/bash
TOOL_NAME="$1"

if [[ "$TOOL_NAME" =~ ^(Write|Edit|NotebookEdit)$ ]]; then
    CURRENT_MODE=$(cat .devmind/current-mode.txt 2>/dev/null || echo "unknown")
    CURRENT_PLAN=$(head -1 .devmind/current-plan.md 2>/dev/null | sed 's/# //')
    FILE_PATH=$(echo "$TOOL_ARGS" | jq -r '.file_path // empty')

    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $CURRENT_MODE  ${FILE_PATH:-unknown}  plan:${CURRENT_PLAN:-none}" \
        >> .devmind/audit.log
fi
```

日志格式示例：

```
[2026-02-23 14:32:12] build  src/services/resourceService.ts  plan:migrate-to-d1
[2026-02-23 14:33:45] build  migrations/002_add_index.sql     plan:migrate-to-d1
[2026-02-23 14:35:20] build  src/index.ts                     plan:migrate-to-d1  [paused:scope_exceeded]
```

查询审计记录的 Slash Command：

```markdown
<!-- .claude/commands/audit/prompt.md -->

查看最近的文件修改记录。

用法：
- /audit — 显示最近 20 条记录
- /audit 50 — 显示最近 50 条记录
- /audit plan:migrate-to-d1 — 显示特定计划的所有记录
```

### 3.6 Graveyard 的主动检索

#### 背景

Graveyard"按需加载"意味着 AI 提议已否决方案时不会主动查询，防止重蹈覆辙的效果存疑。

#### 解决方案：Plan 模式强制检索 + 结构化选项

**Plan 命令强制检索 Graveyard**，并在发现匹配时提供结构化处置选项：

```markdown
<!-- .claude/commands/plan/prompt.md -->

进入 PLAN 模式，输出结构化方案对比。

执行步骤：
1. 写入模式状态：`echo "plan" > .devmind/current-mode.txt`
2. **强制检索 Graveyard**：
   - 读取 `.devmind/memory/graveyard/` 下所有文件
   - 检查是否有与当前提议相似的已否决方案
   - 如发现匹配，输出警告并提供选项：
     (1) 查看原因后决定是否继续  (2) 直接跳过此方向
3. 输出方案对比（使用结构化不确定点格式）
4. 等待开发者选择方案后，写入 current-plan.md
```

**MVP：关键词匹配（零依赖）**

```python
# .devmind/scripts/check-graveyard.py
import sys
from pathlib import Path

def check_graveyard(proposal: str, graveyard_dir=".devmind/memory/graveyard") -> list[dict]:
    proposal_terms = set(proposal.lower().split())
    matches = []
    for fpath in Path(graveyard_dir).glob("*.md"):
        content = fpath.read_text()
        keywords_line = next(
            (l for l in content.splitlines() if l.startswith("- 关键词：")), ""
        )
        keywords = set(keywords_line.replace("- 关键词：", "").replace(",", " ").lower().split())
        overlap = proposal_terms & keywords
        if overlap:
            title = next((l for l in content.splitlines() if l.startswith("## 放弃")), fpath.stem)
            matches.append({"file": str(fpath), "title": title, "overlap": overlap})
    return sorted(matches, key=lambda x: len(x["overlap"]), reverse=True)

if __name__ == "__main__":
    proposal = " ".join(sys.argv[1:])
    for m in check_graveyard(proposal):
        print(f"与已否决方案相似：{m['title']}")
        print(f"   匹配关键词：{', '.join(m['overlap'])}")
        print(f"   文件：{m['file']}")
```

**语义检索升级（`embed-ollama` / `embed-api` 后端）**

```python
# .devmind/scripts/check-graveyard-vec.py
# 依赖：pip install sqlite-vec requests
# 前置：ollama pull nomic-embed-text
import sqlite3, sqlite_vec, json, requests

OLLAMA_URL = "http://localhost:11434/api/embeddings"
MODEL = "nomic-embed-text"  # 274MB，离线可用

def get_embedding(text: str) -> list[float]:
    resp = requests.post(OLLAMA_URL, json={"model": MODEL, "prompt": text})
    return resp.json()["embedding"]

def cosine_similarity(a, b) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = sum(x ** 2 for x in a) ** 0.5
    nb = sum(x ** 2 for x in b) ** 0.5
    return dot / (na * nb) if na and nb else 0.0

def check_graveyard_semantic(proposal: str, db_path=".devmind/memory/vectors.db") -> list[dict]:
    db = sqlite3.connect(db_path)
    db.enable_load_extension(True)
    sqlite_vec.load(db)
    proposal_vec = get_embedding(proposal)
    rows = db.execute(
        "SELECT m.file, m.title, v.embedding FROM memory_vec v "
        "JOIN memory_meta m ON v.rowid = m.rowid WHERE m.category = 'graveyard'"
    ).fetchall()
    results = []
    for file, title, emb_json in rows:
        sim = cosine_similarity(proposal_vec, json.loads(emb_json))
        if sim > 0.82:
            results.append({"file": file, "title": title, "similarity": round(sim, 3)})
    return sorted(results, key=lambda x: x["similarity"], reverse=True)
```

### 3.7 current-plan.md 的 Spec 化

#### 背景

当 Build 模式遇到边界情况时，AI 需要主观判断"这是否超出计划范围"，容易产生歧义。

#### 解决方案：在计划中增加正式 Spec 区块

Plan 模式输出方案选择后，自动生成包含**可验证约束**的 Spec 区块：

```markdown
<!-- .devmind/current-plan.md -->

# 计划：D1 迁移（灰度切换方案）

> 选定日期：2026-02-23  方案：B（灰度切换）

## Spec

### 约束（不可违反，违反时自动暂停）
- 不新增 npm 依赖
- 不修改 API 合约（`src/routes/` 下所有 handler 的输入/输出格式保持不变）
- 不删除现有 KV 调用（保留作为降级路径）

### 预期产出（可验证）
- [ ] `src/services/resourceService.ts` 中所有读操作优先走 D1，KV 作为降级
- [ ] `migrations/002_add_index.sql` 包含 D1 索引定义
- [ ] 所有现有单元测试通过（`npm test` 零失败）
- [ ] 新增集成测试覆盖 D1 路径（至少 3 个用例）

### 允许修改的文件范围
- `src/services/resourceService.ts`
- `migrations/*.sql`
- `tests/integration/`

### 明确排除（修改这些文件时必须暂停确认）
- `src/index.ts`
- `src/routes/`
- `src/middleware/`

## 执行步骤

1. 修改 resourceService.ts，实现灰度读取逻辑
2. 编写迁移脚本 migrations/002_add_index.sql
3. 新增集成测试
4. 验证所有测试通过
```

Build 模式的 pre-tool-use hook 可对照 `允许修改的文件范围` 自动判断是否需要暂停，无需 AI 主观判断。

### 3.8 团队协作的最小约定

#### 背景

memory/ 目录提交到 Git 后，多人协作维护 decisions/ 会产生冲突，但默认设计未考虑团队场景。

#### 解决方案：Ownership + 冲突解决策略

**Decision 文件增加 Ownership 字段**：

```markdown
<!-- .devmind/memory/decisions/2026-02-10_no-class-components.md -->

## 决策：不使用 Class 组件

**摘要**：所有 React 组件使用函数式 + Hooks，禁止 Class 组件，以保持与 Server Components 的未来兼容性。

- 日期：2026-02-10
- 提议者：@alice
- 参与讨论：@bob, @charlie
- 标签：React, 组件, 架构
- 状态：active
- 影响范围：所有新写 React 组件
- 背景：重构 ResourceList 时讨论过两种写法
- 结论：全部使用函数式组件 + Hooks
- 原因：
  1. 团队熟悉度更高
  2. 未来可能引入 Server Components，函数式更兼容
  3. 代码体积更小

---

修改历史：
- 2026-02-10 @alice 创建
- 2026-02-15 @bob 补充"影响范围"字段

---

AI 使用提示：当你准备写 React 组件时，务必检查此决策。
```

> **注意**：`摘要` 字段用于索引快速预览和未来语义检索的嵌入向量。

**冲突解决策略配置**：

```yaml
# .devmind/config.yaml
collaboration:
  mode: solo  # solo（个人）| team（团队）
  conflict_resolution:
    strategy: last_write_wins   # last_write_wins | require_review
  ownership:
    require_author: true
    notify_on_change: false
```

**团队同步命令**：

```markdown
<!-- .claude/commands/sync-memory/prompt.md -->

同步团队记忆（从 Git 拉取最新变更并重建索引）。

执行步骤：
1. `git pull origin main`
2. `.devmind/scripts/rebuild-index.sh`
3. `git status | grep "memory/"` — 检查是否有冲突
4. 如果有冲突，提示开发者手动解决后重新运行步骤 2
```

## 四、架构与文件结构

### 4.1 文件结构

```
.devmind/
├── config.yaml                 # 全局配置（enforcement_level, collaboration）
├── flow.yaml                   # Flow Layer 配置（checkpoints + options）
├── current-mode.txt            # 当前模式状态（hook 读取）
├── session.yaml                # 会话状态持久化（含检查点链）
├── modes/                      # 各模式的系统提示词
│   ├── explore.md
│   ├── debug.md
│   ├── plan.md
│   └── build.md
├── memory/
│   ├── index.md                # 轻量级索引（rebuild-index.sh 自动生成）
│   ├── decisions/              # 决策档案（命名：YYYY-MM-DD_slug.md，含摘要字段）
│   ├── patterns/               # 经验规律（含摘要字段）
│   ├── graveyard/              # 放弃方向（含关键词字段）
│   └── drafts/                 # AI 生成的草稿，待人工审核后移入正式目录
├── scripts/
│   ├── rebuild-index.sh        # 重建索引（使用绝对路径）
│   └── check-graveyard.py      # Graveyard 关键词检测（MVP）
├── current-plan.md             # 当前激活的计划（含 Spec 区块）
├── progress.md                 # 当前任务进度
└── audit.log                   # 变更审计日志（hook 自动写入）

.claude/
├── CLAUDE.md                   # 项目级配置（追加 DevMind 状态感知）
├── commands/                   # Slash Commands（目录结构，含 COMMAND.md 元数据）
│   ├── explore/
│   │   ├── COMMAND.md          # 元数据：name, description, triggers, loads
│   │   └── prompt.md           # 完整提示词
│   ├── debug/
│   │   ├── COMMAND.md
│   │   └── prompt.md
│   ├── plan/
│   │   ├── COMMAND.md
│   │   └── prompt.md
│   ├── build/
│   │   ├── COMMAND.md
│   │   └── prompt.md
│   ├── remember/
│   │   ├── COMMAND.md
│   │   └── prompt.md
│   ├── recall/
│   │   ├── COMMAND.md
│   │   └── prompt.md
│   ├── bury/
│   │   ├── COMMAND.md
│   │   └── prompt.md
│   ├── audit/
│   │   ├── COMMAND.md
│   │   └── prompt.md
│   └── sync-memory/
│       ├── COMMAND.md
│       └── prompt.md
└── hooks/
    ├── pre-tool-use.sh         # PreToolUse：模式约束拦截
    └── post-tool-use.sh        # PostToolUse：审计日志自动捕获
```

### 4.2 COMMAND.md 元数据格式

每个命令目录下的 `COMMAND.md` 描述该命令的元数据，CLAUDE.md 只需加载这些轻量文件，完整 prompt 按需注入：

```yaml
# .claude/commands/build/COMMAND.md

name: build
description: 按确认计划严格执行，遇计划外分叉自动暂停
triggers:
  - explicit: /build
  - condition: "current-plan.md 存在且已选定方案"
loads:
  - .devmind/current-plan.md     # 必须加载（Spec 约束）
  - .devmind/session.yaml        # 恢复上次检查点
  - .devmind/memory/index.md     # 记忆索引
enforcement: hook                # hook | prompt_only
```

```yaml
# .claude/commands/plan/COMMAND.md

name: plan
description: 输出结构化方案对比，强制检索 Graveyard，等待开发者选择
triggers:
  - explicit: /plan
loads:
  - .devmind/memory/index.md
  - .devmind/memory/graveyard/   # 强制全量加载（防止重蹈覆辙）
enforcement: hook
```

### 4.3 配置文件完整示例

#### config.yaml

```yaml
# .devmind/config.yaml

project: MyProject
default_mode: explore
enforcement_level: hook  # hook（推荐）| prompt_only

memory:
  load_on_session_start:
    - index_only
  auto_draft_on_plan: true
  pattern_threshold: 3
  auto_retrieve_on:
    - plan_mode
    - decision_conflict

  # 检索后端：按需升级，不同阶段对应不同能力
  # keyword      → 零依赖，关键词匹配，Phase 1 默认值
  # embed-local  → sqlite-vec + 轻量本地模型，需 pip install sqlite-vec
  # embed-ollama → sqlite-vec + Ollama 本地模型（nomic-embed-text），需安装 Ollama
  # embed-api    → sqlite-vec + 云端 API（OpenAI/Anthropic），需 API Key
  retrieval_backend: keyword

  aging:
    decisions:
      review_after_days: 90
      auto_archive_after_days: 365
    patterns:
      review_after_days: 180
    graveyard:
      never_expire: true

flow:
  pause_on_scope_exceeded: true

collaboration:
  mode: solo                  # solo | team
  conflict_resolution:
    strategy: last_write_wins # last_write_wins | require_review
  ownership:
    require_author: true
    notify_on_change: false
```

#### flow.yaml

```yaml
# .devmind/flow.yaml

checkpoints:
  - trigger: file_scope_exceeded
    action: pause
    message: "即将修改计划外的文件 {file_path}"
    options:
      - label: "允许此次修改，并更新计划范围"
        action: expand_plan_scope
      - label: "允许此次修改（一次性例外，不更新计划）"
        action: allow_once
      - label: "跳过此修改，继续其他步骤"
        action: skip
      - label: "暂停整个 Build，重新进入 Plan 模式"
        action: switch_to_plan

  - trigger: uncertainty_declared
    action: pause
    message: "方案存在不确定点，请确认是否继续"
    options:
      - label: "已了解风险，继续执行"
        action: proceed
      - label: "先验证假设，暂不执行"
        action: pause_for_validation
      - label: "返回 Plan 模式重新评估"
        action: switch_to_plan

  - trigger: decision_conflict
    action: pause
    message: "发现与已记录决策冲突，请裁决"
    options:
      - label: "遵守已有决策，调整当前方案"
        action: follow_existing
      - label: "覆盖已有决策（需更新 decisions/）"
        action: override_decision
      - label: "暂停，人工评估后决定"
        action: manual_review

  - trigger: milestone_reached
    action: pause
    message: "已完成阶段目标，继续？"

  - on: ["DROP TABLE", "rm -rf", "DELETE FROM"]
    action: require_explicit_confirm
```

### 4.4 三类记忆文件模板

**Decisions（决策档案）**

```markdown
<!-- .devmind/memory/decisions/YYYY-MM-DD_slug.md -->

## 决策：<标题>

**摘要**：<1-2句话概括决策内容，用于索引预览和语义检索>

- 日期：YYYY-MM-DD
- 提议者：@username
- 参与讨论：@username1, @username2
- 标签：<分类标签，如：React, 存储, 架构>
- 状态：active  # active | deprecated | superseded
- 影响范围：<哪些代码/场景受影响>
- 背景：<为什么要做这个决策>
- 结论：<具体的决策内容>
- 原因：
  1. <原因1>
  2. <原因2>

---

修改历史：
- YYYY-MM-DD @username 创建

---

AI 使用提示：<何时读取此决策>
```

**Patterns（经验规律）**

```markdown
<!-- .devmind/memory/patterns/slug.md -->

## 规律：<标题>

**摘要**：<1-2句话概括规律内容>

- 来源：<N> 次相似讨论（YYYY-MM-DD, ...）
- 标签：<分类标签>
- 规律：
  - <规律条目1>
  - <规律条目2>
- 已验证：是/否
- 适用范围：<项目/技术栈>

---

AI 使用提示：<凡涉及 XX 操作，先查此规律>
```

**Graveyard（放弃方向）**

```markdown
<!-- .devmind/memory/graveyard/slug.md -->

## 放弃方案：<标题>

- 日期：YYYY-MM-DD
- 提议者：@username
- 关键词：<关键词1>, <关键词2>, <关键词3>
- 原始想法：<当时的提议>
- 放弃原因：
  1. <原因1>
  2. <原因2>
- 替代方案：<最终采用的方案>
- 相似方案特征：<如何识别"重蹈覆辙"的提议>

---

AI 使用提示：如果再提议类似方案，先读此文件。
```

## 五、技术路线图

### Phase 1（MVP）：纯文件 + Slash Commands + Hook

**目标**：验证核心假设，零安装成本落地

**产出**：
- Hook 脚本（模式拦截 + 审计捕获）
- 索引生成脚本（`rebuild-index.sh`）
- 9 个 Slash Commands（explore / debug / plan / build / remember / recall / bury / audit / sync-memory），采用目录结构 + `COMMAND.md` 元数据
- 配置文件模板（`config.yaml`、`flow.yaml`）
- `current-plan.md` 模板（含 Spec 区块）
- `.claude/CLAUDE.md` 状态感知段落

**验证标准**：
- Hook 拦截成功率 > 95%（Explore 模式下的误写操作被拦截）
- 索引加载后上下文占用 < 全量加载的 20%
- 每 10 次 Build 有 1-3 次有意义的 PAUSE
- 每周自然产生 2+ 条 Decision/Pattern

**时间**：2-3 周

### Phase 2（工具化）：npm package `create-devmind`

**目标**：一键初始化，降低接入成本

**产出**：
- CLI 工具：`npx create-devmind init`
- 交互式配置向导（solo/team, enforcement_level）
- 自动生成标准目录结构 + Hook 脚本 + COMMAND.md 元数据
- 从 OpenSpec / `.dev.md` 迁移工具

**新增命令行工具**：
- `devmind status` — 查看当前模式和会话状态（含检查点链摘要）
- `devmind recall <keyword>` — 命令行记忆检索
- `devmind audit [filter]` — 命令行审计日志查询

**时间**：1-2 周开发 + 社区测试

### Phase 3（智能化）：语义检索 + 自动提炼

**目标**：记忆自动提炼质量提升，减少手动维护

**产出**：
- Graveyard 语义相似度检测（防止重蹈覆辙）
- Pattern 自动识别（跨会话分析相似决策）
- 记忆老化自动检测（90 天未引用则标记）
- 摘要字段自动生成（写入新 Decision/Pattern 时 AI 自动填充）

**技术栈选型**：

DevMind 的记忆文件规模上限约 300 个文档、< 500KB 文本，**无需引入向量数据库**。`retrieval_backend` 是 `config.yaml` 中的渐进式配置项，用户可按需逐步升级：

| 阶段 | `retrieval_backend` 值 | 方案 | 依赖 | 需要网络 | 搜索质量 |
|------|----|------|------|---------|---------|
| Phase 1 | `keyword` | 关键词匹配（纯 Python 标准库） | 无 | 否 | 够用 |
| Phase 3a | `embed-local` | sqlite-vec + 轻量本地模型（如 `all-MiniLM-L6-v2`，23MB） | `pip install sqlite-vec sentence-transformers` | 否 | 较高 |
| Phase 3b | `embed-ollama` | sqlite-vec + Ollama 模型（`nomic-embed-text`，274MB） | Ollama 已安装 | 否 | 高 |
| Phase 3c | `embed-api` | sqlite-vec + 云端 API（OpenAI / Anthropic） | API Key | 是 | 高 |

升级路径只需修改 `config.yaml` 中的一行配置，无需迁移数据——`rebuild-index.sh` 会自动按当前后端重建向量存储。

- **向量存储**：`sqlite-vec`（SQLite 扩展，数据存单个 `.db` 文件，无需启动服务，各阶段共用）
- **不引入** Chroma、Qdrant、Weaviate 等向量数据库（面向百万级文档，对本场景严重过度设计）
- **摘要字段**作为嵌入的代表向量，比嵌入整个文件更精准、成本更低

**时间**：2-3 周开发

### Phase 4（跨项目）：Patterns 社区化

**目标**：从多个项目提炼通用规律，形成社区壁垒

**产出**：
- 按技术栈分类的公共 Pattern 库
  - `devmind-patterns-cloudflare`
  - `devmind-patterns-react`
  - `devmind-patterns-go`
- 个人 Pattern 导出与同步

**商业化路径（可选）**：
- 免费：公共 Pattern 库
- 付费：团队私有 Pattern 云同步 + 高级语义搜索

**时间**：长期迭代

## 六、实施清单（Phase 1）

### 6.1 核心功能

- [ ] 创建 `.devmind/` 目录结构
- [ ] 编写 `pre-tool-use.sh`（模式拦截 Hook，含文件范围检查逻辑）
- [ ] 编写 `post-tool-use.sh`（审计日志 Hook）
- [ ] 编写 `rebuild-index.sh`（索引生成，使用绝对路径）
- [ ] 编写 9 个 Slash Commands（目录结构，含 COMMAND.md + prompt.md）
- [ ] 编写 `config.yaml` 和 `flow.yaml` 模板（含结构化 options）
- [ ] 编写 `current-plan.md` 模板（含 Spec 区块）
- [ ] 在 `.claude/CLAUDE.md` 中追加 DevMind 状态感知段落

### 6.2 体验增强

- [ ] 编写 Decision / Pattern / Graveyard 文件模板（含摘要字段）
- [ ] 编写 `/remember` 命令的自动提炼逻辑（识别新决策、生成 drafts/）
- [ ] 编写 `/bury` 命令的 Graveyard 生成逻辑（含关键词提取）
- [ ] 编写 `check-graveyard.py`（关键词匹配脚本）
- [ ] Plan 模式完成方案选择后自动生成 Spec 化 current-plan.md
- [ ] Build 模式读取 session.yaml 检查点链，支持断点续传提示
- [ ] 测试 Hook 在不同操作系统的兼容性（macOS / Linux / Windows WSL）

### 6.3 Phase 2 功能（可选）

- [ ] CLI 工具 `create-devmind`（`npx create-devmind init`）
- [ ] 从 OpenSpec 迁移脚本
- [ ] 团队协作的 PR 模板
- [ ] `check-graveyard-vec.py`（sqlite-vec + 本地 embedding 语义检索）
- [ ] 摘要字段自动生成（AI 写入新记忆时自动填充摘要）

## 七、典型工作日示例

以 ResourceHub 项目的 D1 迁移任务为例，展示 DevMind 完整协作流程：

```
早上：理解现状
  /explore
  → 自动加载 memory/index.md（轻量级，含摘要预览）
  → Hook 保证：不修改任何文件（pre-tool-use.sh 拦截）
  → 阅读 resourceService.ts 和 resourceService.d1.ts
  → 输出：两个实现的差异分析

上午：制定方案
  /plan 迁移 resourceService 到 D1
  → Plan 命令强制读取 graveyard/（确认无重蹈覆辙风险）
  → 发现 graveyard/redis-cache-layer.md 不匹配，无警告
  → 输出结构化方案对比（含确定/不确定清单）：
      方案 A：直接切换
        确定：改动最小
        不确定：⚠️ 生产数据安全性未验证
      方案 B：灰度切换
        确定：风险可控
        不确定：⚠️ 代码复杂度增加
      方案 C：双写过渡
        确定：零停机
        不确定：⚠️ 数据一致性需额外保障
  → 开发者选择：方案 B
  → 自动生成 Spec 化 current-plan.md（含约束 + 文件范围 + 可验证产出）
  → 自动生成 Decision 草稿写入 drafts/

下午：执行
  /build
  → 读取 session.yaml，发现无历史检查点，从头开始
  → Hook 保证：只能修改 current-plan.md 中"允许修改的文件范围"
  → 完成 resourceService.ts 修改 → 记录 cp-001
  → 完成 migrations/002_add_index.sql → 记录 cp-002
  → 尝试修改 src/index.ts → 触发 PAUSE（在"明确排除"列表中）
  → 输出结构化选项：
      (1) 允许此修改，并更新计划范围
      (2) 允许此修改（一次性例外）
      (3) 跳过此修改
      (4) 暂停，重新进入 Plan 模式
  → 开发者选择 (1)，计划范围扩展
  → 继续执行，完成后 audit.log 自动更新

意外中断（会议插入）：
  → session.yaml 已记录 cp-001, cp-002（done），cp-003（paused）
  → 明日打开新会话，输入 /build
  → AI 读取 session.yaml，直接告知：
    "上次任务：D1 迁移（灰度切换）
     已完成：cp-001 resourceService.ts, cp-002 migrations/
     待续：cp-003 index.ts 路由（需确认是否扩展范围）
     请选择：(1) 扩展范围继续 (2) 跳过 index.ts"

结束：沉淀
  /remember
  → AI 识别本次新出现的决策：灰度切换策略
  → 自动填充摘要字段
  → 生成 drafts/2026-02-23_d1-migration-strategy.md
  → 开发者审核，移入 decisions/
```

## 附录：从 OpenSpec 迁移

如果当前项目正在使用 OpenSpec，以下是迁移路径：

**命令映射**（DevMind 对 OpenSpec 工作流的完整覆盖）：

| OpenSpec 操作 | DevMind 等价操作 |
|---|---|
| `/new` 创建新 spec | `/plan` 进入规划模式，产出 `current-plan.md` |
| `/ff` 逐步推进 | `/build` 按 Spec 执行，自动检测计划外分叉 |
| `/apply` 执行变更 | Build 模式自动执行，Hook 保障约束 |
| `/verify` 验证结果 | 检查 `current-plan.md` 中的预期产出清单（`[ ]` 项） |
| `/archive` 归档 | `/remember` 将完成的任务沉淀为 Decision 或 Pattern |

**已有 OpenSpec spec 文件的处理**：
- 进行中的 spec → 提取目标和约束，重写为 `current-plan.md`（参考 3.7 节 Spec 区块格式）
- 已完成的 spec → 提炼关键决策写入 `.devmind/memory/decisions/`
- 被否决的方案 → 写入 `.devmind/memory/graveyard/`

*文档日期：2026-02-24*
