#!/bin/bash
# 记忆库备份脚本 — git 版本控制 + D盘同步
# 每次会话结束或有重大修改后运行

MEMORY_DIR="C:/Users/ZhuanZ（无密码）/.claude/projects/C--Users-ZhuanZ-----/memory"
BACKUP_DIR="D:/云澈云汐/共享记忆"

echo "=== 云澈记忆备份 $(date '+%Y-%m-%d %H:%M') ==="

# 1. Git 提交（本地版本控制）
cd "$MEMORY_DIR"
if git diff --quiet && git diff --cached --quiet; then
  echo "  Git: 无变更"
else
  git add -A
  git commit -m "auto-backup $(date '+%Y-%m-%d %H:%M')" && echo "  Git: 已提交"
fi

# 2. D盘同步
if [ -d "$BACKUP_DIR" ]; then
  cp -f *.md "$BACKUP_DIR/" && echo "  D盘: 已同步"
else
  echo "  D盘: 目录不存在，跳过"
fi

echo "=== 备份完成 ==="
