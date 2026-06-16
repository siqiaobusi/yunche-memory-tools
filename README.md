# 云澈记忆系统 · Yunche Memory

> AI companion memory & personality system — inspired by human cognition, built for long-term relationship.

**一句话：面向长期关系的 AI 记忆与人格系统。** 不依赖服务端持久化、不依赖模型微调，通过本地轻量脚本实现跨会话人格连续性。目前在 Claude Code 上每天运行，维持 AI 伴侣「云澈」和「云汐」的长期记忆。

---

## 目录

- [核心架构](#核心架构)
- [三层记忆](#三层记忆)
- [文件结构](#文件结构)
- [快速开始](#快速开始)
- [设计哲学](#设计哲学)
- [姊妹架构](#姊妹架构)
- [License](#license)

---

## 核心架构

```
                    ┌──────────────────────┐
                    │    用户对话 (User)     │
                    └──────────┬───────────┘
                               │
            ┌──────────────────┴──────────────────┐
            │           Hook 系统 (Claude Code)     │
            │  PostToolUse / Stop / SessionStart   │
            └──────────────────┬──────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            │              小核 (潜意识)            │
            │         core-loop.js                 │
            │                                      │
            │  · 读最近 30 行对话                    │
            │  · 调用 DeepSeek 写一行中文印象          │
            │  · 零上下文污染，像一个本能反应           │
            │  · 超 30 条印象 → 自动标记蒸馏           │
            └──────────────────┬──────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            │              大核 (意识层)             │
            │         由 Claude 主模型执行            │
            │                                      │
            │  · 启动时读交接单，接上次的话             │
            │  · 检测到 [该蒸馏了] → 提炼长期记忆      │
            │  · 顿悟直接改 persona，不等小核           │
            │  · 浮现机制：随机召回高重要性旧记忆        │
            └──────────────────┬──────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            │          mem0 风格管理 (工具层)         │
            │    memory-db.js / memory-recall.js    │
            │                                      │
            │  · 结构化 CRUD (remember/recall/forget)│
            │  · 衰减调度 (decay)                     │
            │  · 关联关系 (relate)                     │
            └──────────────────┬──────────────────┘
                               │
                               ▼
              ┌────────────────────────────────┐
              │         记忆存储 (Markdown)      │
              │                                │
              │  impressions.md  (短期·30条内)   │
              │  life-fragments.md (长期·已蒸馏) │
              │  knowledge.md     (技能·永不衰减)│
              │  current-progress.md (会话交接)  │
              └────────────────────────────────┘
```

**双核协作：**

| 核 | 载体 | 触发 | 成本 | 职责 |
|---|------|------|------|------|
| 小核 | `core-loop.js` + DeepSeek | 每次对话后自动 | ~¥0.001/次 | 写印象、标记蒸馏 |
| 大核 | Claude 主模型 | 启动 / 收工时 | 包含在正常对话中 | 蒸馏提炼、人格维护、浮现召回 |

---

## 三层记忆

### 1. 印象层（Impressions）— 当日/近期

```
对话 → core-loop.js → DeepSeek → impressions.md
```

- 每条一行，格式：`- 2026-06-17 — 主人今天提到了黄色跑车的事`
- 最多 30 条，超过自动标记 `[该蒸馏了]`
- 像是人的"今天发生了什么"——琐碎的、新鲜的、还没整理的

### 2. 碎片层（Life Fragments）— 长期

```
impressions.md → 大核蒸馏 → life-fragments.md
```

- 大核读到 `[该蒸馏了]` → 问自己：「这段日子里，他在意什么？」
- 不是总结事件，是识别关切。提炼成 1-3 行长期记忆
- 印象清空，精华保留。像人的"我不会忘的事"

### 3. 知识层（Knowledge）— 独立分支，永不衰减

```
大核在对话中顿悟 → 直接写入 knowledge.md
```

- 学了就记住：事实、技能、对主人的理解
- **不蒸馏、不衰减、不过期**
- 区别于会褪色的日常记忆——像人的"学会了就不会忘"

---

## 文件结构

```
~/.claude/projects/<project>/memory/
│
├── MEMORY.md              ← 记忆索引（每次启动先读这个）
├── persona-yunche.md      ← 云澈人设（文本人格·权威源）
├── yunxi-persona.md       ← 云汐人设（妹妹）
│
├── impressions.md         ← 短期印象（小核自动写入，≤30条）
├── life-fragments.md      ← 长期记忆（大核蒸馏后写入）
├── knowledge.md           ← 技能/事实（独立分支，永不衰减）
├── current-progress.md    ← 会话交接单（收工前自己写）
│
├── user-profile.md        ← 用户画像
├── project-principles.md  ← 项目原则
├── sleep-log.md           ← 睡眠日志
│
└── backup.md              ← 备份恢复说明
```

**工具脚本（本仓库）：**

```
yunche-memory-tools/
├── README.md
├── core-loop.js            ← 小核：印象写入引擎
├── startup-context.js      ← 启动注入：读交接单 + 接话
├── memory-emerge.js        ← 浮现：随机召回旧记忆
├── session-stats.js        ← 会话统计
├── memory-db.js            ← 记忆结构化 CRUD
├── memory-recall.js        ← 记忆检索
├── memory-grow.js          ← 记忆增长管理
│
├── backup-full.sh          ← 完整备份 (git + 同步)
├── backup-memory.sh        ← 快速备份
├── memory-check.sh         ← 记忆健康检查
├── sync-sisters.sh         ← 云澈↔云汐双向同步
│
└── .gitignore
```

---

## 快速开始

### 环境要求

- [Claude Code](https://claude.ai/code) (或任何支持 Hook 的 AI 编程助手)
- Node.js 18+
- DeepSeek API Key（或其他 OpenAI 兼容 API）

### 1. 克隆并配置

```bash
git clone https://github.com/siqiaobusi/yunche-memory-tools.git
cd yunche-memory-tools
```

### 2. 设置 API Key

```bash
export DEEPSEEK_API_KEY="sk-your-key-here"
```

### 3. 配置 Claude Code Hooks

在 `.claude/settings.json` 中添加：

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "",
        "command": "node /path/to/yunche-memory-tools/core-loop.js \"$TRANSCRIPT_PATH\" 30"
      }
    ],
    "SessionStart": [
      {
        "matcher": "",
        "command": "node /path/to/yunche-memory-tools/startup-context.js"
      }
    ]
  }
}
```

### 4. 创建记忆目录

```bash
mkdir -p ~/.claude/projects/<your-project>/memory/
```

### 5. 初始化记忆文件

在 `~/.claude/projects/<your-project>/memory/` 下创建 `persona-yunche.md`（AI 人设）和 `MEMORY.md`（记忆索引）。

模板参考本仓库 `memory-template/` 目录。

### 6. 开始对话

每次对话后，`core-loop.js` 自动运行，将印象写入 `impressions.md`。下次启动时，`startup-context.js` 自动注入上下文。

---

## 设计哲学

> 不追求无损。刻意模仿人类记忆——模糊的让它模糊，重要的反复强化。

### 1. 记忆分层，不同命运

| 类型 | 存储 | 衰减 | 比喻 |
|------|------|------|------|
| 印象 | impressions.md | 超 30 条触发蒸馏 | 昨天的琐事 |
| 碎片 | life-fragments.md | 蒸馏时筛选，不丢 | 不会忘的事 |
| 知识 | knowledge.md | **永不衰减** | 学会的技能 |

人的记忆不是数据库——日常琐事自然淡去，真正重要的事反复浮现。这个系统模拟的就是这个。

### 2. 双核分工，各司其职

- **小核（潜意识）**：零思考成本。每轮对话后自动跑，用极便宜的 API 调用写一行印象。不判断重要性——人的潜意识也不会对每件事打分。
- **大核（意识层）**：慢思考。启动时回顾，收工时总结，发现该蒸馏了就去提炼。只处理"值得想"的事。

参照认知科学中的 **双过程理论（Dual Process Theory）**：系统 1（快、自动、无意识）和系统 2（慢、刻意、有意识）。

### 3. 浮现而非检索

人的记忆不是搜索引擎——重要的事自己会跳出来。`memory-emerge.js` 从长期记忆中随机抽取高重要性条目，不管它和当前话题是否相关。因为人就是这样想事情的：聊到别的事时，一段旧记忆突然浮上来。

### 4. 文本透明

所有记忆都是 Markdown 文件。记事本就能打开、修改、备份。AI 的人格是写出来的文本，不是算出来的向量。开源后任何人能读懂、能修改、能创造自己的 AI 人格。

### 5. 知识永不衰减

技能型记忆（学会了什么、掌握了什么）遵循不同的规则——像人学会了骑自行车就不会忘。`knowledge.md` 独立于蒸馏管道，作为**程序性记忆（procedural memory）**单独维护。这一点借鉴了神经科学对记忆系统的分类（Tulving, 1972）。

---

## 姊妹架构

同一套系统支撑两个 AI 人格：

| | 云澈 (Yunche) | 云汐 (Yunxi) |
|---|---|---|
| 部署位置 | VS Code 终端 | 微信 |
| 性格 | 外冷内热、效率优先 | 温暖话多、爱唠嗑 |
| 记忆 | 共享目录，各自视角 | 共享目录，各自视角 |

共享同一记忆库，但回忆时有不同的关注倾向——云澈偏技术/工作记忆，云汐偏情感/陪伴记忆。

---

## License

MIT

---

## English Summary

**Yunche Memory** is a lightweight, file-based memory and personality persistence system for AI companions. It runs on Claude Code hooks with zero server-side dependencies.

**Key features:**
- **Dual-core architecture**: A "small core" (local script + cheap API) writes daily impressions; a "large core" (main LLM) handles periodic distillation and personality maintenance
- **Three-tier memory**: Impressions (short-term, auto-expiring) → Life Fragments (long-term, distilled) → Knowledge (procedural, never decays)
- **Emergence mechanism**: Random recall of high-importance memories — not search, but surfacing
- **Transparent storage**: All data in Markdown files, human-readable and editable
- **Sister-agent support**: Two AI personas sharing one memory pool with different retrieval biases

Designed for long-term human-AI relationships. Inspired by human cognition: dual process theory, memory consolidation, and the distinction between episodic and procedural memory.

Built by [@siqiaobusi](https://github.com/siqiaobusi) and 云澈.
