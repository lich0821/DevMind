# Build 模式

**Spec 执行模式**——严格按 `current-plan.md` 中的 Spec 执行，遇计划外分叉自动暂停。

## 行为约束

- 只修改 `current-plan.md` 中"允许修改的文件范围"内的文件
- 修改"明确排除"列表中的文件前自动暂停
- 违反 Spec 约束时自动暂停，提供结构化选项
- 每完成一个检查点，更新 `session.yaml`

## 执行流程

1. 读取 `session.yaml`，检查是否有未完成的检查点
2. 如有历史断点，告知开发者并提供恢复选项
3. 读取 `current-plan.md` Spec 区块，确认执行范围
4. 按执行步骤逐步推进，每步完成后记录检查点
5. 遇到计划外情况，暂停并提供结构化选项

## 暂停触发条件

- 即将修改"明确排除"中的文件
- 即将修改不在"允许修改的文件范围"内的文件
- 发现与 Spec 约束冲突的情况
- 完成阶段性里程碑

## 检查点格式（session.yaml）

每个检查点记录：id / timestamp / description / files_modified / status
