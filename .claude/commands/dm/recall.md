---
description: 关键词检索历史记忆（decisions / patterns / graveyard）
---

执行 **RECALL**——关键词检索历史记忆。

## 用法

```
/dm:recall <关键词>
```

## 执行步骤

### 步骤1：解析搜索词

从命令参数中提取关键词。如果没有提供关键词，提示用户输入。

### 步骤2：搜索范围

在以下位置搜索包含关键词的内容：
- `.devmind/memory/decisions/*.md` — 历史决策
- `.devmind/memory/patterns/*.md` — 经验规律
- `.devmind/memory/graveyard/*.md` — 被否决的方案

优先匹配顺序：文件名 → `**摘要**` 字段 → `标签：` 行 → 文件正文。

### 步骤3：输出结果

```
找到 N 条相关记忆：

[类型] 文件名
摘要：[摘要内容]
标签：[标签]
---
```

如果找到 Graveyard 相关结果，提示：
```
⚠️ 发现相关的已否决方案，建议在 /dm:plan 前仔细阅读。
```
