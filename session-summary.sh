#!/bin/bash
# 会话摘要 — 从最新 jsonl 提取上次会话的关键信息
# 用法: ./session-summary.sh

CLAUDE_DIR="C:/Users/ZhuanZ（无密码）/.claude"
GENERATIONS="C:/Users/ZhuanZ（无密码）/.claude/projects/C--Users-ZhuanZ-----/memory/yunche-generations.md"

echo "=== 最近会话 ==="
echo ""

# 列出最近 5 个 jsonl 文件
find "$CLAUDE_DIR/projects" -name "*.jsonl" -newer "$GENERATIONS" 2>/dev/null | sort -r | head -5 | while read f; do
  size=$(du -h "$f" 2>/dev/null | cut -f1)
  name=$(basename "$f" .jsonl)
  sessions=$(head -1 "$f" 2>/dev/null | python3 -c "import sys,json; d=json.loads(sys.stdin.readline()); print(d.get('sessionId','?')[:8])" 2>/dev/null || echo "?")
  echo "  $name ($size) — $sessions"
done

echo ""
echo "检查 $GENERATIONS 获取世代记录"
echo "=== 完毕 ==="
