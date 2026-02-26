## nvm-noninteractive-shell

**摘要**：nvm 懒加载在非交互式 shell（Claude  Code、CI 等）中不生效，导致 node/npm 命令找不到；正确解法是在 `~/.zshenv` 中只注入 PATH（不 source nvm.sh），兼顾性能与兼容性。

- 来源：多次相似问题（本项目 CLI 构建阶段）
- 标签：nvm, shell, npm, zshenv, PATH, 非交互式
- 已验证：是

## 规律

### 问题根因
- `.zshrc` 只在交互式 shell 执行，非交互式进程（Claude  Code 启动的 bash/zsh）不加载它
- nvm 懒加载是 `.zshrc` 中定义的 shell function，因此对非交互式进程完全不可见
- 直接调用 `node`/`npm` 会触发 `_nvm_lazy_load` 递归，报 `maximum nested function level reached`

### 正确解法：`~/.zshenv` 只注入 PATH

```zsh
# ~/.zshenv（对所有 zsh 进程生效，包括非交互式）
export NVM_DIR="$HOME/.nvm"
export PATH="$NVM_DIR/versions/node/$(/bin/ls $NVM_DIR/versions/node | /usr/bin/grep "^v$(cat $NVM_DIR/alias/default)" | /usr/bin/sort -V | /usr/bin/tail -1)/bin:$PATH"
```

关键点：
- **不 source `nvm.sh`**，只设置 PATH，几乎无性能开销
- 使用绝对路径工具（`/bin/ls`、`/usr/bin/grep`）避免触发 shell function
- 跟随 `nvm alias default`，`nvm alias default <version>` 更新后自动生效
- `.zshrc` 中的懒加载保持不变，终端启动速度不受影响

### 错误做法（避免）
- 在 `.zshenv` 中 source `nvm.sh`：每次新 shell 都执行完整初始化，影响终端速度
- 用硬编码版本路径：切换 Node 版本后失效，需手动维护
- symlink 到 `~/.local/bin/`：绕过了 nvm 多版本切换的核心价值

## 反例/例外
- 如果项目有 `.nvmrc` 且版本与 default 不同，非交互式 shell 会用 default 版本而非项目版本
- 在普通终端交互式 shell 中，懒加载正常工作，无需任何修改

---

AI 使用提示：凡在非交互式 shell 中执行 npm/node 命令出现 `_nvm_lazy_load` 错误，引导用户检查 `~/.zshenv` 是否设置了 nvm PATH。
