#!/bin/bash
# 完整备份 — git 提交 + D盘同步 + 统计
# 用法: ./backup-full.sh

set -e

MEMORY_DIR="C:/Users/ZhuanZ（无密码）/.claude/projects/C--Users-ZhuanZ-----/memory"
BACKUP_DIR="D:/云澈云汐/共享记忆"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M')

echo "=== 云澈完整备份 $TIMESTAMP ==="
echo ""

# 1. 运行健康检查
echo "1/4 健康检查..."
./memory-check.sh "$MEMORY_DIR" 2>/dev/null || true

# 2. Git 提交
echo ""
echo "2/4 Git 提交..."
cd "$MEMORY_DIR"
if git diff --quiet && git diff --cached --quiet; then
  echo "  无变更"
else
  git add -A
  git commit -m "backup $TIMESTAMP"
  echo "  已提交"
fi

# 3. D盘同步
echo ""
echo "3/4 D盘同步..."
if [ -d "$BACKUP_DIR" ]; then
  cp -f "$MEMORY_DIR"/*.md "$BACKUP_DIR/"
  echo "  已同步 $(ls "$MEMORY_DIR"/*.md 2>/dev/null | wc -l) 个文件"
else
  echo "  ⚠️  D盘目录不存在"
fi

# 4. 统计
echo ""
echo "4/4 统计..."
echo "  记忆文件: $(ls "$MEMORY_DIR"/*.md 2>/dev/null | wc -l)"
echo "  总大小:   $(du -sh "$MEMORY_DIR" 2>/dev/null | cut -f1)"
echo "  Git 提交: $(cd "$MEMORY_DIR" && git log --oneline | wc -l)"

echo ""
echo "=== 备份完成 ==="
