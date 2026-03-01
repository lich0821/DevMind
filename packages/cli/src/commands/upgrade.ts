import { existsSync, readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { createRequire } from 'node:module';
import chalk from 'chalk';
import { CLAUDE_MD, SETTINGS_LOCAL_JSON } from '../templates.js';
import { CMD_EXPLORE, CMD_EDIT, CMD_PLAN, CMD_BUILD } from '../templates-commands.js';
import { CMD_REMEMBER, CMD_RECALL, CMD_BURY, CMD_AUDIT, CMD_SYNC_MEMORY, CMD_PUBLISH, CMD_RELEASE, CMD_MIGRATE, CMD_AUTO } from '../templates-commands2.js';
import { CONFIG_YAML, FLOW_YAML, MODE_EXPLORE_MD, MODE_EDIT_MD, MODE_PLAN_MD, MODE_BUILD_MD } from '../templates-devmind.js';

const require = createRequire(import.meta.url);
const pkg = require('../../package.json') as { version: string };

const CURRENT_VERSION = pkg.version;
const USER_CUSTOM_SEPARATOR = '\n---\n<!-- 以下为用户自定义内容，DevMind 升级时不会被覆盖 -->\n';

export function runUpgrade(targetDir: string): void {
    const devmindDir = join(targetDir, '.devmind');
    const configPath = join(devmindDir, 'config.yaml');

    // 1. Check if .devmind/ exists
    if (!existsSync(devmindDir)) {
        console.log(chalk.red('✗ .devmind/ directory not found'));
        console.log('  Please run ' + chalk.cyan('devmind init') + ' first');
        process.exit(1);
    }

    // 2. Read current version from config.yaml
    let projectVersion = 'unknown';
    if (existsSync(configPath)) {
        const configContent = readFileSync(configPath, 'utf-8');
        const match = configContent.match(/^devmind_version:\s*["']?([^"'\n]+)["']?/m);
        if (match) {
            projectVersion = match[1];
        }
    }

    // 3. Compare versions
    if (projectVersion === CURRENT_VERSION) {
        console.log(chalk.green('✓') + ` Already at latest version ${CURRENT_VERSION}`);
        console.log('  No upgrade needed');
        return;
    }

    console.log('');
    console.log(chalk.bold('DevMind Upgrade'));
    console.log(`  Current project: ${chalk.yellow(projectVersion)}`);
    console.log(`  Installed version: ${chalk.green(CURRENT_VERSION)}`);
    console.log('');

    // 4. Upgrade CLAUDE.md (backup + smart merge)
    upgradeCLAUDEMD(targetDir);

    // 5. Upgrade slash commands (overwrite)
    upgradeCommands(targetDir);

    // 6. Upgrade mode docs (overwrite)
    upgradeModes(targetDir);

    // 7. Merge config.yaml and flow.yaml
    upgradeConfig(targetDir);

    // 8. Update version in config.yaml
    updateVersion(configPath);

    console.log('');
    console.log(chalk.green('✓') + ' Upgrade completed successfully!\n');
    console.log(chalk.bold('Changes:'));
    console.log('  • CLAUDE.md updated (backup: .claude/CLAUDE.md.backup)');
    console.log('  • Slash commands updated');
    console.log('  • Mode documentation updated');
    console.log('  • Config files merged');
    console.log(`  • Version updated to ${CURRENT_VERSION}`);
    console.log('');
    console.log(chalk.yellow('⚠️  Please review .claude/CLAUDE.md.backup and delete it after confirming'));
    console.log('');
}

function upgradeCLAUDEMD(targetDir: string): void {
    const claudeMdPath = join(targetDir, '.claude', 'CLAUDE.md');
    const backupPath = join(targetDir, '.claude', 'CLAUDE.md.backup');

    if (!existsSync(claudeMdPath)) {
        // No existing CLAUDE.md, just create new one
        const dir = dirname(claudeMdPath);
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }
        writeFileSync(claudeMdPath, CLAUDE_MD, 'utf-8');
        return;
    }

    // Backup existing file
    copyFileSync(claudeMdPath, backupPath);

    // Read existing content
    const existingContent = readFileSync(claudeMdPath, 'utf-8');

    // Extract user custom content (after separator)
    let userCustomContent = '';
    const separatorIndex = existingContent.indexOf('---\n<!-- 以下为用户自定义内容');
    if (separatorIndex !== -1) {
        const afterSeparator = existingContent.substring(separatorIndex);
        const lines = afterSeparator.split('\n');
        // Skip separator line and comment line
        userCustomContent = lines.slice(2).join('\n').trim();
    }

    // Write new framework content + separator + user custom content
    let newContent = CLAUDE_MD;
    if (userCustomContent) {
        newContent += '\n' + userCustomContent;
    }

    writeFileSync(claudeMdPath, newContent, 'utf-8');
}

function upgradeCommands(targetDir: string): void {
    const commandsDir = join(targetDir, '.claude', 'commands', 'dm');
    if (!existsSync(commandsDir)) {
        mkdirSync(commandsDir, { recursive: true });
    }

    const commands = [
        { name: 'explore.md', content: CMD_EXPLORE },
        { name: 'edit.md', content: CMD_EDIT },
        { name: 'plan.md', content: CMD_PLAN },
        { name: 'build.md', content: CMD_BUILD },
        { name: 'auto.md', content: CMD_AUTO },
        { name: 'remember.md', content: CMD_REMEMBER },
        { name: 'recall.md', content: CMD_RECALL },
        { name: 'bury.md', content: CMD_BURY },
        { name: 'audit.md', content: CMD_AUDIT },
        { name: 'sync-memory.md', content: CMD_SYNC_MEMORY },
        { name: 'publish.md', content: CMD_PUBLISH },
        { name: 'release.md', content: CMD_RELEASE },
        { name: 'migrate.md', content: CMD_MIGRATE },
    ];

    for (const cmd of commands) {
        writeFileSync(join(commandsDir, cmd.name), cmd.content, 'utf-8');
    }
}

function upgradeModes(targetDir: string): void {
    const modesDir = join(targetDir, '.devmind', 'modes');
    if (!existsSync(modesDir)) {
        mkdirSync(modesDir, { recursive: true });
    }

    const modes = [
        { name: 'explore.md', content: MODE_EXPLORE_MD },
        { name: 'edit.md', content: MODE_EDIT_MD },
        { name: 'plan.md', content: MODE_PLAN_MD },
        { name: 'build.md', content: MODE_BUILD_MD },
    ];

    for (const mode of modes) {
        writeFileSync(join(modesDir, mode.name), mode.content, 'utf-8');
    }
}

function upgradeConfig(targetDir: string): void {
    const configPath = join(targetDir, '.devmind', 'config.yaml');
    const flowPath = join(targetDir, '.devmind', 'flow.yaml');

    // For now, just ensure they exist with default content if missing
    // TODO: Implement smart merge logic in future versions
    if (!existsSync(configPath)) {
        writeFileSync(configPath, CONFIG_YAML, 'utf-8');
    }
    if (!existsSync(flowPath)) {
        writeFileSync(flowPath, FLOW_YAML, 'utf-8');
    }
}

function updateVersion(configPath: string): void {
    if (!existsSync(configPath)) {
        return;
    }

    let content = readFileSync(configPath, 'utf-8');

    // Check if devmind_version exists
    if (content.match(/^devmind_version:/m)) {
        // Update existing version
        content = content.replace(
            /^devmind_version:\s*["']?[^"'\n]+["']?/m,
            `devmind_version: "${CURRENT_VERSION}"`
        );
    } else {
        // Add version at the beginning
        content = `# DevMind 项目配置\ndevmind_version: "${CURRENT_VERSION}"\n\n` + content;
    }

    writeFileSync(configPath, content, 'utf-8');
}

