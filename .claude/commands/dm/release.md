---
description: 汇总 docs/designs/draft/ 生成版本文档，归档功能文档
---

进入 **RELEASE 模式**（生成版本文档）。

## 执行步骤

### 步骤1：读取 draft/ 内容

读取 `docs/designs/draft/` 下所有 `.md` 文件（忽略 `.gitkeep`）。

如果 draft/ 为空，停止并提示：

```
docs/designs/draft/ 目录为空，没有可发布的功能文档。
请先使用 /dm:publish 生成功能文档。
```

### 步骤2：确认版本号

向开发者确认版本号：

```
draft/ 下共有 N 个功能文档：
- <slug1>.md — <标题>
- <slug2>.md — <标题>
...

请输入版本号（如 v1.0、v0.2-beta）：
```

### 步骤3：生成版本文档

写入 `docs/releases/<version>.md`，格式如下：

```markdown
# Release <version>

> 发布日期：YYYY-MM-DD

## 本版本包含

<逐条列出各功能的简要说明，附链接到对应设计文档>

- **[功能标题](../designs/<version>/<slug>.md)**：<一句话说明>

## 架构变化

<如有重大架构调整，在此说明；无则省略>

## 已知问题 / 后续计划

<当前版本的限制，下一版本的方向>
```

### 步骤4：归档 draft/

执行以下操作：
1. 将 `docs/designs/draft/` 重命名为 `docs/designs/<version>/`
2. 新建空的 `docs/designs/draft/` 目录，写入 `.gitkeep`

向开发者确认后执行：

```
即将执行：
  docs/designs/draft/ → docs/designs/<version>/
  新建空 docs/designs/draft/

确认？(1) 确认  (2) 取消
```

### 步骤5：完成提示

```
✓ 版本文档已生成：docs/releases/<version>.md
✓ 功能文档已归档：docs/designs/<version>/
✓ draft/ 已重置，可开始记录下一版本功能

建议：使用 /dm:remember 将本版本的关键决策沉淀为 AI 记忆
```

## 注意

- 重命名操作不可撤销，执行前必须向用户确认
- 不修改 `.devmind/memory/` 下的任何文件
- 版本号格式由用户决定，不强制规范
