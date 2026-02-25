import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import chalk from 'chalk';
import { requireDevmindDir } from '../utils/find-devmind.js';

interface MemoryEntry {
    file: string;
    category: 'decision' | 'pattern' | 'graveyard';
    title: string;
    summary: string;
    tags: string;
    matchedLines: string[];
}

function searchDir(
    dir: string,
    keyword: string,
    category: MemoryEntry['category'],
    results: MemoryEntry[],
): void {
    if (!existsSync(dir)) return;

    let files: string[];
    try {
        files = readdirSync(dir).filter(f => f.endsWith('.md'));
    } catch {
        return;
    }

    const kw = keyword.toLowerCase();

    for (const file of files) {
        const filePath = join(dir, file);
        let content: string;
        try {
            content = readFileSync(filePath, 'utf-8');
        } catch {
            continue;
        }

        const lower = content.toLowerCase();
        if (!file.toLowerCase().includes(kw) && !lower.includes(kw)) continue;

        const lines = content.split('\n');

        // Extract title (first ## heading)
        const titleLine = lines.find(l => l.startsWith('## '));
        const title = titleLine?.replace(/^##\s+/, '') ?? file.replace('.md', '');

        // Extract summary
        const summaryLine = lines.find(l => l.startsWith('**摘要**：'));
        const summary = summaryLine?.replace('**摘要**：', '').trim() ?? '';

        // Extract tags
        const tagsLine = lines.find(l => l.startsWith('- 标签：') || l.startsWith('- 关键词：'));
        const tags = tagsLine?.replace(/^- (标签|关键词)：/, '').trim() ?? '';

        // Find matching lines for context (up to 2)
        const matchedLines = lines
            .filter(l => l.toLowerCase().includes(kw) && l.trim().length > 0)
            .slice(0, 2)
            .map(l => l.trim());

        results.push({ file, category, title, summary, tags, matchedLines });
    }
}

const categoryLabel: Record<MemoryEntry['category'], string> = {
    decision: 'Decision',
    pattern:  'Pattern',
    graveyard: 'Graveyard',
};

const categoryColor: Record<MemoryEntry['category'], (s: string) => string> = {
    decision: chalk.cyan,
    pattern:  chalk.green,
    graveyard: chalk.red,
};

export function runRecall(keyword: string): void {
    const devmindDir = requireDevmindDir();
    const memoryDir = join(devmindDir, 'memory');

    const results: MemoryEntry[] = [];
    searchDir(join(memoryDir, 'decisions'), keyword, 'decision', results);
    searchDir(join(memoryDir, 'patterns'),  keyword, 'pattern',  results);
    searchDir(join(memoryDir, 'graveyard'), keyword, 'graveyard', results);

    console.log('');

    if (results.length === 0) {
        console.log(chalk.dim(`No memory entries found for "${keyword}".`));
        console.log('');
        return;
    }

    console.log(chalk.bold(`Recall: "${keyword}"`) + chalk.dim(`  (${results.length} found)`));
    console.log('─'.repeat(50));

    for (const entry of results) {
        const label = categoryColor[entry.category](categoryLabel[entry.category]);
        console.log(`\n${label}  ${chalk.bold(entry.title)}`);
        if (entry.tags) {
            console.log(`  ${chalk.dim('tags:')} ${entry.tags}`);
        }
        if (entry.summary) {
            console.log(`  ${entry.summary}`);
        }
        if (entry.matchedLines.length > 0) {
            for (const line of entry.matchedLines) {
                console.log(`  ${chalk.dim('>')} ${line}`);
            }
        }
        console.log(`  ${chalk.dim(entry.file)}`);
    }

    console.log('');
}
