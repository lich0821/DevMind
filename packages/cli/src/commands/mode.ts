import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import chalk from 'chalk';
import { requireDevmindDir } from '../utils/find-devmind.js';

const VALID_MODES = ['explore', 'edit', 'plan', 'build'] as const;

function readCurrentMode(modePath: string): string {
    if (!existsSync(modePath)) {
        return 'explore';
    }
    const current = readFileSync(modePath, 'utf-8').trim();
    return current || 'explore';
}

export function runMode(mode?: string): void {
    const devmindDir = requireDevmindDir();
    const modePath = join(devmindDir, 'current-mode.txt');
    const current = readCurrentMode(modePath);

    if (!mode) {
        console.log(current);
        return;
    }

    const next = mode.trim().toLowerCase();
    if (!VALID_MODES.includes(next as typeof VALID_MODES[number])) {
        console.error(chalk.red('✗ Invalid mode: ') + mode);
        console.error(`  Valid modes: ${VALID_MODES.join(', ')}`);
        process.exit(1);
    }

    writeFileSync(modePath, `${next}\n`, 'utf-8');
    console.log(chalk.green('✓') + ` Mode switched: ${chalk.cyan(current)} → ${chalk.cyan(next)}`);
}
