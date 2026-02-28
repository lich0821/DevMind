// templates.ts — All file templates for `devmind init`
// Split into logical groups to keep the file manageable.

// ─── Hooks (Node.js for cross-platform compatibility) ─────────────────────────

export const PRE_TOOL_USE_JS = `#!/usr/bin/env node
// ~/.devmind/hooks/dm-pre-tool-use.js
// PreToolUse Hook: Mode enforcement for DevMind
// Blocks write operations in Explore/Plan modes
// Claude  Code passes JSON via stdin: {"tool_name":"...","tool_input":{...}}
// This is a GLOBAL hook - uses process.cwd() to find project's .devmind/

const fs = require('fs');
const path = require('path');

// Find .devmind/ from current working directory (where Claude  Code is running)
const DEVMIND_DIR = path.join(process.cwd(), '.devmind');

// Read all stdin
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
    try {
        main(input);
    } catch (err) {
        console.error(\`Hook error: \${err.message}\`);
        process.exit(0); // Don't block on hook errors
    }
});

function main(hookInput) {
    // Skip if not a DevMind project (no .devmind/ directory)
    if (!fs.existsSync(DEVMIND_DIR)) {
        process.exit(0);
    }

    let data;
    try {
        data = JSON.parse(hookInput);
    } catch {
        process.exit(0); // Invalid JSON, let it pass
    }

    const toolName = data.tool_name || '';
    const toolInput = data.tool_input || {};

    // Read current mode (default to 'explore' - most restrictive)
    let currentMode = 'explore';
    const modeFile = path.join(DEVMIND_DIR, 'current-mode.txt');
    try {
        currentMode = fs.readFileSync(modeFile, 'utf8').trim();
    } catch {
        // File doesn't exist, use default
    }

    // Check dangerous commands in Bash tool (all modes)
    if (toolName === 'Bash') {
        const command = toolInput.command || '';
        const dangerPatterns = [
            'rm -rf',
            'DROP TABLE',
            'DELETE FROM',
            'git push --force',
            'git push -f'
        ];
        for (const pattern of dangerPatterns) {
            if (command.toLowerCase().includes(pattern.toLowerCase())) {
                console.error(\`BLOCKED: Dangerous command detected: \${pattern}\`);
                console.error(\`Command: \${command}\`);
                console.error('Please run this command manually in terminal if you understand the consequences.');
                process.exit(1);
            }
        }
    }

    // Only intercept write operations
    if (['Write', 'Edit', 'NotebookEdit'].includes(toolName)) {
        const filePath = toolInput.file_path || '';

        if (currentMode === 'explore') {
            console.error('BLOCKED: Explore mode prohibits file modifications');
            console.error('Hint: Use /dm:edit or /dm:build to enter writable mode');
            process.exit(1);
        }

        if (currentMode === 'plan') {
            // Plan mode allows writing to .devmind/ internal files
            // Use path.sep for cross-platform compatibility
            const devmindInPath = filePath.includes('.devmind' + path.sep) || filePath.includes('.devmind/');
            if (devmindInPath) {
                process.exit(0);
            }
            console.error('BLOCKED: Plan mode only outputs plans, no business code modifications');
            console.error('Hint: Use /dm:build to execute confirmed plans');
            process.exit(1);
        }

        if (currentMode === 'build') {
            // Build mode: check file scope constraints
            const planFile = path.join(DEVMIND_DIR, 'current-plan.md');
            if (filePath && fs.existsSync(planFile)) {
                const planContent = fs.readFileSync(planFile, 'utf8');
                const excludedPatterns = extractExcludedPatterns(planContent);

                for (const pattern of excludedPatterns) {
                    if (filePath.includes(pattern)) {
                        console.error(\`PAUSED: File '\${filePath}' is in the exclusion list\`);
                        console.error('Options: (1) Allow and update plan scope  (2) Allow one-time exception  (3) Skip this modification  (4) Switch to Plan mode');
                        process.exit(1);
                    }
                }
            }
        }
    }

    process.exit(0);
}

function extractExcludedPatterns(planContent) {
    const patterns = [];
    const lines = planContent.split('\\n');
    let inExcluded = false;

    for (const line of lines) {
        if (line.startsWith('### ') && line.includes('排除')) {
            inExcluded = true;
            continue;
        }
        if (inExcluded) {
            if (line.startsWith('### ')) {
                break; // Next section
            }
            const trimmed = line.trim();
            if (trimmed.startsWith('- ')) {
                patterns.push(trimmed.slice(2).trim());
            }
        }
    }

    return patterns;
}
`;

export const POST_TOOL_USE_JS = `#!/usr/bin/env node
// ~/.devmind/hooks/dm-post-tool-use.js
// PostToolUse Hook: Audit logging for DevMind
// Records all write operations to audit.log
// Claude  Code passes JSON via stdin: {"tool_name":"...","tool_input":{...},"tool_response":{...}}
// This is a GLOBAL hook - uses process.cwd() to find project's .devmind/

const fs = require('fs');
const path = require('path');

// Find .devmind/ from current working directory (where Claude  Code is running)
const DEVMIND_DIR = path.join(process.cwd(), '.devmind');

// Read all stdin
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
    try {
        main(input);
    } catch (err) {
        // Silent failure for audit logging - don't interrupt workflow
        process.exit(0);
    }
});

function main(hookInput) {
    // Skip if not a DevMind project (no .devmind/ directory)
    if (!fs.existsSync(DEVMIND_DIR)) {
        process.exit(0);
    }

    let data;
    try {
        data = JSON.parse(hookInput);
    } catch {
        process.exit(0);
    }

    const toolName = data.tool_name || '';
    const toolInput = data.tool_input || {};

    // Only log write operations
    if (!['Write', 'Edit', 'NotebookEdit'].includes(toolName)) {
        process.exit(0);
    }

    // Read current mode
    let currentMode = 'unknown';
    const modeFile = path.join(DEVMIND_DIR, 'current-mode.txt');
    try {
        currentMode = fs.readFileSync(modeFile, 'utf8').trim();
    } catch {
        // Use default
    }

    // Read current plan title
    let currentPlan = 'none';
    const planFile = path.join(DEVMIND_DIR, 'current-plan.md');
    try {
        const planContent = fs.readFileSync(planFile, 'utf8');
        const firstLine = planContent.split('\\n')[0] || '';
        if (firstLine.startsWith('# ')) {
            currentPlan = firstLine.slice(2).trim();
        }
    } catch {
        // Use default
    }

    const filePath = toolInput.file_path || 'unknown';
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

    const logLine = \`[\${timestamp}] \${currentMode}  \${filePath}  plan:\${currentPlan}\\n\`;

    // Append to audit log
    const auditFile = path.join(DEVMIND_DIR, 'audit.log');
    try {
        fs.appendFileSync(auditFile, logLine, 'utf8');
    } catch {
        // Silent failure
    }

    process.exit(0);
}
`;

// ─── CLAUDE.md ────────────────────────────────────────────────────────────────

export const CLAUDE_MD = `# DevMind 状态感知

> 本段由 DevMind 框架注入，适用于本项目所有 Claude  Code 会话。

## 会话启动检查

每次会话开始时，执行以下操作：

1. **读取当前模式**：\`cat .devmind/current-mode.txt\`
   - \`explore\`：只读，禁止修改任何文件
   - \`edit\`：可小范围修改，跨文件改动（超过2个文件）需确认
   - \`plan\`：仅输出方案，不修改业务代码
   - \`build\`：按 \`current-plan.md\` 中的 Spec 执行
   - 文件不存在时，默认进入 \`explore\` 模式

2. **检查会话状态**：如果 \`.devmind/session.yaml\` 存在，读取并告知开发者上次任务状态，包括：
   - 上次执行的计划
   - 已完成和待续的检查点
   - 是否有未解决的暂停原因

3. **加载记忆索引**：读取 \`.devmind/memory/index.md\`（轻量级，仅包含摘要和标签）

## 模式切换提示

当开发者输入的意图与当前模式不符时，主动提示可用的模式命令：

\`\`\`
用户："帮我改这个 bug"
当前模式：explore（只读）
→ 提示：检测到修改意图，当前处于 explore 模式（只读）。
  建议：
  - 先定位问题？继续使用 /dm:explore
  - 已知问题位置？使用 /dm:edit 进入编辑模式
  - 需要大范围修改？使用 /dm:plan 制定方案后再 /dm:build
\`\`\`

## 模式约束说明（Hook 强制执行）

- Explore / Plan 模式下，Write / Edit / NotebookEdit 工具调用会被 \`dm-pre-tool-use.js\` 拦截
- Build 模式下，修改"明确排除"列表中的文件会触发暂停
- 所有写操作都由 \`dm-post-tool-use.js\` 自动记录到 \`audit.log\`

## 可用命令速览

| 命令 | 用途 |
|------|------|
| \`/dm:auto\` | 输入一句话需求，自动完成 explore→plan→build 全流程 |
| \`/dm:explore\` | 进入只读分析模式 |
| \`/dm:edit\` | 进入小范围编辑模式 |
| \`/dm:plan\` | 制定结构化方案（强制检索 Graveyard） |
| \`/dm:build\` | 按计划执行（支持断点续传） |
| \`/dm:remember\` | 将本次决策沉淀为记忆 |
| \`/dm:recall\` | 检索历史记忆 |
| \`/dm:bury\` | 记录被否决的方案到 Graveyard |
| \`/dm:audit\` | 查看操作审计日志 |
| \`/dm:sync-memory\` | 同步团队记忆（git pull + 重建索引） |
| \`/dm:publish\` | 将当前功能整理为文档写入 \`docs/designs/draft/\` |
| \`/dm:release\` | 汇总 draft/ 生成版本文档，归档功能文档 |
`;

// ─── settings.local.json ──────────────────────────────────────────────────────

export const SETTINGS_LOCAL_JSON = `{
  "permissions": {
    "allow": [
      "Bash(chmod:*)",
      "Bash(tree:*)",
      "Bash(node:*)",
      "Bash(node .devmind/scripts/*:*)"
    ],
    "deny": [],
    "ask": []
  }
}
`;
