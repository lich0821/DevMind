// templates-devmind.ts — .devmind/ internal file templates

export const CURRENT_MODE_TXT = `explore`;

export const SESSION_YAML = `# .devmind/session.yaml — 会话检查点（由 /dm:build 自动维护）
# 首次使用时此文件为空，执行计划后 AI 会追加检查点

last_mode: ~
last_plan: ~
last_active: ~

# 检查点链（Build 模式执行进度）
checkpoints: []
`;

export const CONFIG_YAML = `# DevMind 项目配置
devmind_version: "0.6.0"

project: MyProject
default_mode: explore
enforcement_level: hook

memory:
  load_on_session_start:
    - index_only
  auto_draft_on_plan: true
  pattern_threshold: 3
  auto_retrieve_on:
    - plan_mode
    - decision_conflict
  retrieval_backend: keyword   # keyword | embed-local | embed-ollama | embed-api
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
  mode: solo
  conflict_resolution:
    strategy: last_write_wins
  ownership:
    require_author: true
    notify_on_change: false
`;

export const FLOW_YAML = `checkpoints:
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
    options:
      - label: "继续下一阶段"
        action: proceed
      - label: "暂停，检查产出后决定"
        action: pause

  - on: ["DROP TABLE", "rm -rf", "DELETE FROM"]
    action: require_explicit_confirm
    message: "检测到危险操作，请明确确认"
`;

export const CURRENT_PLAN_MD = `# 计划：（请填写任务名称）

> 选定日期：YYYY-MM-DD  方案：（方案名）

## Spec

### 约束（不可违反，违反时自动暂停）
- （填写约束条目）

### 预期产出（可验证）
- [ ] （填写可验证的产出条目）

### 允许修改的文件范围
- （填写文件或目录）

### 明确排除（修改这些文件时必须暂停确认）
- （填写文件或目录）

## 执行步骤

1. （步骤1）
`;

export const PROGRESS_MD = `# progress.md

<!-- 当前任务进度，由 /build 命令维护 -->

## 当前任务

（无进行中的任务）

## 最近完成

（暂无记录）
`;

export const MODE_EXPLORE_MD = `# Explore 模式
**只读分析模式**——理解代码架构，定位问题，不修改任何文件。
`;

export const MODE_EDIT_MD = `# Edit 模式
**小范围编辑模式**——直接实施明确的修改，控制改动范围，跨文件修改需确认。

## 调试场景使用方式
- **诊断阶段**：使用 \`/dm:explore\`（只读，定位根因）
- **修复阶段**：切换到 \`/dm:edit\`（最小化修复）
`;

export const MODE_PLAN_MD = `# Plan 模式
**方案规划模式**——只输出方案对比，不执行修改，等待开发者选择后生成 Spec。
`;

export const MODE_BUILD_MD = `# Build 模式
**Spec 执行模式**——严格按照 current-plan.md 中的 Spec 执行，遇计划外分叉自动暂停。
`;

export const TMPL_DECISION = `## 决策：<标题>

**摘要**：<1-2句话概括决策内容，用于索引预览和未来语义检索>

- 日期：YYYY-MM-DD
- 提议者：@username
- 标签：<分类标签，如：React, 存储, 架构>
- 状态：active
- 背景：<为什么要做这个决策>
- 结论：<具体的决策内容>
- 原因：
  1. <原因1>
  2. <原因2>

---

AI 使用提示：<何时应该读取此决策>
`;

export const TMPL_PATTERN = `## 规律：<标题>

**摘要**：<1-2句话概括规律内容，用于索引预览和未来语义检索>

- 来源：<N> 次相似讨论
- 标签：<分类标签>
- 已验证：是/否
- 规律：
  - <规律条目1>
  - <规律条目2>
- 反例/例外：<什么情况下此规律不适用>

---

AI 使用提示：<凡涉及 XX 操作，先查此规律>
`;

export const TMPL_GRAVEYARD = `## 放弃方案：<标题>

- 日期：YYYY-MM-DD
- 提议者：@username / AI
- 关键词：<关键词1>, <关键词2>, <关键词3>
- 原始想法：<当时的提议>
- 放弃原因：
  1. <原因1>
  2. <原因2>
- 替代方案：<最终采用的方案>
- 相似方案特征：<如何识别重蹈覆辙的提议>

---

AI 使用提示：如果再提议类似方案，先读此文件。
`;
