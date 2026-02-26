# Build 完成后自动清理运行时状态

> 生成日期：2026-02-27

## 背景

`/dm:build` 执行完成后，`current-plan.md` 和 `session.yaml` 会保留旧内容，直到下一个计划覆盖。这导致会话启动时显示已完成的旧计划，造成语义混淆，开发者需要手动判断计划是否仍然有效。

## 方案设计

在 `build.md` 的"完成后"逻辑中追加两个清理步骤：

1. 清空 `current-plan.md`
2. 清空 `session.yaml`

由于 `/dm:auto` 的 build 阶段复用 `build.md` 的逻辑，此清理同样对 auto 流水线生效，无需单独修改 `auto.md`。

## 功能范围

**实现：**
- `build.md` 完成后清空 `current-plan.md` 和 `session.yaml`

**排除：**
- 不归档历史计划（直接清空，历史通过 `decisions/` 和 `audit.log` 追溯）
- 不修改 `session.yaml` 格式或写入逻辑

## 关键决策

**清空而非归档**：计划的执行历史已经由 `memory/decisions/` 沉淀、`audit.log` 记录，`current-plan.md` 和 `session.yaml` 只是工作区临时状态，清空即可，不需要额外的归档机制。

## 已知限制 / 后续计划

- 若 build 中途被强制中断（非正常完成），清理步骤不会执行，残留问题依然存在——可接受，此时 `session.yaml` 的暂停状态正好用于断点续传
