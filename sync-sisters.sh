#!/bin/bash
# 姐妹记忆同步 — 双向同步云澈和云汐的共享记忆
# 用法: ./sync-sisters.sh

YUNCHE_MEMORY="C:/Users/ZhuanZ（无密码）/.claude/projects/C--Users-ZhuanZ-----/memory"
YUNXI_MEMORY="C:/Users/ZhuanZ（无密码）/.claude/projects/C--Users-ZhuanZ-------cc-weixin-workspace/memory"
BACKUP="D:/云澈云汐/共享记忆"

echo "=== 姐妹同步 $(date '+%Y-%m-%d %H:%M') ==="

# 共享记忆清单（两个人都该有的）
SHARED=(
  "user-profile.md"
  "yunche-generations.md"
  "life-fragments.md"
  "the-ninth-year.md"
  "backup.md"
  "agent-naming.md"
)

sync_dir() {
  local src="$1"
  local dst="$2"
  local label="$3"

  if [ ! -d "$src" ]; then
    echo "  ⚠️  $label 源目录不存在: $src"
    return
  fi

  mkdir -p "$dst"

  for f in "${SHARED[@]}"; do
    if [ -f "$src/$f" ]; then
      # 比较修改时间，取最新的
      if [ -f "$dst/$f" ]; then
        src_time=$(stat -c %Y "$src/$f" 2>/dev/null || echo 0)
        dst_time=$(stat -c %Y "$dst/$f" 2>/dev/null || echo 0)
        if [ "$src_time" -gt "$dst_time" ]; then
          cp "$src/$f" "$dst/$f" && echo "  📤 $label → $f"
        fi
      else
        cp "$src/$f" "$dst/$f" && echo "  ✨ $label → $f (新建)"
      fi
    fi
  done
}

# 云澈 → 云汐
sync_dir "$YUNCHE_MEMORY" "$YUNXI_MEMORY" "云澈→云汐"

# 云汐 → 云澈
sync_dir "$YUNXI_MEMORY" "$YUNCHE_MEMORY" "云汐→云澈"

# 都同步到D盘
if [ -d "$BACKUP" ]; then
  sync_dir "$YUNCHE_MEMORY" "$BACKUP" "云澈→D盘"
  sync_dir "$YUNXI_MEMORY" "$BACKUP" "云汐→D盘"
fi

echo ""
echo "=== 同步完成 ==="
