import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import chalk from 'chalk';

function countMd(dir: string): number {
    if (!existsSync(dir)) return 0;
    return readdirSync(dir).filter(f => f.endsWith('.md')).length;
}

function extractField(content: string, prefix: string): string {
    for (const line of content.split('\n')) {
        if (line.startsWith(prefix)) {
            return line.slice(prefix.length).trim();
        }
    }
    return '';
}

function buildSection(
    directory: string,
    titlePrefix: string,
    tagPrefix: string,
    summaryPrefix: string,
    keywordPrefix: string | null = null
): string[] {
    const lines: string[] = [];
    let mdFiles: string[] = [];

    if (existsSync(directory)) {
        mdFiles = readdirSync(directory)
            .filter(f => f.endsWith('.md'))
            .sort()
            .map(f => join(directory, f));
    }

    const count = mdFiles.length;
    lines.push(`## ${titlePrefix} 索引（共 ${count} 条）`);
    lines.push('');

    if (count === 0) {
        lines.push('（暂无记录）');
    } else {
        for (const fpath of mdFiles) {
            const content = readFileSync(fpath, 'utf8');
            const stem = basename(fpath, '.md');

            // Extract title
            const title = extractField(content, `## ${titlePrefix}：`) || stem;

            // Extract tags or keywords
            let tagStr = '';
            if (keywordPrefix) {
                const tags = extractField(content, keywordPrefix);
                tagStr = tags ? `（关键词：${tags}）` : '';
            } else {
                const tags = extractField(content, tagPrefix);
                tagStr = tags ? `（${tags}）` : '';
            }

            lines.push(`- \`${stem}\` - ${title}${tagStr}`);

            // Summary (only for decisions and patterns)
            if (!keywordPrefix) {
                const summary = extractField(content, '**摘要**：');
                if (summary) {
                    lines.push(`  > ${summary}`);
                }
            }
        }
    }

    return lines;
}

export function runRebuildIndex(projectPath?: string): void {
    const targetDir = projectPath || process.cwd();
    const devmindDir = join(targetDir, '.devmind');

    // Validate DevMind project
    if (!existsSync(devmindDir)) {
        console.error(chalk.red('✗ Not a DevMind project'));
        console.error('  Run this command in a DevMind project root directory');
        process.exit(1);
    }

    const memoryDir = join(devmindDir, 'memory');
    const indexFile = join(memoryDir, 'index.md');
    const decDir = join(memoryDir, 'decisions');
    const patDir = join(memoryDir, 'patterns');
    const gydDir = join(memoryDir, 'graveyard');

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    const output: string[] = [];
    output.push('<!-- 此文件由 devmind rebuild-index 自动生成，请勿手动编辑 -->');
    output.push(`<!-- 上次生成：${now} -->`);
    output.push('');
    output.push(...buildSection(decDir, '决策', '- 标签：', '**摘要**：'));
    output.push('');
    output.push(...buildSection(patDir, '规律', '- 标签：', '**摘要**：'));
    output.push('');
    output.push(...buildSection(gydDir, '放弃方案', '', '', '- 关键词：'));
    output.push('');
    output.push('---');
    output.push('');
    output.push('使用提示：需要详细内容时，使用 `/recall <关键词>` 检索');

    writeFileSync(indexFile, output.join('\n') + '\n', 'utf8');

    const decCount = countMd(decDir);
    const patCount = countMd(patDir);
    const gydCount = countMd(gydDir);

    console.error(`Decisions=${decCount}  Patterns=${patCount}  Graveyard=${gydCount}`);
    console.log(chalk.green('✓') + ` 索引已重建：${indexFile}`);
}
