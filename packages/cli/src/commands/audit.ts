import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import chalk from 'chalk';
import { requireDevmindDir } from '../utils/find-devmind.js';

interface AuditEntry {
    timestamp: string;
    mode: string;
    file: string;
    plan: string;
    raw: string;
}

// Parse a log line: [2026-02-25 16:17:48] edit  /path/to/file  plan:计划名
function parseLine(line: string): AuditEntry | null {
    const match = line.match(/^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\]\s+(\S+)\s+(\S+)\s+plan:(.*)$/);
    if (!match) return null;
    return {
        timestamp: match[1],
        mode: match[2],
        file: match[3],
        plan: match[4].trim(),
        raw: line,
    };
}

interface AuditOptions {
    last?: number;
    plan?: string;
    mode?: string;
}

const modeColor: Record<string, (s: string) => string> = {
    explore: chalk.blue,
    plan:    chalk.yellow,
    build:   chalk.green,
    edit:    chalk.magenta,
    unknown: chalk.dim,
};

export function runAudit(options: AuditOptions = {}): void {
    const devmindDir = requireDevmindDir();
    const logPath = join(devmindDir, 'audit.log');

    if (!existsSync(logPath)) {
        console.log('');
        console.log(chalk.dim('暂无审计记录。audit.log 由 PostToolUse Hook 自动写入。'));
        console.log('');
        return;
    }

    const raw = readFileSync(logPath, 'utf-8').trim();
    if (!raw) {
        console.log('');
        console.log(chalk.dim('暂无审计记录。audit.log 由 PostToolUse Hook 自动写入。'));
        console.log('');
        return;
    }

    let entries = raw
        .split('\n')
        .map(parseLine)
        .filter((e): e is AuditEntry => e !== null);

    // Apply filters
    if (options.plan) {
        const planKw = options.plan.toLowerCase();
        entries = entries.filter(e => e.plan.toLowerCase().includes(planKw));
    }
    if (options.mode) {
        entries = entries.filter(e => e.mode === options.mode);
    }

    // Take last N (default 20)
    const limit = options.last ?? 20;
    const total = entries.length;
    entries = entries.slice(-limit);

    console.log('');

    if (entries.length === 0) {
        console.log(chalk.dim('No matching audit entries.'));
        console.log('');
        return;
    }

    // Header
    const colTime = 19;
    const colMode = 8;
    const colFile = 45;
    const colPlan = 20;
    console.log(
        chalk.dim(
            'Time'.padEnd(colTime) + '  ' +
            'Mode'.padEnd(colMode) + '  ' +
            'File'.padEnd(colFile) + '  ' +
            'Plan'
        )
    );
    console.log(chalk.dim('─'.repeat(colTime + colMode + colFile + colPlan + 6)));

    for (const e of entries) {
        const colorFn = modeColor[e.mode] ?? chalk.white;
        // Truncate file path for display
        const fileDisplay = e.file.length > colFile ? '...' + e.file.slice(-(colFile - 3)) : e.file;
        const planDisplay = e.plan.length > colPlan ? e.plan.slice(0, colPlan - 1) + '…' : e.plan;
        console.log(
            chalk.dim(e.timestamp) + '  ' +
            colorFn(e.mode.padEnd(colMode)) + '  ' +
            fileDisplay.padEnd(colFile) + '  ' +
            chalk.dim(planDisplay)
        );
    }

    console.log('');
    console.log(chalk.dim(`共 ${total} 条记录，显示最近 ${entries.length} 条，涉及 ${new Set(entries.map(e => e.file)).size} 个文件`));
    console.log('');
}
