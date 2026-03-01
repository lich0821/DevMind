import { Command } from 'commander';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { runInit } from './commands/init.js';
import { runStatus } from './commands/status.js';
import { runRecall } from './commands/recall.js';
import { runAudit } from './commands/audit.js';
import { runMigrate } from './commands/migrate.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json') as { version: string; description: string };

const program = new Command();

program
    .name('devmind')
    .description(pkg.description)
    .version(pkg.version);

program
    .command('init [path]')
    .description('Initialize DevMind in a project directory')
    .option('--upgrade', 'Upgrade existing DevMind project to latest version')
    .action((path?: string, opts?: { upgrade?: boolean }) => {
        const targetDir = resolve(path ?? '.');
        runInit(targetDir, opts?.upgrade ?? false);
    });

program
    .command('migrate [path]')
    .description('Migrate an existing project to DevMind (supports plain projects and OpenSpec)')
    .action((path?: string) => {
        const targetDir = resolve(path ?? '.');
        runMigrate(targetDir);
    });

program
    .command('status')
    .description('Show current mode, active plan, and session checkpoints')
    .action(() => {
        runStatus();
    });

program
    .command('recall <keyword>')
    .description('Search memory (decisions, patterns, graveyard) for a keyword')
    .action((keyword: string) => {
        runRecall(keyword);
    });

program
    .command('audit')
    .description('Show file modification audit log')
    .option('-l, --last <n>', 'Number of recent entries to show', '20')
    .option('-p, --plan <name>', 'Filter by plan name')
    .option('-m, --mode <mode>', 'Filter by mode (explore/plan/build/edit)')
    .action((opts: { last?: string; plan?: string; mode?: string }) => {
        runAudit({
            last: opts.last ? parseInt(opts.last, 10) : undefined,
            plan: opts.plan,
            mode: opts.mode,
        });
    });

program.parse();
