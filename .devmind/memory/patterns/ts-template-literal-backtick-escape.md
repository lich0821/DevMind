## 规律：TypeScript 模板字面量中的反引号转义陷阱

- 标签：typescript, template-literal, escaping, bug

**摘要**：在 TypeScript 模板字面量（`` ` `` ... `` ` ``）内部，代码围栏（` ``` `）必须用 `\`` 转义每个反引号，而**不能**用 `\\\``；结束模板字面量的反引号也绝不能加反斜杠，否则会嵌入字面量内容而非关闭它。

### 本次踩坑记录

在 `templates-commands2.ts` 的 CMD_MIGRATE / CMD_RELEASE 常量中，连续两次出现：

**Bug 1**：写入 `\\\`\\\`\\\`` 想表示代码围栏
- 实际效果：TS 解析器看到 `\\` + `\`` = 一个字面反斜杠 + 关闭外层模板字面量
- 报错：`TS1160: Unterminated template literal`

**Bug 2**（修复 Bug 1 时引入）：替换脚本将 `\\\`` → `\`` 时连带把 CMD_RELEASE 结尾的 `` `; `` 改成了 `\`;`
- 实际效果：CMD_RELEASE 永不关闭，CMD_MIGRATE 定义在 CMD_RELEASE 内部
- 报错：`TS1005: ',' expected` 等一批 parse 错误

### 正确写法

```typescript
// 在模板字面量内部表示 markdown 代码围栏
export const FOO = `
\`\`\`sh
echo hello
\`\`\`
`;
// 每个反引号用 \` 转义，结束模板字面量时用裸反引号
```

### 检查方法

修改 templates-commands*.ts 后，立即运行：
```sh
grep -n '\\`;' packages/cli/src/templates-commands*.ts
```
如有输出，说明有模板字面量被错误关闭，需要将 `\`;` 改回 `` `; ``。
