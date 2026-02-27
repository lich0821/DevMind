# DevMind

[English](README.md)

> 让 AI 编程协作真正"记得住、分得清、停得下"

**DevMind** 是一个与 [Claude Code](https://claude.ai/code) 深度整合的开发者工作流框架。它通过文件 + Hook + Slash 命令，给 AI 补上"工作记忆"——让 AI 助手从"聪明的一次性工具"变成"有记忆的长期搭档"。

## 为什么需要 DevMind？

使用 AI 编程工具时，你可能遇到过这些情况：

- 上次说好"不用 class 组件"，新对话里 AI 又写出来了
- 探索代码时 AI 顺手改了文件，完全没有预警
- 三轮对话之后，实现和最初设计已经悄悄偏离
- 尝试过的方案被否决，但下次会话可能重蹈覆辙
- 任务中断后不知道进行到哪一步，只能重来

DevMind 针对这些问题，在本地维护一套"项目状态文件"，让 AI 每次会话都能加载上下文、感知当前任务阶段、并在越界时主动暂停。

## 核心机制

### 5 种工作模式

| 模式 | 用途 | AI 权限 |
|------|------|---------|
| `auto` | 一句话需求，全流程自动执行 | 低风险全自动；高风险确认一次 |
| `explore` | 只读分析，理解代码 | 禁止写文件 |
| `plan` | 制定方案，不动代码 | 禁止写业务代码 |
| `build` | 按计划执行 | 只能改计划内文件 |
| `edit` | 小范围修改 | 可改，跨文件需确认 |

### 5 层状态管理

- **Mode**：当前工作模式，Hook 强制执行权限约束
- **Memory**：跨会话记忆，分为 decisions（决策）/ patterns（规律）/ graveyard（已否决方案）
- **Flow**：自动检查点，检测越界 / 不确定 / 危险操作时暂停
- **Session**：任务检查点链，支持中断后断点续传
- **Collaboration**：多人协作配置（v0.1 支持 solo 模式）

## 快速开始

### 安装

```bash
npm install -g @lich0821/devmind
```

### 初始化项目

在你的项目根目录运行：

```bash
devmind init
```

会自动生成：
- `.devmind/`：状态管理目录（模式、记忆、会话、配置）
- `.claude/hooks/`：PreToolUse / PostToolUse 钩子
- `.claude/commands/dm/`：11 个 Slash 命令
- `.claude/CLAUDE.md`：会话启动时自动注入的状态感知提示

### 开始工作

打开 Claude Code，开始一个新会话，它会自动读取当前模式和记忆索引。

```
/dm:auto      # 一句话需求 → 自动 explore + plan + build
/dm:explore    # 进入只读分析模式
/dm:plan       # 制定结构化方案
/dm:build      # 按计划执行（自动维护检查点）
/dm:edit       # 小范围直接修改
/dm:remember   # 将本次决策沉淀为记忆
/dm:recall     # 检索历史记忆
/dm:audit      # 查看文件修改日志
/dm:status     # 查看当前状态（也可用 devmind status）
```

### CLI 命令

除 Slash 命令外，也可直接在终端使用：

```bash
devmind status               # 查看当前模式、计划、检查点
devmind recall hook          # 搜索记忆中关于 hook 的内容
devmind audit --last 10      # 查看最近 10 条文件修改记录
devmind audit --plan "v0.1"  # 按计划名过滤审计日志
```

## 典型工作流

```
会话开始
  └─ Claude 自动加载模式 + 记忆索引

探索阶段（explore）
  └─ 只读分析，AI 无法误改文件

规划阶段（plan）
  ├─ 自动检索 Graveyard，防止重蹈覆辙
  ├─ 输出结构化方案对比（确定/不确定/风险）
  └─ 写入 current-plan.md（含 Spec 约束）

执行阶段（build）
  ├─ 严格按 Spec 推进
  ├─ 每步完成后写入 session.yaml 检查点
  └─ 越界/危险操作自动暂停，给出选项

沉淀阶段
  ├─ /dm:remember  → 决策/规律写入 .devmind/memory/
  ├─ /dm:publish   → 功能文档写入 docs/designs/draft/
  └─ /dm:release   → 归档 draft/ 为版本目录，生成 docs/releases/<version>.md
```

## 目录结构

初始化后的 `.devmind/` 目录：

```
.devmind/
├── current-mode.txt        当前模式（explore/plan/build/edit）
├── current-plan.md         当前执行计划（含 Spec 约束）
├── session.yaml            会话检查点链
├── config.yaml             项目配置
├── flow.yaml               自动暂停触发规则
├── memory/
│   ├── decisions/          技术决策记录
│   ├── patterns/           经验规律
│   ├── graveyard/          已否决方案
│   └── index.md            轻量级索引（自动生成）
├── modes/                  各模式说明文档
└── scripts/
    ├── rebuild-index.js    重建记忆索引
    └── check-graveyard.js  方案重复检测
```

## 版本说明

**v0.4.0**（当前）
- 新增：所有脚本从 Shell/Python 迁移到 Node.js，支持 Windows
- 新增：Hook 文件添加 `dm-` 前缀，避免命名冲突
- 重构：简化 `devmind init` 中的 Hook 注入逻辑

**v0.3.1**
- 修复：build 完成后自动清空 `current-plan.md` 和 `session.yaml`，避免旧计划残留造成混淆

**v0.3.0**
- 新增 `/dm:auto` 全自动流水线模式：一句话需求自动串联 explore → plan → build。低风险改动全程无需确认；高风险改动触发一次门控暂停。

**v0.2.1**
- 修复：将 hooks 注入用户级 `~/.claude/settings.json`，模式约束拦截真正生效

**v0.2.0**
- 新增 `devmind migrate` 命令 + `/dm:migrate` slash command，支持存量项目接入

**v0.1.0**
- Phase 1 完整实现：4 种模式 + Hook 拦截 + 9 个 Slash 命令 + 审计日志
- Phase 2 核心实现：`devmind init/status/recall/audit` CLI 命令

## License

MIT
