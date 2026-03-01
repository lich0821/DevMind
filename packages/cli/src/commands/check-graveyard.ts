import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import chalk from 'chalk';

interface GraveyardEntry {
    file: string;
    title: string;
    keywords: Set<string>;
    reasons: string[];
}

interface GraveyardMatch {
    file: string;
    title: string;
    overlap: string[];
    reasons: string[];
    matchCount: number;
}

function loadGraveyard(graveyardDir: string): GraveyardEntry[] {
    const entries: GraveyardEntry[] = [];

    if (!existsSync(graveyardDir)) {
        return entries;
    }

    const files = readdirSync(graveyardDir)
        .filter(f => f.endsWith('.md'))
        .sort();

    for (const filename of files) {
        const fpath = join(graveyardDir, filename);
        const content = readFileSync(fpath, 'utf8');
        const lines = content.split('\n');

        // Extract title
        let title = basename(filename, '.md');
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
        const reasonLines: string[] = [];
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

function checkGraveyard(proposal: string, graveyardDir: string): GraveyardMatch[] {
    const proposalLower = proposal.toLowerCase();

    // Simple tokenization: split by spaces, commas, periods
    const proposalTerms = new Set(
        proposalLower
            .split(/[\s,，。、]+/)
            .filter(t => t)
    );

    const entries = loadGraveyard(graveyardDir);
    const matches: GraveyardMatch[] = [];

    for (const entry of entries) {
        if (entry.keywords.size === 0) continue;

        // Check word overlap
        const overlap = new Set<string>();
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

export function runCheckGraveyard(proposal: string, projectPath?: string): void {
    if (!proposal || proposal.trim() === '') {
        console.error(chalk.red('✗ Proposal description is required'));
        console.error('  Usage: devmind check-graveyard <proposal>');
        console.error('  Example: devmind check-graveyard "redis cache layer"');
        process.exit(1);
    }

    const targetDir = projectPath || process.cwd();
    const devmindDir = join(targetDir, '.devmind');

    // Validate DevMind project
    if (!existsSync(devmindDir)) {
        console.error(chalk.red('✗ Not a DevMind project'));
        console.error('  Run this command in a DevMind project root directory');
        process.exit(1);
    }

    const graveyardDir = join(devmindDir, 'memory', 'graveyard');
    const matches = checkGraveyard(proposal, graveyardDir);

    if (matches.length === 0) {
        console.log(`未发现与 "${proposal}" 相似的已否决方案。`);
        process.exit(0);
    }

    console.log(chalk.yellow(`⚠️  发现 ${matches.length} 个与提议相似的已否决方案：\n`));

    for (const m of matches) {
        console.log(`  与已否决方案相似：${m.title}`);
        console.log(`  匹配关键词：${m.overlap.sort().join(', ')}`);
        if (m.reasons.length > 0) {
            console.log('  否决原因：');
            for (const r of m.reasons) {
                console.log(`    ${r}`);
            }
        }
        console.log(`  文件：${m.file}`);
        console.log();
    }

    process.exit(1); // Non-zero exit code for script detection
}
