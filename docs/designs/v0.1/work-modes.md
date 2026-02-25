---
milestone: v0.1
---

# 4 种工作模式系统

> 生成日期：2026-02-25

## 背景

AI 编码助手在没有约束的情况下，会在"你只是想看看代码"时开始修改文件，或者在你明确说"先别动代码"后仍然提交变更。DevMind 通过定义 4 种互斥的工作模式，从根本上解决 AI 的"越权"问题——每种模式对应一种工作意图，Hook 在工具调用层强制执行限制。

## 方案设计

### 模式定义

| 模式 | 意图 | AI 写权限 |
|------|------|----------|
| `explore` | 只读分析、理解代码 | 完全禁止（Hook 拦截） |
| `plan` | 制定方案、不修改业务代码 | 仅限 `.devmind/` 内部文件 |
| `build` | 按计划执行 | 仅限计划 Spec 范围内的文件 |
| `edit` | 小范围直接修改 | 允许，跨 2 个文件需确认 |

### 状态存储

当前模式以纯文本存储在 `.devmind/current-mode.txt`，读写极为简单：

```
echo "explore" > .devmind/current-mode.txt
cat .devmind/current-mode.txt
```

### 模式切换

通过 Slash Commands 切换：`/dm:explore`、`/dm:plan`、`/dm:build`、`/dm:edit`。每条命令的 `.md` 模板会在执行时写入新模式值。

### Hook 强制执行

`pre-tool-use.sh` 在每次 Write/Edit/NotebookEdit 工具调用前读取当前模式，按规则拦截或放行：

- `explore`：所有写操作直接阻断，返回错误提示
- `plan`：只允许写 `.devmind/` 下的文件（计划、session 等），拦截业务代码修改
- `build`：对照 `current-plan.md` 中的"明确排除"列表，命中时暂停并给出选项
- `edit`：记录本次 session 写入的文件数，超过 2 个时提示确认

### 为何重命名 debug → edit

早期第四种模式叫 `debug`，语义上暗示"只处理 bug"。实践发现这个模式也适用于小功能添加、配置调整等任意小范围改动。重命名为 `edit` 后，名称与权限描述（"可编辑"）对齐，调试场景改为 `explore`（诊断）→ `edit`（修复）两步流程。

## 功能范围

**本次实现：**
- 4 种模式定义及文档（`.devmind/modes/*.md`）
- `current-mode.txt` 状态文件
- 4 条模式切换 Slash Commands（`explore/plan/build/edit.md`）
- `CLAUDE.md` 中的模式感知提示（会话启动时自动注入）

**明确排除：**
- 模式切换的动画或 UI 提示（命令行纯文本）
- 模式历史记录（不记录切换日志）
- 多人协作下的模式锁定（v0.1 仅 solo 模式）

## 关键决策

**1. 模式约束在 Hook 层强制执行，而非依赖 AI 自律**

AI 的"我不会修改文件"承诺在上下文压力下不可靠。将约束下沉到工具调用层（pre-tool-use Hook），无论 AI 怎么思考，写操作都会被拦截。这是 DevMind 最核心的设计原则。

**2. `explore` 模式不区分文件类型，一律拦截**

早期讨论是否允许写 `.devmind/` 内部文件（如记录笔记）。最终决定 `explore` 模式下零例外，理由是：explore 的语义是"观察"，任何写入都破坏这个语义；需要记录发现时切换到其他模式即可。

## 已知限制 / 后续计划

- `edit` 模式的"2个文件"阈值是经验值，未来可考虑在 `config.yaml` 中配置
- `build` 模式的文件范围检测依赖 AI 解析 `current-plan.md` 的文本内容，目前没有结构化的文件白名单，准确性取决于计划文档的格式规范程度
- 计划支持 `devmind mode` CLI 命令（Phase 2），可在终端直接查看和切换模式
