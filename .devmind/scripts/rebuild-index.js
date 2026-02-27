#!/usr/bin/env node
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
    for (const line of content.split('\n')) {
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
    lines.push(`## ${titlePrefix} \u7D22\u5F15\uFF08\u5171 ${count} \u6761\uFF09`);
    lines.push('');

    if (count === 0) {
        lines.push('\uFF08\u6682\u65E0\u8BB0\u5F55\uFF09');
    } else {
        for (const fpath of mdFiles) {
            const content = fs.readFileSync(fpath, 'utf8');
            const stem = path.basename(fpath, '.md');

            // Extract title
            let title = extractField(content, `## ${titlePrefix}\uFF1A`) || stem;

            // Extract tags or keywords
            let tagStr = '';
            if (keywordPrefix) {
                const tags = extractField(content, keywordPrefix);
                tagStr = tags ? `\uFF08\u5173\u952E\u8BCD\uFF1A${tags}\uFF09` : '';
            } else {
                const tags = extractField(content, tagPrefix);
                tagStr = tags ? `\uFF08${tags}\uFF09` : '';
            }

            lines.push(`- \`${stem}\` - ${title}${tagStr}`);

            // Summary (only for decisions and patterns)
            if (!keywordPrefix) {
                const summary = extractField(content, '**\u6458\u8981**\uFF1A');
                if (summary) {
                    lines.push(`  > ${summary}`);
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
    output.push('<!-- \u6B64\u6587\u4EF6\u7531 .devmind/scripts/rebuild-index.js \u81EA\u52A8\u751F\u6210\uFF0C\u8BF7\u52FF\u624B\u52A8\u7F16\u8F91 -->');
    output.push(`<!-- \u4E0A\u6B21\u751F\u6210\uFF1A${now} -->`);
    output.push('');
    output.push(...buildSection(decDir, '\u51B3\u7B56', '- \u6807\u7B7E\uFF1A', '**\u6458\u8981**\uFF1A'));
    output.push('');
    output.push(...buildSection(patDir, '\u89C4\u5F8B', '- \u6807\u7B7E\uFF1A', '**\u6458\u8981**\uFF1A'));
    output.push('');
    output.push(...buildSection(gydDir, '\u653E\u5F03\u65B9\u6848', null, null, '- \u5173\u952E\u8BCD\uFF1A'));
    output.push('');
    output.push('---');
    output.push('');
    output.push('\u4F7F\u7528\u63D0\u793A\uFF1A\u9700\u8981\u8BE6\u7EC6\u5185\u5BB9\u65F6\uFF0C\u4F7F\u7528 `/recall <\u5173\u952E\u8BCD>` \u68C0\u7D22');

    fs.writeFileSync(INDEX_FILE, output.join('\n') + '\n', 'utf8');

    const decCount = countMd(decDir);
    const patCount = countMd(patDir);
    const gydCount = countMd(gydDir);

    console.error(`Decisions=${decCount}  Patterns=${patCount}  Graveyard=${gydCount}`);
    console.log(`\u7D22\u5F15\u5DF2\u91CD\u5EFA\uFF1A${INDEX_FILE}`);
}

main();
