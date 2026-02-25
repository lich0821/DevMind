## nvm-noninteractive-shell

**摘要**：在非交互式 shell（Claude Code hooks、CI 等）中调用 npm/node 命令时，nvm lazy-load 会导致无限递归错误；解决方案是始终使用绝对路径并显式设置 PATH。

- 来源：3 次相似问题（本项目 CLI 构建阶段）
- 标签：nvm, shell, npm, CI
- 已验证：是
- 规律：
  - nvm 的 lazy-load 机制在非交互式 shell 下触发 `_nvm_lazy_load` 递归，最终报 `maximum nested function level reached`
  - 仅设置 `PATH` 不够，还需要 node 二进制在 PATH 中（npm 的 shebang 依赖 `node` 可寻址）
  - 正确写法：`PATH="/Users/xxx/.nvm/versions/node/vX.Y.Z/bin:$PATH" /path/to/npm <command>`
- 反例/例外：在普通终端交互式 shell 中，`npm` 命令正常可用，无需绝对路径

---

AI 使用提示：凡在 hooks 或非交互式 shell 中执行 npm/node 命令，先用此规律检查调用方式。
