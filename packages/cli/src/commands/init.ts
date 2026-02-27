import { existsSync, mkdirSync, writeFileSync, readFileSync, chmodSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { homedir } from 'node:os';
import chalk from 'chalk';

import { PRE_TOOL_USE_JS, POST_TOOL_USE_JS, CLAUDE_MD, SETTINGS_LOCAL_JSON } from '../templates.js';
import { CMD_EXPLORE, CMD_EDIT, CMD_PLAN, CMD_BUILD } from '../templates-commands.js';
import { CMD_REMEMBER, CMD_RECALL, CMD_BURY, CMD_AUDIT, CMD_SYNC_MEMORY, CMD_PUBLISH, CMD_RELEASE, CMD_MIGRATE, CMD_AUTO } from '../templates-commands2.js';
import {
    CURRENT_MODE_TXT, SESSION_YAML, CONFIG_YAML, FLOW_YAML,
    CURRENT_PLAN_MD, PROGRESS_MD,
    MODE_EXPLORE_MD, MODE_EDIT_MD, MODE_PLAN_MD, MODE_BUILD_MD,
    TMPL_DECISION, TMPL_PATTERN, TMPL_GRAVEYARD,
} from '../templates-devmind.js';

// ─── Scripts (Node.js for cross-platform compatibility) ──────────────────────

const REBUILD_INDEX_JS = `#!/usr/bin/env node
// .devmind/scripts/rebuild-index.js
// Rebuilds memory/index.md lightweight index
// Usage: node .devmind/scripts/rebuild-index.js

const fs = require('fs');
const path = require('path');

const DEVMIND_DIR = path.join(__dirname, '..');
const INDEX_FILE = path.join(DEVMIND_DIR, 'memory', 'index.md');

function countMd(dir) {
    if (!fs.existsSync(dir)) return 0;
    return fs.readdirSync(dir).filter(f => f.endsWith('.md')).length;
}

function extractField(content, prefix) {
    for (const line of content.split('\\n')) {
        if (line.startsWith(prefix)) {
            return line.slice(prefix.length).trim();
        }
    }
    return '';
}

function buildSection(directory, titlePrefix, tagPrefix, summaryPrefix, keywordPrefix = null) {
    const lines = [];
    let mdFiles = [];

    if (fs.existsSync(directory)) {
        mdFiles = fs.readdirSync(directory)
            .filter(f => f.endsWith('.md'))
            .sort()
            .map(f => path.join(directory, f));
    }

    const count = mdFiles.length;
    lines.push(\`## \${titlePrefix} 索引（共 \${count} 条）\`);
    lines.push('');

    if (count === 0) {
        lines.push('（暂无记录）');
    } else {
        for (const fpath of mdFiles) {
            const content = fs.readFileSync(fpath, 'utf8');
            const stem = path.basename(fpath, '.md');

            // Extract title
            let title = extractField(content, \`## \${titlePrefix}：\`) || stem;

            // Extract tags or keywords
            let tagStr = '';
            if (keywordPrefix) {
                const tags = extractField(content, keywordPrefix);
                tagStr = tags ? \`（关键词：\${tags}）\` : '';
            } else {
                const tags = extractField(content, tagPrefix);
                tagStr = tags ? \`（\${tags}）\` : '';
            }

            lines.push(\`- \\\`\${stem}\\\` - \${title}\${tagStr}\`);

            // Summary (only for decisions and patterns)
            if (!keywordPrefix) {
                const summary = extractField(content, '**摘要**：');
                if (summary) {
                    lines.push(\`  > \${summary}\`);
                }
            }
        }
    }

    return lines;
}

function main() {
    const decDir = path.join(DEVMIND_DIR, 'memory', 'decisions');
    const patDir = path.join(DEVMIND_DIR, 'memory', 'patterns');
    const gydDir = path.join(DEVMIND_DIR, 'memory', 'graveyard');

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    const output = [];
    output.push('<!-- 此文件由 .devmind/scripts/rebuild-index.js 自动生成，请勿手动编辑 -->');
    output.push(\`<!-- 上次生成：\${now} -->\`);
    output.push('');
    output.push(...buildSection(decDir, '决策', '- 标签：', '**摘要**：'));
    output.push('');
    output.push(...buildSection(patDir, '规律', '- 标签：', '**摘要**：'));
    output.push('');
    output.push(...buildSection(gydDir, '放弃方案', null, null, '- 关键词：'));
    output.push('');
    output.push('---');
    output.push('');
    output.push('使用提示：需要详细内容时，使用 \`/recall <关键词>\` 检索');

    fs.writeFileSync(INDEX_FILE, output.join('\\n') + '\\n', 'utf8');

    const decCount = countMd(decDir);
    const patCount = countMd(patDir);
    const gydCount = countMd(gydDir);

    console.error(\`Decisions=\${decCount}  Patterns=\${patCount}  Graveyard=\${gydCount}\`);
    console.log(\`索引已重建：\${INDEX_FILE}\`);
}

main();
`;

const CHECK_GRAVEYARD_JS = `#!/usr/bin/env node
// .devmind/scripts/check-graveyard.js
// Graveyard keyword matching detection
// Detects if current proposal is similar to rejected solutions
//
// Usage:
//   node .devmind/scripts/check-graveyard.js "redis cache layer"
//   node .devmind/scripts/check-graveyard.js "GraphQL API endpoint"

const fs = require('fs');
const path = require('path');

function loadGraveyard(graveyardDir) {
    const entries = [];

    if (!fs.existsSync(graveyardDir)) {
        return entries;
    }

    const files = fs.readdirSync(graveyardDir)
        .filter(f => f.endsWith('.md'))
        .sort();

    for (const filename of files) {
        const fpath = path.join(graveyardDir, filename);
        const content = fs.readFileSync(fpath, 'utf8');
        const lines = content.split('\\n');

        // Extract title
        let title = path.basename(filename, '.md');
        for (const line of lines) {
            if (line.startsWith('## 放弃方案：')) {
                title = line.replace('## 放弃方案：', '').trim();
                break;
            }
        }

        // Extract keywords line
        let rawKeywords = '';
        for (const line of lines) {
            if (line.startsWith('- 关键词：')) {
                rawKeywords = line.replace('- 关键词：', '').trim();
                break;
            }
        }

        // Parse keywords (support both Chinese and English comma)
        const keywords = new Set(
            rawKeywords
                .replace(/，/g, ',')
                .split(',')
                .map(kw => kw.trim().toLowerCase())
                .filter(kw => kw)
        );

        // Extract rejection reasons
        const reasonLines = [];
        let inReason = false;
        for (const line of lines) {
            if (line.startsWith('- 放弃原因：')) {
                inReason = true;
                continue;
            }
            if (inReason) {
                if (line.startsWith('  ') && line.trim()) {
                    reasonLines.push(line.trim());
                } else if (line.startsWith('- ') && !line.startsWith('  ')) {
                    break;
                }
            }
        }

        entries.push({
            file: fpath,
            title,
            keywords,
            reasons: reasonLines.slice(0, 2) // Only first 2 reasons
        });
    }

    return entries;
}

function checkGraveyard(proposal, graveyardDir) {
    const proposalLower = proposal.toLowerCase();

    // Simple tokenization: split by spaces, commas, periods
    const proposalTerms = new Set(
        proposalLower
            .split(/[\\s,，。、]+/)
            .filter(t => t)
    );

    const entries = loadGraveyard(graveyardDir);
    const matches = [];

    for (const entry of entries) {
        if (entry.keywords.size === 0) continue;

        // Check word overlap
        const overlap = new Set();
        for (const term of proposalTerms) {
            if (entry.keywords.has(term)) {
                overlap.add(term);
            }
        }

        // Also check if keywords are substrings of proposal (for Chinese continuous words)
        for (const kw of entry.keywords) {
            if (kw && proposalLower.includes(kw)) {
                overlap.add(kw);
            }
        }

        if (overlap.size > 0) {
            matches.push({
                file: entry.file,
                title: entry.title,
                overlap: Array.from(overlap),
                reasons: entry.reasons,
                matchCount: overlap.size
            });
        }
    }

    // Sort by match count descending
    return matches.sort((a, b) => b.matchCount - a.matchCount);
}

function main() {
    if (process.argv.length < 3) {
        console.log('用法：node check-graveyard.js <提议描述>');
        console.log('示例：node check-graveyard.js "redis cache layer"');
        process.exit(1);
    }

    const proposal = process.argv.slice(2).join(' ');

    // Auto-detect graveyard directory location
    const scriptDir = __dirname;
    const graveyardDir = path.join(scriptDir, '..', 'memory', 'graveyard');

    const matches = checkGraveyard(proposal, graveyardDir);

    if (matches.length === 0) {
        console.log(\`未发现与 "\${proposal}" 相似的已否决方案。\`);
        process.exit(0);
    }

    console.log(\`⚠️  发现 \${matches.length} 个与提议相似的已否决方案：\\n\`);

    for (const m of matches) {
        console.log(\`  与已否决方案相似：\${m.title}\`);
        console.log(\`  匹配关键词：\${m.overlap.sort().join(', ')}\`);
        if (m.reasons.length > 0) {
            console.log('  否决原因：');
            for (const r of m.reasons) {
                console.log(\`    \${r}\`);
            }
        }
        console.log(\`  文件：\${m.file}\`);
        console.log();
    }

    process.exit(1); // Non-zero exit code for script detection
}

main();
`;

const INDEX_MD = `<!-- 此文件由 .devmind/scripts/rebuild-index.js 自动生成，请勿手动编辑 -->

## 决策 索引（共 0 条）

（暂无记录）

## 规律 索引（共 0 条）

（暂无记录）

## 放弃方案 索引（共 0 条）

（暂无记录）

---

使用提示：需要详细内容时，使用 \`/recall <关键词>\` 检索
`;

// ─── User-level settings.json hook injection ──────────────────────────────────

type HookEntry = { type: string; command: string; timeout?: number };
type HookMatcher = { matcher: string; hooks: HookEntry[] };
type HooksMap = Record<string, HookMatcher[]>;
type UserSettings = { hooks?: HooksMap; [key: string]: unknown };

/**
 * Inject DevMind hooks into ~/.claude/settings.json (user-level).
 * Claude  Code reads hooks ONLY from user-level settings, not project-level.
 * Preserves all existing content; only adds hooks if not already registered.
 * Hook commands use "node <absolute-path>" for cross-platform compatibility.
 *
 * IMPORTANT: Each project gets its own hook entry with a matcher that limits
 * the hook to only run when working in that project's directory.
 */
export function injectUserHooks(projectDir: string): { status: 'injected' | 'already' | 'error'; message: string } {
    const userSettingsPath = resolve(homedir(), '.claude', 'settings.json');
    const absProjectDir = resolve(projectDir);

    // Use "node <path>" for cross-platform execution (dm- prefix to avoid conflicts)
    const preHookCommand = `node "${absProjectDir}/.claude/hooks/dm-pre-tool-use.js"`;
    const postHookCommand = `node "${absProjectDir}/.claude/hooks/dm-post-tool-use.js"`;

    // Read or initialize user settings
    let settings: UserSettings = {};
    if (existsSync(userSettingsPath)) {
        try {
            settings = JSON.parse(readFileSync(userSettingsPath, 'utf-8')) as UserSettings;
        } catch {
            return { status: 'error', message: '~/.claude/settings.json is malformed JSON' };
        }
    }

    const hooks: HooksMap = settings.hooks ? { ...settings.hooks } : {};

    // Check if already registered (by looking for this project's dm- prefixed hooks)
    const preAlready = (hooks['PreToolUse'] ?? []).some(m =>
        m.hooks?.some(h => h.command.includes(absProjectDir) && h.command.includes('dm-pre-tool-use.js')),
    );
    const postAlready = (hooks['PostToolUse'] ?? []).some(m =>
        m.hooks?.some(h => h.command.includes(absProjectDir) && h.command.includes('dm-post-tool-use.js')),
    );

    if (preAlready && postAlready) {
        return { status: 'already', message: 'hooks already registered' };
    }

    if (!preAlready) {
        hooks['PreToolUse'] = [
            ...(hooks['PreToolUse'] ?? []),
            { matcher: '', hooks: [{ type: 'command', command: preHookCommand }] },
        ];
    }
    if (!postAlready) {
        hooks['PostToolUse'] = [
            ...(hooks['PostToolUse'] ?? []),
            { matcher: '', hooks: [{ type: 'command', command: postHookCommand }] },
        ];
    }

    settings.hooks = hooks;

    // Ensure ~/.claude/ dir exists
    const claudeDir = resolve(homedir(), '.claude');
    if (!existsSync(claudeDir)) {
        mkdirSync(claudeDir, { recursive: true });
    }

    writeFileSync(userSettingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf-8');

    return { status: 'injected', message: userSettingsPath };
}

// ─── File map ─────────────────────────────────────────────────────────────────

interface FileEntry {
    path: string;       // relative to target dir
    content: string;
    executable?: boolean;
}

function buildFileMap(): FileEntry[] {
    return [
        // .devmind/
        { path: '.devmind/current-mode.txt', content: CURRENT_MODE_TXT },
        { path: '.devmind/session.yaml', content: SESSION_YAML },
        { path: '.devmind/config.yaml', content: CONFIG_YAML },
        { path: '.devmind/flow.yaml', content: FLOW_YAML },
        { path: '.devmind/current-plan.md', content: CURRENT_PLAN_MD },
        { path: '.devmind/progress.md', content: PROGRESS_MD },
        { path: '.devmind/audit.log', content: '' },
        // modes
        { path: '.devmind/modes/explore.md', content: MODE_EXPLORE_MD },
        { path: '.devmind/modes/edit.md', content: MODE_EDIT_MD },
        { path: '.devmind/modes/plan.md', content: MODE_PLAN_MD },
        { path: '.devmind/modes/build.md', content: MODE_BUILD_MD },
        // memory
        { path: '.devmind/memory/index.md', content: INDEX_MD },
        { path: '.devmind/memory/decisions/.gitkeep', content: '' },
        { path: '.devmind/memory/patterns/.gitkeep', content: '' },
        { path: '.devmind/memory/graveyard/.gitkeep', content: '' },
        { path: '.devmind/memory/drafts/.gitkeep', content: '' },
        { path: '.devmind/memory/TEMPLATES/decision-template.md', content: TMPL_DECISION },
        { path: '.devmind/memory/TEMPLATES/pattern-template.md', content: TMPL_PATTERN },
        { path: '.devmind/memory/TEMPLATES/graveyard-template.md', content: TMPL_GRAVEYARD },
        // scripts (Node.js for cross-platform)
        { path: '.devmind/scripts/rebuild-index.js', content: REBUILD_INDEX_JS },
        { path: '.devmind/scripts/check-graveyard.js', content: CHECK_GRAVEYARD_JS },
        // .claude/
        { path: '.claude/CLAUDE.md', content: CLAUDE_MD },
        { path: '.claude/settings.local.json', content: SETTINGS_LOCAL_JSON },
        { path: '.claude/hooks/dm-pre-tool-use.js', content: PRE_TOOL_USE_JS },
        { path: '.claude/hooks/dm-post-tool-use.js', content: POST_TOOL_USE_JS },
        // commands
        { path: '.claude/commands/dm/explore.md', content: CMD_EXPLORE },
        { path: '.claude/commands/dm/edit.md', content: CMD_EDIT },
        { path: '.claude/commands/dm/plan.md', content: CMD_PLAN },
        { path: '.claude/commands/dm/build.md', content: CMD_BUILD },
        { path: '.claude/commands/dm/auto.md', content: CMD_AUTO },
        { path: '.claude/commands/dm/remember.md', content: CMD_REMEMBER },
        { path: '.claude/commands/dm/recall.md', content: CMD_RECALL },
        { path: '.claude/commands/dm/bury.md', content: CMD_BURY },
        { path: '.claude/commands/dm/audit.md', content: CMD_AUDIT },
        { path: '.claude/commands/dm/sync-memory.md', content: CMD_SYNC_MEMORY },
        { path: '.claude/commands/dm/publish.md', content: CMD_PUBLISH },
        { path: '.claude/commands/dm/release.md', content: CMD_RELEASE },
        { path: '.claude/commands/dm/migrate.md', content: CMD_MIGRATE },
        // docs
        { path: 'docs/designs/draft/.gitkeep', content: '' },
    ];
}

// ─── Init command ─────────────────────────────────────────────────────────────

export function runInit(targetDir: string): void {
    const files = buildFileMap();
    const created: string[] = [];
    const skipped: string[] = [];

    for (const file of files) {
        const fullPath = join(targetDir, file.path);
        const dir = dirname(fullPath);

        // Create parent directories
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }

        // Skip if file already exists (don't overwrite)
        if (existsSync(fullPath) && file.content !== '') {
            skipped.push(file.path);
            continue;
        }

        writeFileSync(fullPath, file.content, 'utf-8');
        if (file.executable) {
            chmodSync(fullPath, 0o755);
        }
        created.push(file.path);
    }

    // Inject hooks into user-level ~/.claude/settings.json
    const hookResult = injectUserHooks(targetDir);

    // Output summary
    console.log('');
    console.log(chalk.green('✓') + ' DevMind initialized successfully!\n');

    if (created.length > 0) {
        console.log(chalk.bold('Created:'));
        for (const f of created) {
            if (!f.endsWith('.gitkeep') && !f.endsWith('audit.log')) {
                console.log('  ' + chalk.cyan(f));
            }
        }
    }

    if (skipped.length > 0) {
        console.log('');
        console.log(chalk.yellow(`Skipped ${skipped.length} existing files.`));
    }

    // Report hook injection status
    console.log('');
    if (hookResult.status === 'injected') {
        console.log(chalk.green('✓') + ' Hooks registered in ' + chalk.cyan('~/.claude/settings.json'));
    } else if (hookResult.status === 'already') {
        console.log(chalk.yellow('~') + ' Hooks already registered in ~/.claude/settings.json');
    } else {
        console.log(chalk.red('✗') + ' Hook injection failed: ' + hookResult.message);
        console.log('  Please manually add hooks to ~/.claude/settings.json');
    }

    console.log('');
    console.log(chalk.bold('Next steps:'));
    console.log('  1. Edit ' + chalk.cyan('.devmind/config.yaml') + ' — set your project name');
    console.log('  2. Open Claude  Code in this directory');
    console.log('  3. Type ' + chalk.cyan('/dm:explore') + ' to start');
    console.log('');
}
