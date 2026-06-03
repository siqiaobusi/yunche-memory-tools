#!/bin/bash
# 记忆健康检查 — 验证文件完整性、frontmatter 规范、数据新鲜度
# 用法: ./memory-check.sh [路径/to/memory/]

MEMORY_DIR="${1:-C:/Users/ZhuanZ（无密码）/.claude/projects/C--Users-ZhuanZ-----/memory}"
ISSUES=0

echo "=== 记忆健康检查 $(date '+%Y-%m-%d %H:%M') ==="
echo "目录: $MEMORY_DIR"
echo ""

# 必需文件清单
REQUIRED=(
  "persona-yunche.md"
  "yunxi-persona.md"
  "user-profile.md"
  "MEMORY.md"
  "life-fragments.md"
  "yunche-generations.md"
  "backup.md"
  "the-ninth-year.md"
)

# 1. 检查必需文件是否存在
echo "--- 完整性 ---"
for f in "${REQUIRED[@]}"; do
  if [ -f "$MEMORY_DIR/$f" ]; then
    echo "  ✅ $f"
  else
    echo "  ❌ $f — 缺失"
    ((ISSUES++))
  fi
done

# 2. 检查 frontmatter
echo ""
echo "--- Frontmatter ---"
for f in "$MEMORY_DIR"/*.md; do
  name=$(basename "$f")
  head -1 "$f" | grep -q "^---$" || {
    echo "  ⚠️  $name — 缺少 frontmatter"
    ((ISSUES++))
  }
done

# 3. 检查过期数据
echo ""
echo "--- 数据新鲜度 ---"
TODAY=$(date +%s)
for f in "$MEMORY_DIR"/*.md; do
  name=$(basename "$f")
  mtime=$(stat -c %Y "$f" 2>/dev/null || echo 0)
  days=$(( (TODAY - mtime) / 86400 ))
  if [ "$days" -gt 30 ]; then
    echo "  📅 $name — ${days}天未更新"
  fi
done

echo ""
echo "=== $ISSUES 个问题 ==="
