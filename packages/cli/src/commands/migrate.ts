import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execSync } from 'node:child_process';
import chalk from 'chalk';
import { runInit, injectUserHooks } from './init.js';

// ─── Project detection ─────────────────────────────────────────────────────────

interface ProjectInfo {
    name: string;
    techStack: string[];
    hasReadme: boolean;
    hasOpenSpec: boolean;
    openSpecArchiveCount: number;
    openSpecActiveChanges: string[];
    gitLogLines: string[];
    isGitRepo: boolean;
}

function detectTechStack(dir: string): string[] {
    const stack: string[] = [];

    if (existsSync(join(dir, 'package.json'))) {
        try {
            const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as {
                dependencies?: Record<string, string>;
                devDependencies?: Record<string, string>;
                name?: string;
            };
            const deps = { ...pkg.dependencies, ...pkg.devDependencies };
            if (deps['react'] || deps['react-dom']) stack.push('React');
            if (deps['vue']) stack.push('Vue');
            if (deps['next']) stack.push('Next.js');
            if (deps['express']) stack.push('Express');
            if (deps['fastify']) stack.push('Fastify');
            if (deps['typescript'] || deps['ts-node']) stack.push('TypeScript');
            if (!stack.includes('TypeScript') && existsSync(join(dir, 'tsconfig.json'))) stack.push('TypeScript');
            if (!stack.length) stack.push('Node.js');
        } catch {
            stack.push('Node.js');
        }
    }
    if (existsSync(join(dir, 'go.mod'))) stack.push('Go');
    if (existsSync(join(dir, 'pyproject.toml')) || existsSync(join(dir, 'requirements.txt'))) stack.push('Python');
    if (existsSync(join(dir, 'Cargo.toml'))) stack.push('Rust');
    if (existsSync(join(dir, 'pom.xml')) || existsSync(join(dir, 'build.gradle'))) stack.push('Java');

    return stack.length ? stack : ['(unknown)'];
}

function detectOpenSpec(dir: string): { hasOpenSpec: boolean; archiveCount: number; activeChanges: string[] } {
    const openspecDir = join(dir, 'openspec');
    if (!existsSync(openspecDir)) {
        return { hasOpenSpec: false, archiveCount: 0, activeChanges: [] };
    }

    const changesDir = join(openspecDir, 'changes');
    const archiveDir = join(changesDir, 'archive');

    let archiveCount = 0;
    if (existsSync(archiveDir)) {
        archiveCount = readdirSync(archiveDir, { withFileTypes: true })
            .filter(d => d.isDirectory()).length;
    }

    const activeChanges: string[] = [];
    if (existsSync(changesDir)) {
        readdirSync(changesDir, { withFileTypes: true })
            .filter(d => d.isDirectory() && d.name !== 'archive')
            .forEach(d => activeChanges.push(d.name));
    }

    return { hasOpenSpec: true, archiveCount, activeChanges };
}

function getGitLog(dir: string): { lines: string[]; isGitRepo: boolean } {
    try {
        const output = execSync('git log --oneline -20', { cwd: dir, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
        return { lines: output.trim().split('\n').filter(Boolean), isGitRepo: true };
    } catch {
        return { lines: [], isGitRepo: false };
    }
}

function getProjectName(dir: string): string {
    // Try package.json name
    const pkgPath = join(dir, 'package.json');
    if (existsSync(pkgPath)) {
        try {
            const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { name?: string };
            if (pkg.name) return pkg.name;
        } catch { /* ignore */ }
    }
    // Fall back to directory name
    return dir.split('/').pop() ?? 'MyProject';
}

// ─── Checklist generation ──────────────────────────────────────────────────────

function buildChecklist(info: ProjectInfo): string {
    const today = new Date().toISOString().slice(0, 10);
    const lines: string[] = [];

    lines.push(`# DevMind 迁移清单`);
    lines.push(``);
    lines.push(`> 生成日期：${today}`);
    lines.push(`> 使用方法：在 Claude  Code 中输入 \`/dm:migrate\` 开始迁移`);
    lines.push(``);
    lines.push(`## 项目基本信息`);
    lines.push(``);
    lines.push(`- **项目名称**：${info.name}`);
    lines.push(`- **技术栈**：${info.techStack.join(', ')}`);
    lines.push(`- **README**：${info.hasReadme ? '存在' : '未找到'}`);
    lines.push(`- **Git 仓库**：${info.isGitRepo ? '是' : '否'}`);
    lines.push(``);

    if (info.hasOpenSpec) {
        lines.push(`## OpenSpec 检测结果`);
        lines.push(``);
        lines.push(`检测到项目使用 OpenSpec，以下内容将被转换到 DevMind 记忆系统：`);
        lines.push(``);
        lines.push(`| 来源 | 数量 | 目标 |`);
        lines.push(`|------|------|------|`);
        lines.push(`| \`openspec/changes/archive/\` | ${info.openSpecArchiveCount} 个已归档变更 | \`.devmind/memory/decisions/\` |`);
        if (info.openSpecActiveChanges.length > 0) {
            lines.push(`| \`openspec/changes/\`（进行中） | ${info.openSpecActiveChanges.length} 个 | \`.devmind/current-plan.md\` |`);
        }
        lines.push(``);
        if (info.openSpecActiveChanges.length > 0) {
            lines.push(`### 进行中的变更`);
            lines.push(``);
            info.openSpecActiveChanges.forEach(c => lines.push(`- \`${c}\``));
            lines.push(``);
            lines.push(`> /dm:migrate 将把第一个进行中的变更转换为 \`current-plan.md\`，其余的转换为 decisions。`);
            lines.push(``);
        }
    }

    if (info.isGitRepo && info.gitLogLines.length > 0) {
        lines.push(`## 最近 Git 提交（供 AI 参考）`);
        lines.push(``);
        lines.push(`\`\`\``);
        info.gitLogLines.forEach(l => lines.push(l));
        lines.push(`\`\`\``);
        lines.push(``);
    }

    lines.push(`## 迁移任务清单`);
    lines.push(``);
    lines.push(`/dm:migrate 将自动完成以下步骤：`);
    lines.push(``);
    lines.push(`- [ ] 更新 \`.devmind/config.yaml\` 中的 \`project:\` 字段`);

    if (info.hasReadme) {
        lines.push(`- [ ] 读取 README.md，提炼架构概述`);
    }
    lines.push(`- [ ] 探索代码库结构，识别核心架构决策`);
    lines.push(`- [ ] 识别开发规律，写入 \`memory/patterns/\``);

    if (info.hasOpenSpec) {
        lines.push(`- [ ] 将 OpenSpec archived changes 转换为 \`memory/decisions/\``);
        if (info.openSpecActiveChanges.length > 0) {
            lines.push(`- [ ] 将进行中的 OpenSpec change 转换为 \`current-plan.md\``);
        }
        lines.push(`- [ ] 检查未归档但被放弃的 changes，询问是否写入 \`memory/graveyard/\``);
    } else {
        lines.push(`- [ ] 检查历史中是否有被否决的技术方案，写入 \`memory/graveyard/\``);
    }

    lines.push(`- [ ] 运行 \`node .devmind/scripts/rebuild-index.js\` 重建索引`);
    lines.push(`- [ ] 输出迁移摘要`);
    lines.push(``);
    lines.push(`## 下一步`);
    lines.push(``);
    lines.push(`打开 Claude  Code，在对话框中输入：`);
    lines.push(``);
    lines.push(`\`\`\``);
    lines.push(`/dm:migrate`);
    lines.push(`\`\`\``);

    return lines.join('\n');
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export function runMigrate(targetDir: string): void {
    console.log(chalk.bold('DevMind migrate'));
    console.log('');

    // Step 1: ensure devmind is initialized
    const devmindDir = join(targetDir, '.devmind');
    if (!existsSync(devmindDir)) {
        console.log(chalk.yellow('DevMind not initialized. Running init first...'));
        console.log('');
        runInit(targetDir);
        console.log('');
    } else {
        console.log(chalk.green('✓') + ' DevMind already initialized');
        // Still ensure hooks are registered in user-level settings
        const hookResult = injectUserHooks(targetDir);
        if (hookResult.status === 'injected') {
            console.log(chalk.green('✓') + ' Hooks registered in ' + chalk.cyan('~/.claude/settings.json'));
        } else if (hookResult.status === 'error') {
            console.log(chalk.red('✗') + ' Hook injection failed: ' + hookResult.message);
        }
    }

    // Step 2: gather project info
    console.log('Scanning project...');
    const name = getProjectName(targetDir);
    const techStack = detectTechStack(targetDir);
    const { hasOpenSpec, archiveCount, activeChanges } = detectOpenSpec(targetDir);
    const { lines: gitLogLines, isGitRepo } = getGitLog(targetDir);
    const hasReadme = existsSync(join(targetDir, 'README.md')) || existsSync(join(targetDir, 'README.mdx'));

    const info: ProjectInfo = {
        name,
        techStack,
        hasReadme,
        hasOpenSpec,
        openSpecArchiveCount: archiveCount,
        openSpecActiveChanges: activeChanges,
        gitLogLines,
        isGitRepo,
    };

    // Step 3: report what was detected
    console.log('');
    console.log(chalk.bold('Detected:'));
    console.log(`  Project name : ${chalk.cyan(name)}`);
    console.log(`  Tech stack   : ${chalk.cyan(techStack.join(', '))}`);
    if (hasOpenSpec) {
        console.log(`  OpenSpec     : ${chalk.green('yes')} (${archiveCount} archived, ${activeChanges.length} active)`);
    } else {
        console.log(`  OpenSpec     : ${chalk.gray('not found')}`);
    }
    console.log(`  Git repo     : ${isGitRepo ? chalk.green('yes') : chalk.gray('no')}`);

    // Step 4: write checklist
    const checklistPath = join(devmindDir, 'migrate-checklist.md');
    const checklist = buildChecklist(info);
    writeFileSync(checklistPath, checklist, 'utf8');
    console.log('');
    console.log(chalk.green('✓') + ' Generated: ' + chalk.cyan('.devmind/migrate-checklist.md'));

    // Step 5: instructions
    console.log('');
    console.log(chalk.bold('Next steps:'));
    console.log('  1. Open Claude  Code in this directory');
    console.log('  2. Type ' + chalk.cyan('/dm:migrate') + ' to start the migration');
    console.log('');
}
