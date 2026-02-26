---
description: 按确认计划严格执行，支持断点续传，遇计划外分叉自动暂停
---

进入 **BUILD 模式**（Spec 执行）。

## 前置操作

```sh
echo "build" > .devmind/current-mode.txt
```

## 启动检查

### 1. 检查历史检查点

读取 `.devmind/session.yaml`（如果存在）：

如果有 `status: paused` 的检查点，**立即告知**开发者：
```
上次任务：[计划名]
已完成：[已完成检查点列表]
待续：[暂停检查点] — 原因：[暂停原因]

请选择：
(1) 从断点继续
(2) 重新开始（清除历史检查点）
```

### 2. 加载执行约束

读取 `.devmind/current-plan.md` 的 Spec 区块。

如果 `current-plan.md` 不存在或没有 Spec 区块，停止并提示：
```
缺少执行计划。请先使用 /dm:plan 制定方案。
```

## 执行规则

1. **严格按照执行步骤推进**，不跳步
2. 每完成一个步骤，向 `session.yaml` 追加检查点
3. 遇到以下情况**立即暂停**，提供结构化选项：
   - 需要修改"明确排除"列表中的文件
   - 需要修改不在"允许修改的文件范围"内的文件
   - 发现与 Spec 约束冲突
   - 需要新增未预期的依赖

## 检查点写入格式（session.yaml）

完成时：
```yaml
- id: cp-[N]
  timestamp: "YYYY-MM-DDTHH:MM:SS"
  description: "[操作描述]"
  files_modified: [文件路径]
  status: done
```

暂停时：
```yaml
- id: cp-[N]
  description: "[待执行操作]"
  status: paused
  pause_reason: "[原因]"
  resume_options:
    - "[选项1]"
    - "[选项2]"
```

## 暂停输出格式

```
⏸ PAUSED：[原因]

请选择：
(1) [选项1]
(2) [选项2]
(3) 暂停，切换到 /dm:plan 重新规划
```

## 完成后

1. 清空 `current-plan.md`（写入空文件）
2. 清空 `session.yaml`（写入空文件）
3. 输出执行摘要，建议使用 `/dm:remember` 沉淀决策。
