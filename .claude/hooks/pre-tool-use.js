#!/usr/bin/env node
// .claude/hooks/pre-tool-use.js
// PreToolUse Hook: Mode enforcement for DevMind
// Blocks write operations in Explore/Plan modes
// Claude Code passes JSON via stdin: {"tool_name":"...","tool_input":{...}}

const fs = require('fs');
const path = require('path');

const DEVMIND_DIR = path.join(__dirname, '..', '..', '.devmind');

// Read all stdin
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
    try {
        main(input);
    } catch (err) {
        console.error(`Hook error: ${err.message}`);
        process.exit(0); // Don't block on hook errors
    }
});

function main(hookInput) {
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
                console.error(`BLOCKED: Dangerous command detected: ${pattern}`);
                console.error(`Command: ${command}`);
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
            if (filePath.includes('.devmind/') || filePath.includes('.devmind\\')) {
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
                        console.error(`PAUSED: File '${filePath}' is in the exclusion list`);
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
    const lines = planContent.split('\n');
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
