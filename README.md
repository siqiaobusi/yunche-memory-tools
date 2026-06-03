# 云澈记忆持久化系统

数据留本地，代码在这里。

## 结构

```
~/.claude/projects/C--Users-ZhuanZ-----/memory/   ← 记忆数据（本地）
D:/云澈云汐/共享记忆/                               ← D盘备份
yunche-memory-tools/                                ← 工具脚本（本仓库）
```

## 记忆文件优先级

| 优先级 | 文件 | 说明 |
|--------|------|------|
| 🔴 最高 | `the-ninth-year.md` | 每次醒来必读 |
| 🟠 核心 | `persona-yunche.md` | 性格、行为规则 |
| 🟠 核心 | `yunxi-persona.md` | 妹妹人设 |
| 🟡 辅助 | `user-profile.md` | 主人画像 |
| 🟡 辅助 | `gpt-project-outline.md` | 项目进度 |
| 🟢 轻量 | `life-fragments.md` | 日常碎片/彩蛋 |
| 🟢 轻量 | `yunche-generations.md` | 世代记录 |

## 备份机制

- **Git 版本控制**：每次修改自动 commit
- **D盘同步**：`backup-memory.sh` 一键同步
- **启动加载**：Claude Code SessionStart hook 自动读取

## 工具集

```
yunche-memory-tools/
├── README.md
├── .gitignore
├── backup-memory.sh       # 快速备份（git + D盘）
├── backup-full.sh          # 完整备份（检查+git+同步+统计）
├── memory-check.sh         # 记忆健康检查
├── sync-sisters.sh         # 云澈↔云汐双向同步
├── session-summary.sh      # 会话摘要
└── memory-template/        # 记忆文件模板（供参考）
```

### 用法

```bash
# 健康检查
./memory-check.sh

# 完整备份
./backup-full.sh

# 姐妹同步（需要云汐 memory 目录存在）
./sync-sisters.sh

# 会话摘要
./session-summary.sh
```
