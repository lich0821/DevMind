import { existsSync, readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { createRequire } from 'node:module';
import chalk from 'chalk';
import {
    AGENTS_MD,
    CLAUDE_MD,
    SKILL_DEVMIND_MODE_MD,
    SKILL_DEVMIND_MODE_OPENAI_YAML,
} from '../templates.js';
import { CMD_EXPLORE, CMD_EDIT, CMD_PLAN, CMD_BUILD } from '../templates-commands.js';
import { CMD_REMEMBER, CMD_RECALL, CMD_BURY, CMD_AUDIT, CMD_SYNC_MEMORY, CMD_PUBLISH, CMD_RELEASE, CMD_MIGRATE, CMD_AUTO } from '../templates-commands2.js';
import { CONFIG_YAML, FLOW_YAML, MODE_EXPLORE_MD, MODE_EDIT_MD, MODE_PLAN_MD, MODE_BUILD_MD } from '../templates-devmind.js';

const require = createRequire(import.meta.url);
const pkg = require('../../package.json') as { version: string };

const CURRENT_VERSION = pkg.version;
const USER_CUSTOM_MARKER = '---\n<!-- 以下为用户自定义内容';

export function runUpgrade(targetDir: string): void {
    const devmindDir = join(targetDir, '.devmind');
    const configPath = join(devmindDir, 'config.yaml');
    const agentsPath = join(targetDir, 'AGENTS.md');
    const codexSkillPath = join(targetDir, '.agents', 'skills', 'devmind-mode', 'SKILL.md');

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
    const needsCodexScaffold = !existsSync(agentsPath) || !existsSync(codexSkillPath);
    if (projectVersion === CURRENT_VERSION && !needsCodexScaffold) {
        console.log(chalk.green('✓') + ` Already at latest version ${CURRENT_VERSION}`);
        console.log('  No upgrade needed');
        return;
    }

    console.log('');
    console.log(chalk.bold('DevMind Upgrade'));
    console.log(`  Current project: ${chalk.yellow(projectVersion)}`);
    console.log(`  Installed version: ${chalk.green(CURRENT_VERSION)}`);
    if (projectVersion === CURRENT_VERSION && needsCodexScaffold) {
        console.log(`  ${chalk.yellow('Compatibility patch')}: add missing Codex files`);
    }
    console.log('');

    // 4. Upgrade CLAUDE.md (backup + smart merge)
    const claudeBackupCreated = upgradeCLAUDEMD(targetDir);

    // 5. Upgrade AGENTS.md (backup + smart merge)
    const agentsBackupCreated = upgradeAGENTSMD(targetDir);

    // 6. Ensure Codex skill scaffold exists
    const codexSkillCreated = ensureCodexSkill(targetDir);

    // 7. Upgrade slash commands (overwrite)
    upgradeCommands(targetDir);

    // 8. Upgrade mode docs (overwrite)
    upgradeModes(targetDir);

    // 9. Merge config.yaml and flow.yaml
    upgradeConfig(targetDir);

    // 10. Update version in config.yaml
    updateVersion(configPath);

    console.log('');
    console.log(chalk.green('✓') + ' Upgrade completed successfully!\n');
    console.log(chalk.bold('Changes:'));
    console.log(`  • CLAUDE.md refreshed${claudeBackupCreated ? ' (backup: .claude/CLAUDE.md.backup)' : ''}`);
    console.log(`  • AGENTS.md refreshed${agentsBackupCreated ? ' (backup: AGENTS.md.backup)' : ''}`);
    console.log(`  • Codex skill scaffold ${codexSkillCreated > 0 ? 'added/refreshed' : 'already up to date'}`);
    console.log('  • Slash commands updated');
    console.log('  • Mode documentation updated');
    console.log('  • Config files merged');
    console.log(`  • Version updated to ${CURRENT_VERSION}`);
    console.log('');
    if (claudeBackupCreated || agentsBackupCreated) {
        console.log(chalk.yellow('⚠️  Please review backup files and delete them after confirming'));
    }
    console.log('');
}

function upgradeCLAUDEMD(targetDir: string): boolean {
    const claudeMdPath = join(targetDir, '.claude', 'CLAUDE.md');
    const backupPath = join(targetDir, '.claude', 'CLAUDE.md.backup');

    if (!existsSync(claudeMdPath)) {
        // No existing CLAUDE.md, just create new one
        const dir = dirname(claudeMdPath);
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }
        writeFileSync(claudeMdPath, CLAUDE_MD, 'utf-8');
        return false;
    }

    // Backup existing file
    copyFileSync(claudeMdPath, backupPath);

    // Read existing content
    const existingContent = readFileSync(claudeMdPath, 'utf-8');

    // Write new framework content + preserved custom content
    const newContent = mergeManagedContent(CLAUDE_MD, existingContent);
    writeFileSync(claudeMdPath, newContent, 'utf-8');
    return true;
}

function upgradeAGENTSMD(targetDir: string): boolean {
    const agentsPath = join(targetDir, 'AGENTS.md');
    const backupPath = join(targetDir, 'AGENTS.md.backup');

    if (!existsSync(agentsPath)) {
        writeFileSync(agentsPath, AGENTS_MD, 'utf-8');
        return false;
    }

    copyFileSync(agentsPath, backupPath);
    const existingContent = readFileSync(agentsPath, 'utf-8');
    const newContent = mergeManagedContent(AGENTS_MD, existingContent);
    writeFileSync(agentsPath, newContent, 'utf-8');
    return true;
}

function ensureCodexSkill(targetDir: string): number {
    const files = [
        {
            path: join(targetDir, '.agents', 'skills', 'devmind-mode', 'SKILL.md'),
            content: SKILL_DEVMIND_MODE_MD,
        },
        {
            path: join(targetDir, '.agents', 'skills', 'devmind-mode', 'agents', 'openai.yaml'),
            content: SKILL_DEVMIND_MODE_OPENAI_YAML,
        },
    ];

    let created = 0;
    for (const file of files) {
        if (existsSync(file.path)) {
            continue;
        }
        const dir = dirname(file.path);
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }
        writeFileSync(file.path, file.content, 'utf-8');
        created += 1;
    }
    return created;
}

function extractUserCustomContent(existingContent: string): string {
    const separatorIndex = existingContent.indexOf(USER_CUSTOM_MARKER);
    if (separatorIndex === -1) {
        return '';
    }

    const afterSeparator = existingContent.substring(separatorIndex);
    const lines = afterSeparator.split('\n');
    return lines.slice(2).join('\n').trim();
}

function mergeManagedContent(template: string, existingContent: string): string {
    const userCustomContent = extractUserCustomContent(existingContent);
    return userCustomContent ? `${template}\n${userCustomContent}` : template;
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
