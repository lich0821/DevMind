#!/usr/bin/env node
// .claude/hooks/post-tool-use.js
// PostToolUse Hook: Audit logging for DevMind
// Records all write operations to audit.log
// Claude  Code passes JSON via stdin: {"tool_name":"...","tool_input":{...},"tool_response":{...}}

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
        // Silent failure for audit logging - don't interrupt workflow
        process.exit(0);
    }
});

function main(hookInput) {
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
        const firstLine = planContent.split('\n')[0] || '';
        if (firstLine.startsWith('# ')) {
            currentPlan = firstLine.slice(2).trim();
        }
    } catch {
        // Use default
    }

    const filePath = toolInput.file_path || 'unknown';
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

    const logLine = `[${timestamp}] ${currentMode}  ${filePath}  plan:${currentPlan}\n`;

    // Append to audit log
    const auditFile = path.join(DEVMIND_DIR, 'audit.log');
    try {
        fs.appendFileSync(auditFile, logLine, 'utf8');
    } catch {
        // Silent failure
    }

    process.exit(0);
}
