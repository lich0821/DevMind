import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

/**
 * Walk up from startDir looking for a directory that contains `.devmind/`.
 * Returns the absolute path to the `.devmind/` directory, or null if not found.
 */
export function findDevmindDir(startDir: string = process.cwd()): string | null {
    let current = startDir;
    while (true) {
        const candidate = join(current, '.devmind');
        if (existsSync(candidate)) {
            return candidate;
        }
        const parent = dirname(current);
        if (parent === current) {
            // Reached filesystem root
            return null;
        }
        current = parent;
    }
}

/**
 * Like findDevmindDir but throws a user-friendly error if not found.
 */
export function requireDevmindDir(startDir: string = process.cwd()): string {
    const dir = findDevmindDir(startDir);
    if (!dir) {
        console.error('Error: .devmind/ not found in this directory or any parent directory.');
        console.error('Run "devmind init" first to initialize DevMind in your project.');
        process.exit(1);
    }
    return dir;
}
