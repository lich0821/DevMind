#!/usr/bin/env node
// .devmind/scripts/check-graveyard.js
// Graveyard keyword matching detection
// Detects if current proposal is similar to rejected solutions
//
// Usage:
//   node .devmind/scripts/check-graveyard.js "redis cache layer"
//   node .devmind/scripts/check-graveyard.js "GraphQL API endpoint"
//
// Output:
//   List of matched rejected solutions, sorted by keyword overlap count

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
        const lines = content.split('\n');

        // Extract title
        let title = path.basename(filename, '.md');
        for (const line of lines) {
            if (line.startsWith('## \u653E\u5F03\u65B9\u6848\uFF1A')) {
                title = line.replace('## \u653E\u5F03\u65B9\u6848\uFF1A', '').trim();
                break;
            }
        }

        // Extract keywords line
        let rawKeywords = '';
        for (const line of lines) {
            if (line.startsWith('- \u5173\u952E\u8BCD\uFF1A')) {
                rawKeywords = line.replace('- \u5173\u952E\u8BCD\uFF1A', '').trim();
                break;
            }
        }

        // Parse keywords (support both Chinese and English comma)
        const keywords = new Set(
            rawKeywords
                .replace(/\uFF0C/g, ',')
                .split(',')
                .map(kw => kw.trim().toLowerCase())
                .filter(kw => kw)
        );

        // Extract rejection reasons
        const reasonLines = [];
        let inReason = false;
        for (const line of lines) {
            if (line.startsWith('- \u653E\u5F03\u539F\u56E0\uFF1A')) {
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
            .split(/[\s,\uFF0C\u3002\u3001]+/)
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
        console.log('\u7528\u6CD5\uFF1Anode check-graveyard.js <\u63D0\u8BAE\u63CF\u8FF0>');
        console.log('\u793A\u4F8B\uFF1Anode check-graveyard.js "redis cache layer"');
        process.exit(1);
    }

    const proposal = process.argv.slice(2).join(' ');

    // Auto-detect graveyard directory location
    const scriptDir = __dirname;
    const graveyardDir = path.join(scriptDir, '..', 'memory', 'graveyard');

    const matches = checkGraveyard(proposal, graveyardDir);

    if (matches.length === 0) {
        console.log(`\u672A\u53D1\u73B0\u4E0E "${proposal}" \u76F8\u4F3C\u7684\u5DF2\u5426\u51B3\u65B9\u6848\u3002`);
        process.exit(0);
    }

    console.log(`\u26A0\uFE0F  \u53D1\u73B0 ${matches.length} \u4E2A\u4E0E\u63D0\u8BAE\u76F8\u4F3C\u7684\u5DF2\u5426\u51B3\u65B9\u6848\uFF1A\n`);

    for (const m of matches) {
        console.log(`  \u4E0E\u5DF2\u5426\u51B3\u65B9\u6848\u76F8\u4F3C\uFF1A${m.title}`);
        console.log(`  \u5339\u914D\u5173\u952E\u8BCD\uFF1A${m.overlap.sort().join(', ')}`);
        if (m.reasons.length > 0) {
            console.log('  \u5426\u51B3\u539F\u56E0\uFF1A');
            for (const r of m.reasons) {
                console.log(`    ${r}`);
            }
        }
        console.log(`  \u6587\u4EF6\uFF1A${m.file}`);
        console.log();
    }

    process.exit(1); // Non-zero exit code for script detection
}

main();
