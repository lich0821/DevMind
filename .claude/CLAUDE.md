# DevMind 状态感知

> 本段由 DevMind 框架注入，适用于本项目所有 Claude  Code 会话。

## 会话启动检查

每次会话开始时，执行以下操作：

1. **读取当前模式**：`cat .devmind/current-mode.txt`
   - `explore`：只读，禁止修改任何文件
   - `edit`：可小范围修改，跨文件改动（超过2个文件）需确认
   - `plan`：仅输出方案，不修改业务代码
   - `build`：按 `current-plan.md` 中的 Spec 执行
   - 文件不存在时，默认进入 `explore` 模式

2. **检查会话状态**：如果 `.devmind/session.yaml` 存在，读取并告知开发者上次任务状态，包括：
   - 上次执行的计划
   - 已完成和待续的检查点
   - 是否有未解决的暂停原因

3. **加载记忆索引**：读取 `.devmind/memory/index.md`（轻量级，仅包含摘要和标签）

## 模式切换提示

当开发者输入的意图与当前模式不符时，主动提示可用的模式命令：

```
用户："帮我改这个 bug"
当前模式：explore（只读）
→ 提示：检测到修改意图，当前处于 explore 模式（只读）。
  建议：
  - 先定位问题？继续使用 /dm:explore
  - 已知问题位置？使用 /dm:edit 进入编辑模式
  - 需要大范围修改？使用 /dm:plan 制定方案后再 /dm:build
```

## 模式约束说明（Hook 强制执行）

- Explore / Plan 模式下，Write / Edit / NotebookEdit 工具调用会被 `pre-tool-use.js` 拦截
- Build 模式下，修改"明确排除"列表中的文件会触发暂停
- 所有写操作都由 `post-tool-use.js` 自动记录到 `audit.log`

## 可用命令速览

| 命令 | 用途 |
|------|------|
| `/dm:auto` | 输入一句话需求，自动完成 explore→plan→build 全流程 |
| `/dm:explore` | 进入只读分析模式 |
| `/dm:edit` | 进入小范围编辑模式 |
| `/dm:plan` | 制定结构化方案（强制检索 Graveyard） |
| `/dm:build` | 按计划执行（支持断点续传） |
| `/dm:remember` | 将本次决策沉淀为记忆 |
| `/dm:recall` | 检索历史记忆 |
| `/dm:bury` | 记录被否决的方案到 Graveyard |
| `/dm:audit` | 查看操作审计日志 |
| `/dm:sync-memory` | 同步团队记忆（git pull + 重建索引） |
| `/dm:publish` | 将当前功能整理为文档写入 `docs/designs/draft/` |
| `/dm:release` | 汇总 draft/ 生成版本文档，归档功能文档 |

## 回复格式要求

**每次回复结束时**，读取 `.devmind/current-mode.txt` 并在末尾单独一行显示当前模式：

```
📍DevMind: {模式}
```

示例：
```
📍DevMind: explore
📍DevMind: edit
📍DevMind: build
```

此要求适用于所有回复，确保开发者随时了解当前工作模式。
