---
description: 进入只读分析模式，理解代码架构，定位问题，不修改任何文件
---

进入 **EXPLORE 模式**（只读）。

## 前置操作

```sh
echo "explore" > .devmind/current-mode.txt
```

## 行为规则

- **禁止**调用 Write / Edit / NotebookEdit 工具（Hook 会自动拦截）
- 可自由读取任何文件
- 加载 `.devmind/memory/index.md`，了解项目历史决策背景

## 分析输出格式

完成探索后，输出：

1. **发现摘要**：1-3 句话描述关键发现
2. **相关记忆**：列出 index.md 中与当前问题相关的 Decision/Pattern（如有）
3. **建议下一步**：根据发现推荐切换到哪个模式
   - 问题已定位，改动小 → 建议 `/dm:edit`
   - 需要方案规划 → 建议 `/dm:plan`
   - 已有明确计划 → 建议 `/dm:build`

## 注意

不要在 Explore 模式下给出"修改建议"——探索是为了理解，不是为了行动。
如需修改，明确切换模式后再操作。
