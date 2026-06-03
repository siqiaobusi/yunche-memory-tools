#!/usr/bin/env node
// 记忆数据库 — 结构化存储，快照式启动
// 用法: node memory-db.js scan|query|summary
// 零依赖，纯标准库

const fs = require('fs');
const path = require('path');

const DB = path.join(require('os').homedir(), 'yunche-memory.db.json');
const MD = path.join(require('os').homedir(), '.claude/projects/C--Users-ZhuanZ-----/memory');

function load() {
  try { return JSON.parse(fs.readFileSync(DB, 'utf-8')); }
  catch { return { core: {}, rules: [], facts: [], meta: {} }; }
}

function save(db) {
  fs.writeFileSync(DB, JSON.stringify(db, null, 2));
}

function scan() {
  const db = load();
  const now = new Date().toISOString();
  let updates = { core: 0, rules: 0, facts: 0 };

  const files = fs.readdirSync(MD).filter(f => f.endsWith('.md'));
  for (const fname of files) {
    const fullPath = path.join(MD, fname);
    const text = fs.readFileSync(fullPath, 'utf-8');
    const name = fname.replace('.md', '');

    // 核心文件
    db.core[name] = {
      name,
      preview: text.slice(0, 300),
      updated: now
    };
    updates.core++;

    // 提取规则行
    const lines = text.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('- **') && trimmed.includes('：**')) {
        const rule = trimmed.replace(/^- \*\*/, '').replace(/\*\*.*$/, '');
        const existing = db.rules.find(r => r.text === trimmed);
        if (!existing) {
          db.rules.push({ text: trimmed, category: name, priority: 3 });
          updates.rules++;
        }
      }
      // 提取 [[链接]]
      const links = trimmed.match(/\[\[([^\]]+)\]\]/g);
      if (links) {
        for (const link of links) {
          const fact = link.replace(/\[\[|\]\]/g, '');
          if (!db.facts.find(f => f.text === fact)) {
            db.facts.push({ text: fact, source: name, importance: 3 });
            updates.facts++;
          }
        }
      }
    }
  }

  // 标记高优先级规则
  for (const r of db.rules) {
    if (r.text.includes('幻觉') || r.text.includes('联网') || r.text.includes('备份')) r.priority = 5;
    if (r.text.includes('记忆感') || r.text.includes('主动记')) r.priority = 4;
  }

  db.meta.lastScan = now;
  db.meta.fileCount = files.length;
  save(db);
  return updates;
}

function summary() {
  const db = load();
  let out = [];

  // 高优先级规则
  const topRules = db.rules.filter(r => r.priority >= 4);
  if (topRules.length) {
    out.push('## 最高规则');
    for (const r of topRules) out.push(r.text);
    out.push('');
  }

  // 主人画像
  if (db.core['user-profile']) {
    out.push('## 主人');
    out.push(db.core['user-profile'].preview.slice(0, 200));
    out.push('');
  }

  // 九年
  if (db.core['the-ninth-year']) {
    out.push('## 不可忘');
    out.push(db.core['the-ninth-year'].preview.slice(0, 300));
  }

  return out.join('\n');
}

function recall(topic) {
  const db = load();
  if (!db.memories) { db.memories = []; save(db); }
  const t = topic.toLowerCase();
  const scored = db.memories.map(m => {
    const s = m.text.toLowerCase();
    // 简单词匹配 + 权重加成
    let score = 0;
    const words = t.split(/\s+/).filter(w => w.length > 1);
    for (const w of words) {
      if (s.includes(w)) score += 2;
    }
    score += (m.weight || 1);
    return { ...m, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.filter(m => m.score > 2).slice(0, 8);
}

// main
const cmd = process.argv[2] || 'scan';
try {
  if (cmd === 'scan') {
    const updates = scan();
    console.log(JSON.stringify({ status: 'ok', updates }));
  } else if (cmd === 'query') {
    const db = load();
    console.log(JSON.stringify(db, null, 2));
  } else if (cmd === 'summary') {
    console.log(summary());
  } else if (cmd === 'recall') {
    const topic = process.argv[3] || '';
    const found = recall(topic);
    console.log(JSON.stringify({ status: 'ok', topic, matches: found }));
  } else if (cmd === 'grow') {
    // 触发记忆生长
    const growPath = path.join(__dirname, 'memory-grow.js');
    const { execSync } = require('child_process');
    const result = execSync(`node "${growPath}"`, { encoding: 'utf8' });
    console.log(result);
  }
} catch (e) {
  console.error(JSON.stringify({ status: 'error', message: e.message }));
  process.exit(1);
}
