import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import chalk from 'chalk';
import { requireDevmindDir } from '../utils/find-devmind.js';

interface Checkpoint {
    id: string;
    description: string;
    status: 'done' | 'paused';
    pause_reason?: string;
}

interface SessionYaml {
    last_mode?: string;
    last_plan?: string;
    last_active?: string;
    checkpoints?: Checkpoint[];
}

function parseSessionYaml(content: string): SessionYaml {
    const result: SessionYaml = {};
    // Extract simple key: value fields
    const lastMode = content.match(/^last_mode:\s*(.+)$/m);
    const lastPlan = content.match(/^last_plan:\s*(.+)$/m);
    const lastActive = content.match(/^last_active:\s*(.+)$/m);
    if (lastMode) result.last_mode = lastMode[1].trim().replace(/^["']|["']$/g, '');
    if (lastPlan) result.last_plan = lastPlan[1].trim().replace(/^["']|["']$/g, '');
    if (lastActive) result.last_active = lastActive[1].trim().replace(/^["']|["']$/g, '');

    // Extract checkpoints (simple block parsing)
    const checkpoints: Checkpoint[] = [];
    const cpBlocks = content.split(/^\s*- id:/m).slice(1);
    for (const block of cpBlocks) {
        const id = block.match(/^\s*(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g, '') ?? '';
        const desc = block.match(/description:\s*"?([^"\n]+)"?/)?.[1]?.trim() ?? '';
        const status = block.match(/status:\s*(\w+)/)?.[1] as 'done' | 'paused' ?? 'done';
        const pauseReason = block.match(/pause_reason:\s*"?([^"\n]+)"?/)?.[1]?.trim();
        checkpoints.push({ id, description: desc, status, pause_reason: pauseReason });
    }
    result.checkpoints = checkpoints;
    return result;
}

function extractPlanTitle(content: string): string {
    const match = content.match(/^#\s+(.+)$/m);
    return match ? match[1].trim() : '（未命名）';
}

export function runStatus(): void {
    const devmindDir = requireDevmindDir();

    // Mode
    const modePath = join(devmindDir, 'current-mode.txt');
    const mode = existsSync(modePath)
        ? readFileSync(modePath, 'utf-8').trim()
        : 'explore (default)';

    // Plan
    const planPath = join(devmindDir, 'current-plan.md');
    const planTitle = existsSync(planPath)
        ? extractPlanTitle(readFileSync(planPath, 'utf-8'))
        : '（无活跃计划）';

    // Session / checkpoints
    const sessionPath = join(devmindDir, 'session.yaml');
    let session: SessionYaml = {};
    if (existsSync(sessionPath)) {
        session = parseSessionYaml(readFileSync(sessionPath, 'utf-8'));
    }

    const checkpoints = session.checkpoints ?? [];
    const doneCount = checkpoints.filter(c => c.status === 'done').length;
    const paused = checkpoints.find(c => c.status === 'paused');
    const lastDone = [...checkpoints].reverse().find(c => c.status === 'done');

    // ── Output ──
    console.log('');
    console.log(chalk.bold('DevMind Status'));
    console.log('─'.repeat(40));

    const modeColor: Record<string, (s: string) => string> = {
        explore: chalk.blue,
        plan:    chalk.yellow,
        build:   chalk.green,
        edit:    chalk.magenta,
    };
    const colorFn = modeColor[mode] ?? chalk.white;
    console.log(`${chalk.dim('Mode:')}    ${colorFn(mode)}`);
    console.log(`${chalk.dim('Plan:')}    ${planTitle}`);

    if (checkpoints.length > 0) {
        console.log('');
        console.log(chalk.bold('Checkpoints:'));
        if (lastDone) {
            console.log(`  ${chalk.green('✓')} ${lastDone.id}  ${chalk.dim(lastDone.description)}  ${chalk.dim('(last done)')}`);
        }
        if (paused) {
            console.log(`  ${chalk.yellow('⏸')} ${paused.id}  ${chalk.dim(paused.description)}`);
            if (paused.pause_reason) {
                console.log(`     ${chalk.yellow('Reason:')} ${paused.pause_reason}`);
            }
        }
        console.log(`  ${chalk.dim(`Total: ${doneCount} done${paused ? ', 1 paused' : ''}`)}`);
    } else {
        console.log(`${chalk.dim('Session:')}  no checkpoints`);
    }

    console.log('');
}
