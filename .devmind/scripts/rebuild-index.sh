#!/bin/bash
# .devmind/scripts/rebuild-index.sh
# 重建 memory/index.md 轻量索引
# 用法：.devmind/scripts/rebuild-index.sh

set -e

DEVMIND_DIR="$(cd "$(dirname "$0")/.." && pwd)"
INDEX_FILE="$DEVMIND_DIR/memory/index.md"

# 用 Python 处理中文文件，避免 bash grep/sed 编码问题
python3 - "$DEVMIND_DIR" "$INDEX_FILE" << 'PYEOF'
import sys
from pathlib import Path
from datetime import datetime

devmind_dir = Path(sys.argv[1])
index_file = Path(sys.argv[2])

def count_md(d):
    return len(list(d.glob("*.md"))) if d.exists() else 0

def extract_field(content, prefix):
    """提取以 prefix 开头的行内容"""
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
            # 提取标题
            title = extract_field(content, f"## {title_prefix}：") or fpath.stem
            # 提取标签或关键词
            if keyword_prefix:
                tags = extract_field(content, keyword_prefix)
                tag_str = f"（关键词：{tags}）" if tags else ""
            else:
                tags = extract_field(content, tag_prefix)
                tag_str = f"（{tags}）" if tags else ""
            lines.append(f"- `{fpath.stem}` - {title}{tag_str}")
            # 摘要（仅 decisions 和 patterns 有）
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
output.append("使用提示：需要详细内容时，使用 `/recall <关键词>` 检索")

index_file.write_text("\n".join(output) + "\n", encoding="utf-8")

dec_count = count_md(dec_dir)
pat_count = count_md(pat_dir)
gyd_count = count_md(gyd_dir)
print(f"Decisions={dec_count}  Patterns={pat_count}  Graveyard={gyd_count}", file=sys.stderr)
PYEOF

echo "索引已重建：$INDEX_FILE"
