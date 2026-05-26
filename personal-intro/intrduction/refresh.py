#!/usr/bin/env python3
"""
AI 工具箱数据刷新脚本

功能：
1. 通过搜索引擎 API 获取过去 3 天的 AI 模型/工具更新动态
2. 调用 LLM API 分析是否有新版本/新工具上位
3. 更新 data.json（保守策略：只更新有明确证据的变化）

环境变量：
  LLM_API_KEY      - LLM API 密钥（必需）
  LLM_BASE_URL     - LLM API 地址（默认 https://api.openai.com/v1）
  LLM_MODEL        - 模型名（默认 gpt-4o）
  SEARCH_API_KEY   - 搜索 API 密钥（必需）
  SEARCH_ENGINE    - 搜索引擎：brave / tavily（默认 brave）

用法：
  python refresh.py                    # 正常运行
  python refresh.py --dry-run          # 只输出建议，不写文件
  python refresh.py --search-only      # 只搜索，不调 LLM（调试用）
"""

import json
import os
import sys
import argparse
from datetime import datetime, timedelta
from pathlib import Path

try:
    import requests
except ImportError:
    print("Installing requests...")
    os.system(f"{sys.executable} -m pip install requests -q")
    import requests


# ========== Config ==========
SCRIPT_DIR = Path(__file__).parent
DATA_FILE = SCRIPT_DIR / "data.json"

LLM_API_KEY = os.environ.get("LLM_API_KEY", "")
LLM_BASE_URL = os.environ.get("LLM_BASE_URL", "https://api.openai.com/v1").rstrip("/")
LLM_MODEL = os.environ.get("LLM_MODEL", "gpt-4o")
SEARCH_API_KEY = os.environ.get("SEARCH_API_KEY", "")
SEARCH_ENGINE = os.environ.get("SEARCH_ENGINE", "brave")


# ========== Search ==========
def search_brave(query: str, count: int = 10) -> list[dict]:
    """Brave Search API"""
    resp = requests.get(
        "https://api.search.brave.com/res/v1/web/search",
        headers={"X-Subscription-Token": SEARCH_API_KEY, "Accept": "application/json"},
        params={"q": query, "count": count, "freshness": "pw"},  # pw = past week
        timeout=15,
    )
    resp.raise_for_status()
    results = resp.json().get("web", {}).get("results", [])
    return [{"title": r["title"], "url": r["url"], "snippet": r.get("description", "")} for r in results]


def search_tavily(query: str, count: int = 10) -> list[dict]:
    """Tavily Search API"""
    resp = requests.post(
        "https://api.tavily.com/search",
        json={
            "api_key": SEARCH_API_KEY,
            "query": query,
            "max_results": count,
            "days": 7,
        },
        timeout=15,
    )
    resp.raise_for_status()
    results = resp.json().get("results", [])
    return [{"title": r["title"], "url": r["url"], "snippet": r.get("content", "")[:200]} for r in results]


def do_search(query: str, count: int = 10) -> list[dict]:
    if SEARCH_ENGINE == "tavily":
        return search_tavily(query, count)
    return search_brave(query, count)


def collect_search_results() -> str:
    """多维度搜索 AI 领域最新动态，返回拼接文本"""
    queries = [
        "AI model new release 2026 May GPT Claude Gemini DeepSeek",
        "AI 工具 最新版本 2026年5月 模型更新",
        "AI coding tool update Codex Claude Code 2026",
        "AI image video music generation latest 2026",
        "Suno Seedance 可灵 即梦 最新版本 2026",
    ]

    all_results = []
    seen_urls = set()

    for q in queries:
        try:
            results = do_search(q, count=5)
            for r in results:
                if r["url"] not in seen_urls:
                    seen_urls.add(r["url"])
                    all_results.append(r)
        except Exception as e:
            print(f"  [WARN] Search failed for '{q[:30]}...': {e}")

    if not all_results:
        return "（未获取到搜索结果）"

    text_parts = []
    for i, r in enumerate(all_results[:20], 1):
        text_parts.append(f"[{i}] {r['title']}\n    {r['url']}\n    {r['snippet']}")

    return "\n\n".join(text_parts)


# ========== LLM ==========
SYSTEM_PROMPT = """你是一个 AI 工具评测专家。你的任务是根据搜索结果，判断当前 data.json 中的推荐是否需要更新。

## 规则（严格遵守）

1. **保守原则**：只在搜索结果中有明确证据时才更新。没有找到新版本的证据 = 不改。
2. **不猜测版本号**：如果搜索结果没有明确提到新版本号，保持原样。
3. **不改变分类结构**：保持原来的 categories 和 scenarios 结构不变。
4. **优先保留原文评价**：如"独一档的夯"等主观评价保持原文风格。
5. **如果发现新工具/新版本**：更新对应字段，并在 changelog 中说明原因。
6. **如果没有变化**：原样返回 data.json，changelog 为空数组。

## 输出格式

返回一个 JSON 对象（不要 markdown 代码块包裹）：
```json
{
  "data": { ... },       // 完整的 data.json 内容
  "changelog": [         // 本次变更记录
    {
      "field": "categories[0].scenarios[0].products[0].name",
      "old": "GPT-5.5",
      "new": "GPT-6.0",
      "reason": "OpenAI 于 2026-05-02 发布 GPT-6.0，替代 GPT-5.5"
    }
  ]
}
```

如果没有任何变化，changelog 为空数组 []，data 保持原样。
"""


def call_llm(system: str, user: str) -> str:
    """调用 LLM API（OpenAI 兼容格式）"""
    resp = requests.post(
        f"{LLM_BASE_URL}/chat/completions",
        headers={
            "Authorization": f"Bearer {LLM_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "model": LLM_MODEL,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": 0.1,  # 低温度，保守输出
            "max_tokens": 8000,
        },
        timeout=120,
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"]


def parse_llm_json(raw: str) -> dict:
    """从 LLM 输出中提取 JSON（处理可能的 markdown 包裹）"""
    text = raw.strip()
    # 去掉可能的 markdown 代码块
    if text.startswith("```"):
        lines = text.split("\n")
        # 找到第一行 ``` 和最后一行 ```
        start = 1  # 跳过 ```json
        end = len(lines) - 1
        for i in range(len(lines) - 1, 0, -1):
            if lines[i].strip() == "```":
                end = i
                break
        text = "\n".join(lines[start:end])
    return json.loads(text)


# ========== Main ==========
def main():
    parser = argparse.ArgumentParser(description="AI 工具箱数据刷新")
    parser.add_argument("--dry-run", action="store_true", help="只输出建议，不写文件")
    parser.add_argument("--search-only", action="store_true", help="只搜索，不调 LLM")
    args = parser.parse_args()

    # 检查环境变量
    if not args.search_only and not LLM_API_KEY:
        print("ERROR: LLM_API_KEY 环境变量未设置")
        sys.exit(1)
    if not SEARCH_API_KEY:
        print("ERROR: SEARCH_API_KEY 环境变量未设置")
        sys.exit(1)

    # 1. 读取当前数据
    print("[1/3] 读取当前 data.json...")
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        current_data = json.load(f)
    print(f"  当前数据日期：{current_data['lastUpdated']}")
    print(f"  分类数：{len(current_data['categories'])}")

    # 2. 搜索最新动态
    print("\n[2/3] 搜索过去 7 天 AI 领域动态...")
    search_text = collect_search_results()
    result_count = search_text.count("[")
    print(f"  获取到 {result_count} 条搜索结果")

    if args.search_only:
        print("\n--- 搜索结果（调试模式）---")
        print(search_text[:3000])
        return

    # 3. LLM 分析
    print(f"\n[3/3] 调用 {LLM_MODEL} 分析变化...")
    user_prompt = f"""## 当前 data.json
```json
{json.dumps(current_data, ensure_ascii=False, indent=2)}
```

## 过去 7 天搜索结果
{search_text}

请分析是否有需要更新的内容。严格遵守保守原则。"""

    try:
        raw_response = call_llm(SYSTEM_PROMPT, user_prompt)
        result = parse_llm_json(raw_response)
    except json.JSONDecodeError as e:
        print(f"ERROR: LLM 返回的 JSON 解析失败: {e}")
        print(f"原始输出前 500 字：\n{raw_response[:500]}")
        sys.exit(1)
    except Exception as e:
        print(f"ERROR: LLM 调用失败: {e}")
        sys.exit(1)

    # 4. 处理结果
    new_data = result.get("data", current_data)
    changelog = result.get("changelog", [])

    # 更新日期
    today = datetime.now().strftime("%Y-%m-%d")
    new_data["lastUpdated"] = today

    if not changelog:
        print("\n✓ 未发现需要更新的内容")
        # 仍然更新日期（证明脚本跑了）
        if args.dry_run:
            print("  [dry-run] 不写文件")
        else:
            with open(DATA_FILE, "w", encoding="utf-8") as f:
                json.dump(new_data, f, ensure_ascii=False, indent=2)
            print(f"  已更新 lastUpdated 为 {today}")
    else:
        print(f"\n✓ 发现 {len(changelog)} 处变化：")
        for c in changelog:
            print(f"  - {c['field']}: {c['old']} → {c['new']}")
            print(f"    原因：{c['reason']}")

        if args.dry_run:
            print("\n  [dry-run] 不写文件，以下是建议的新 data.json：")
            print(json.dumps(new_data, ensure_ascii=False, indent=2)[:2000])
        else:
            # 备份旧文件
            backup = DATA_FILE.with_suffix(f".{current_data['lastUpdated']}.json.bak")
            with open(backup, "w", encoding="utf-8") as f:
                json.dump(current_data, f, ensure_ascii=False, indent=2)
            print(f"  旧数据已备份：{backup.name}")

            with open(DATA_FILE, "w", encoding="utf-8") as f:
                json.dump(new_data, f, ensure_ascii=False, indent=2)
            print(f"  data.json 已更新")

    print("\nDone.")


if __name__ == "__main__":
    main()
