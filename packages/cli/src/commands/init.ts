import { existsSync, mkdirSync, writeFileSync, readFileSync, chmodSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';
import chalk from 'chalk';

import { PRE_TOOL_USE_SH, POST_TOOL_USE_SH, CLAUDE_MD, SETTINGS_LOCAL_JSON } from '../templates.js';
import { CMD_EXPLORE, CMD_EDIT, CMD_PLAN, CMD_BUILD } from '../templates-commands.js';
import { CMD_REMEMBER, CMD_RECALL, CMD_BURY, CMD_AUDIT, CMD_SYNC_MEMORY, CMD_PUBLISH, CMD_RELEASE, CMD_MIGRATE } from '../templates-commands2.js';
import {
    CURRENT_MODE_TXT, SESSION_YAML, CONFIG_YAML, FLOW_YAML,
    CURRENT_PLAN_MD, PROGRESS_MD,
    MODE_EXPLORE_MD, MODE_EDIT_MD, MODE_PLAN_MD, MODE_BUILD_MD,
    TMPL_DECISION, TMPL_PATTERN, TMPL_GRAVEYARD,
} from '../templates-devmind.js';

// ─── Rebuild-index script (kept here to avoid another template file) ──────────

const REBUILD_INDEX_SH = `#!/bin/bash
# .devmind/scripts/rebuild-index.sh
set -e
DEVMIND_DIR="$(cd "$(dirname "$0")/.." && pwd)"
INDEX_FILE="$DEVMIND_DIR/memory/index.md"

python3 - "$DEVMIND_DIR" "$INDEX_FILE" << 'PYEOF'
import sys
from pathlib import Path
from datetime import datetime

devmind_dir = Path(sys.argv[1])
index_file = Path(sys.argv[2])

def count_md(d):
    return len(list(d.glob("*.md"))) if d.exists() else 0

def extract_field(content, prefix):
    for line in content.splitlines():
        if line.startswith(prefix):
            return line[len(prefix):].strip()
    return ""

def build_section(directory, title_prefix, tag_prefix, summary_prefix, keyword_prefix=None):
    lines = []
    md_files = sorted(directory.glob("*.md")) if directory.exists() else []
    count = len(md_files)
    lines.append(f"## {title_prefix} 索引（共 {count} 条）")
    lines.append("")
    if count == 0:
        lines.append("（暂无记录）")
    else:
        for fpath in md_files:
            content = fpath.read_text(encoding="utf-8")
            title = extract_field(content, f"## {title_prefix}：") or fpath.stem
            if keyword_prefix:
                tags = extract_field(content, keyword_prefix)
                tag_str = f"（关键词：{tags}）" if tags else ""
            else:
                tags = extract_field(content, tag_prefix)
                tag_str = f"（{tags}）" if tags else ""
            lines.append(f"- \`{fpath.stem}\` - {title}{tag_str}")
            if not keyword_prefix:
                summary = extract_field(content, "**摘要**：")
                if summary:
                    lines.append(f"  > {summary}")
    return lines

dec_dir = devmind_dir / "memory" / "decisions"
pat_dir = devmind_dir / "memory" / "patterns"
gyd_dir = devmind_dir / "memory" / "graveyard"

output = []
output.append("<!-- 此文件由 .devmind/scripts/rebuild-index.sh 自动生成，请勿手动编辑 -->")
output.append(f"<!-- 上次生成：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')} -->")
output.append("")
output.extend(build_section(dec_dir, "决策", "- 标签：", "**摘要**："))
output.append("")
output.extend(build_section(pat_dir, "规律", "- 标签：", "**摘要**："))
output.append("")
output.extend(build_section(gyd_dir, "放弃方案", None, None, keyword_prefix="- 关键词："))
output.append("")
output.append("---")
output.append("")
output.append("使用提示：需要详细内容时，使用 \`/recall <关键词>\` 检索")

index_file.write_text("\\n".join(output) + "\\n", encoding="utf-8")

dec_count = count_md(dec_dir)
pat_count = count_md(pat_dir)
gyd_count = count_md(gyd_dir)
print(f"Decisions={dec_count}  Patterns={pat_count}  Graveyard={gyd_count}", file=sys.stderr)
PYEOF

echo "索引已重建：$INDEX_FILE"
`;

const CHECK_GRAVEYARD_PY = `#!/usr/bin/env python3
"""check-graveyard.py — Graveyard 关键词匹配检测
用法：python3 .devmind/scripts/check-graveyard.py "redis cache layer"
"""
import sys, re
from pathlib import Path

def load_graveyard(graveyard_dir):
    entries = []
    gdir = Path(graveyard_dir)
    if not gdir.exists():
        return entries
    for fpath in sorted(gdir.glob("*.md")):
        content = fpath.read_text(encoding="utf-8")
        lines = content.splitlines()
        title = next((l.replace("## 放弃方案：", "").strip() for l in lines if l.startswith("## 放弃方案：")), fpath.stem)
        kw_line = next((l for l in lines if l.startswith("- 关键词：")), "")
        raw = kw_line.replace("- 关键词：", "").strip()
        keywords = set(kw.strip().lower() for kw in raw.replace("，", ",").split(",") if kw.strip())
        entries.append({"file": str(fpath), "title": title, "keywords": keywords})
    return entries

def main():
    if len(sys.argv) < 2:
        print("用法：python3 check-graveyard.py <提议描述>")
        sys.exit(1)
    proposal = " ".join(sys.argv[1:]).lower()
    script_dir = Path(__file__).parent
    graveyard_dir = script_dir.parent / "memory" / "graveyard"
    matches = []
    for entry in load_graveyard(str(graveyard_dir)):
        overlap = {kw for kw in entry["keywords"] if kw in proposal}
        if overlap:
            matches.append({"title": entry["title"], "overlap": overlap})
    if not matches:
        print(f'未发现与 "{proposal}" 相似的已否决方案。')
        sys.exit(0)
    print(f'⚠️  发现 {len(matches)} 个与提议相似的已否决方案：')
    for m in matches:
        print(f'  {m["title"]}  关键词：{", ".join(sorted(m["overlap"]))}')
    sys.exit(1)

if __name__ == "__main__":
    main()
`;

const INDEX_MD = `<!-- 此文件由 .devmind/scripts/rebuild-index.sh 自动生成，请勿手动编辑 -->

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
 * Hook commands use absolute paths so they work from any project directory.
 */
export function injectUserHooks(projectDir: string): { status: 'injected' | 'already' | 'error'; message: string } {
    const userSettingsPath = resolve(homedir(), '.claude', 'settings.json');
    const absProjectDir = resolve(projectDir);

    const preHookCommand = `${absProjectDir}/.claude/hooks/pre-tool-use.sh`;
    const postHookCommand = `${absProjectDir}/.claude/hooks/post-tool-use.sh`;

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

    // Check if already registered (by command path)
    const preAlready = (hooks['PreToolUse'] ?? []).some(m =>
        m.hooks?.some(h => h.command === preHookCommand),
    );
    const postAlready = (hooks['PostToolUse'] ?? []).some(m =>
        m.hooks?.some(h => h.command === postHookCommand),
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
        // scripts
        { path: '.devmind/scripts/rebuild-index.sh', content: REBUILD_INDEX_SH, executable: true },
        { path: '.devmind/scripts/check-graveyard.py', content: CHECK_GRAVEYARD_PY, executable: true },
        // .claude/
        { path: '.claude/CLAUDE.md', content: CLAUDE_MD },
        { path: '.claude/settings.local.json', content: SETTINGS_LOCAL_JSON },
        { path: '.claude/hooks/pre-tool-use.sh', content: PRE_TOOL_USE_SH, executable: true },
        { path: '.claude/hooks/post-tool-use.sh', content: POST_TOOL_USE_SH, executable: true },
        // commands
        { path: '.claude/commands/dm/explore.md', content: CMD_EXPLORE },
        { path: '.claude/commands/dm/edit.md', content: CMD_EDIT },
        { path: '.claude/commands/dm/plan.md', content: CMD_PLAN },
        { path: '.claude/commands/dm/build.md', content: CMD_BUILD },
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
        const dir = fullPath.substring(0, fullPath.lastIndexOf('/'));

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
