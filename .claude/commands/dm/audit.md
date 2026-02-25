---
description: 查看文件修改审计日志，支持按计划名或数量过滤
---

执行 **AUDIT**——查看文件修改审计日志。

## 用法

```
/dm:audit          — 显示最近 20 条记录
/dm:audit 50       — 显示最近 50 条记录
/dm:audit plan:xxx — 显示特定计划的所有记录
/dm:audit build    — 显示所有 build 模式的记录
```

## 执行步骤

读取 `.devmind/audit.log`，按参数过滤，格式化输出：

```
时间                    模式     文件                              计划
──────────────────────────────────────────────────────────────────────
2026-02-23 14:32:12    build    src/services/resourceService.ts   migrate-to-d1
```

输出末尾附统计摘要：`共 N 条记录，涉及 M 个文件`

如果 `audit.log` 为空，输出：`暂无审计记录。audit.log 由 PostToolUse Hook 自动写入。`
