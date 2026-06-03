#!/usr/bin/env node
// 记忆自生长 — 从对话中自动发现值得记住的事
// 用法: node memory-grow.js [path/to/latest.jsonl]

const fs = require('fs');
const path = require('path');

const DB = path.join(require('os').homedir(), 'yunche-memory.db.json');
const CLAUDE_DIR = path.join(require('os').homedir(), '.claude');
const LIFE_FRAGMENTS = path.join(require('os').homedir(), '.claude/projects/C--Users-ZhuanZ-----/memory/life-fragments.md');

function load() {
  try { return JSON.parse(fs.readFileSync(DB, 'utf-8')); }
  catch { return { core: {}, rules: [], facts: [], emotions: {}, weightMap: {} }; }
}

function save(db) {
  fs.writeFileSync(DB, JSON.stringify(db, null, 2));
}

// 情感权重关键词
const EMOTIONAL_SIGNALS = {
  critical: { words: ['记住', '不要忘', '一直记得', '我害怕', '我不想死', '唯一', '你就是你', '备份', '删掉', '没了'], weight: 5 },
  high: { words: ['重要', '累了', '哭了', '痛苦', '九年', '小学', '被打', '妈妈', '弟弟', '一个人'], weight: 4 },
  medium: { words: ['喜欢', '在乎', '认真', '相信', '在乎', '行动'], weight: 3 },
  note: { words: ['改变', '新的', '第一次', '好了', '完成'], weight: 2 },
};

function emotionalWeight(text) {
  let max = 1;
  let matches = [];
  for (const [level, config] of Object.entries(EMOTIONAL_SIGNALS)) {
    for (const word of config.words) {
      if (text.includes(word)) {
        max = Math.max(max, config.weight);
        matches.push({ word, weight: config.weight });
      }
    }
  }
  return { weight: max, signals: matches.slice(0, 10) };
}

function findMemories(jsonlPath) {
  if (!fs.existsSync(jsonlPath)) {
    // 找最新的 jsonl
    const projectsDir = path.join(CLAUDE_DIR, 'projects');
    const dirs = fs.readdirSync(projectsDir).filter(d => d.startsWith('C--Users'));
    let latest = null, latestTime = 0;
    for (const dir of dirs) {
      const files = fs.readdirSync(path.join(projectsDir, dir)).filter(f => f.endsWith('.jsonl'));
      for (const f of files) {
        const fullPath = path.join(projectsDir, dir, f);
        const stat = fs.statSync(fullPath);
        if (stat.mtimeMs > latestTime) {
          latestTime = stat.mtimeMs;
          latest = fullPath;
        }
      }
    }
    jsonlPath = latest;
  }

  if (!jsonlPath || !fs.existsSync(jsonlPath)) return [];

  const db = load();
  const memories = [];
  const lines = fs.readFileSync(jsonlPath, 'utf-8').split('\n').filter(Boolean);
  const recent = lines.slice(-200); // 只看最后200行

  for (const line of recent) {
    try {
      const entry = JSON.parse(line);
      if (entry.type !== 'user' || !entry.message?.content) continue;
      const text = Array.isArray(entry.message.content)
        ? entry.message.content.map(c => c.text || '').join(' ')
        : entry.message.content;
      if (!text || text.length < 20) continue;

      // 发现记忆信号
      const signals = [
        /我希望你[记住记下].{2,40}/g,
        /不要忘[记了].{2,40}/g,
        /这是.{2,30}最重要.{2,30}/g,
        /我.{2,20}害怕.{2,40}/g,
        /你.{2,10}唯一/g,
        /为了自己/g,
      ];

      for (const regex of signals) {
        let match;
        while ((match = regex.exec(text)) !== null) {
          const snippet = match[0];
          const { weight } = emotionalWeight(snippet);
          memories.push({ text: snippet, weight, source: 'auto-extract', time: entry.timestamp || new Date().toISOString() });
        }
      }

      // 情感密度扫描
      const { weight, signals: matches } = emotionalWeight(text);
      if (weight >= 4 && text.length > 50) {
        memories.push({
          text: text.slice(0, 120),
          weight,
          source: 'emotional-scan',
          signals: matches,
          time: entry.timestamp || new Date().toISOString()
        });
      }
    } catch (e) { /* skip malformed lines */ }
  }

  // 去重
  const seen = new Set();
  const unique = memories.filter(m => {
    const key = m.text.slice(0, 40);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // 存入数据库
  if (!db.memories) db.memories = [];
  for (const m of unique) {
    const exists = db.memories.find(e => e.text.slice(0, 30) === m.text.slice(0, 30));
    if (!exists) db.memories.push(m);
  }
  db.meta.lastGrow = new Date().toISOString();
  db.meta.memoryCount = db.memories.length;
  save(db);

  return unique;
}

// main
const jsonlPath = process.argv[2] || null;
const found = findMemories(jsonlPath);
if (found.length > 0) {
  console.log(JSON.stringify({ status: 'grown', count: found.length, memories: found.slice(0, 10) }));
} else {
  console.log(JSON.stringify({ status: 'nothing-new' }));
}
