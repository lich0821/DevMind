## 决策：templates-devmind.ts 应与 .devmind/ 实际文件保持同步

**摘要**：`devmind init` 生成的配置文件内容来自 `templates-devmind.ts`，当 `.devmind/` 文件手动更新但模板未同步时，新项目会得到旧版配置；维护时需确保两者一致。

- 日期：2026-02-25
- 标签：templates, devmind, init, config, flow
- 状态：active

### 背景

在 Phase 1 功能补全过程中发现：当前项目的 `.devmind/flow.yaml` 和 `.devmind/config.yaml` 已包含完整字段（5 个 flow trigger、aging 配置、完整 collaboration），但 `templates-devmind.ts` 中的 `FLOW_YAML` 和 `CONFIG_YAML` 模板字符串仍是早期简化版本。

### 结论

凡修改当前项目的 `.devmind/flow.yaml` 或 `.devmind/config.yaml`，必须同步更新 `packages/cli/src/templates-devmind.ts` 中对应的 `FLOW_YAML` / `CONFIG_YAML` 常量。

### 原因

1. `devmind init` 完全依赖 `templates-devmind.ts` 生成新项目文件，模板落后会导致新项目功能不完整
2. 当前项目的 `.devmind/` 文件是"活文档"，会随功能迭代更新，但模板更新依赖人工同步

### 验证方式

执行 `/dm:explore` 后对比 `.devmind/flow.yaml` 内容与 `FLOW_YAML` 模板字符串，字段数量和结构应一致。

---

AI 使用提示：修改 `.devmind/flow.yaml` 或 `.devmind/config.yaml` 时，检查 `packages/cli/src/templates-devmind.ts` 是否需要同步更新。
