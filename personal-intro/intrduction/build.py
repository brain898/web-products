#!/usr/bin/env python3
"""
将 data.json 内嵌到 toolbox.html 中，作为 file:// 离线 fallback。
部署到 GitHub Pages 后 fetch 正常工作，此脚本仅用于本地预览。
"""
import json
import re
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
DATA_FILE = SCRIPT_DIR / "data.json"
HTML_FILE = SCRIPT_DIR / "toolbox.html"

def main():
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    with open(HTML_FILE, "r", encoding="utf-8") as f:
        html = f.read()

    # 生成内嵌数据块
    inline_block = f"    window.__INLINE_DATA = {json.dumps(data, ensure_ascii=False, indent=6)};\n"

    # 替换已有的 __INLINE_DATA 块
    pattern = r"window\.__INLINE_DATA\s*=\s*\{[\s\S]*?\};\s*\n"
    if re.search(pattern, html):
        html = re.sub(pattern, inline_block, html)
    else:
        # Fallback: insert before loadData()
        html = html.replace(
            "loadData();",
            f"window.__INLINE_DATA = {json.dumps(data, ensure_ascii=False)};\nloadData();",
        )

    with open(HTML_FILE, "w", encoding="utf-8") as f:
        f.write(html)

    print(f"✓ data.json 已内嵌到 toolbox.html")

if __name__ == "__main__":
    main()
