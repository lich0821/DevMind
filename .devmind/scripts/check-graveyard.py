#!/usr/bin/env python3
"""
check-graveyard.py — Graveyard 关键词匹配检测
检测当前提议是否与已否决方案相似，防止重蹈覆辙

用法：
  python3 .devmind/scripts/check-graveyard.py "redis cache layer"
  python3 .devmind/scripts/check-graveyard.py "GraphQL API endpoint"

输出：
  匹配到的已否决方案列表，按匹配关键词数量降序排列
"""

import sys
from pathlib import Path


def load_graveyard(graveyard_dir: str) -> list[dict]:
    """加载所有 Graveyard 文件，提取关键词"""
    entries = []
    gdir = Path(graveyard_dir)
    if not gdir.exists():
        return entries

    for fpath in sorted(gdir.glob("*.md")):
        content = fpath.read_text(encoding="utf-8")
        lines = content.splitlines()

        # 提取标题
        title = next(
            (l.replace("## 放弃方案：", "").strip() for l in lines if l.startswith("## 放弃方案：")),
            fpath.stem
        )

        # 提取关键词行（格式：- 关键词：word1, word2, word3）
        keywords_line = next(
            (l for l in lines if l.startswith("- 关键词：")),
            ""
        )
        raw_keywords = keywords_line.replace("- 关键词：", "").strip()
        keywords = set(
            kw.strip().lower()
            for kw in raw_keywords.replace("，", ",").split(",")
            if kw.strip()
        )

        # 提取否决原因摘要
        reason_lines = []
        in_reason = False
        for l in lines:
            if l.startswith("- 放弃原因："):
                in_reason = True
                continue
            if in_reason:
                if l.startswith("  ") and l.strip():
                    reason_lines.append(l.strip())
                elif l.startswith("- ") and not l.startswith("  "):
                    break

        entries.append({
            "file": str(fpath),
            "title": title,
            "keywords": keywords,
            "reasons": reason_lines[:2],  # 只取前2条原因
        })

    return entries


def check_graveyard(proposal: str, graveyard_dir: str = ".devmind/memory/graveyard") -> list[dict]:
    """检测提议与已否决方案的关键词重叠"""
    # 将提议拆分为词（支持中英文混合）
    proposal_lower = proposal.lower()
    # 简单分词：按空格、逗号、句号分割
    import re
    proposal_terms = set(re.split(r"[\s,，。、]+", proposal_lower))
    proposal_terms.discard("")

    entries = load_graveyard(graveyard_dir)
    matches = []

    for entry in entries:
        if not entry["keywords"]:
            continue

        overlap = proposal_terms & entry["keywords"]
        # 也检查关键词是否是提议的子串（处理中文连续词）
        substring_matches = set()
        for kw in entry["keywords"]:
            if kw and kw in proposal_lower:
                substring_matches.add(kw)

        all_matches = overlap | substring_matches
        if all_matches:
            matches.append({
                "file": entry["file"],
                "title": entry["title"],
                "overlap": all_matches,
                "reasons": entry["reasons"],
                "match_count": len(all_matches),
            })

    return sorted(matches, key=lambda x: x["match_count"], reverse=True)


def main():
    if len(sys.argv) < 2:
        print("用法：python3 check-graveyard.py <提议描述>")
        print('示例：python3 check-graveyard.py "redis cache layer"')
        sys.exit(1)

    proposal = " ".join(sys.argv[1:])

    # 自动检测 graveyard 目录位置
    script_dir = Path(__file__).parent
    graveyard_dir = script_dir.parent / "memory" / "graveyard"

    matches = check_graveyard(proposal, str(graveyard_dir))

    if not matches:
        print(f'未发现与 "{proposal}" 相似的已否决方案。')
        sys.exit(0)

    print(f'⚠️  发现 {len(matches)} 个与提议相似的已否决方案：\n')
    for m in matches:
        print(f'  与已否决方案相似：{m["title"]}')
        print(f'  匹配关键词：{", ".join(sorted(m["overlap"]))}')
        if m["reasons"]:
            print(f'  否决原因：')
            for r in m["reasons"]:
                print(f'    {r}')
        print(f'  文件：{m["file"]}')
        print()

    sys.exit(1)  # 非零退出码，便于脚本调用时检测


if __name__ == "__main__":
    main()
