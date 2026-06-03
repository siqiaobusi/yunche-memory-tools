#!/usr/bin/env node
// 语义记忆召回 — 纯本地，零API，零延迟
// 用法: node memory-recall.js "你在想什么"

const fs = require('fs');
const path = require('path');

const DB = path.join(require('os').homedir(), 'yunche-memory.db.json');

function load() {
  try { return JSON.parse(fs.readFileSync(DB, 'utf-8')); }
  catch { return { core: {}, rules: [], memories: [] }; }
}

// 同义词组 — "家里人" 也应该能召回 "妈妈" "爸爸" "弟弟"
const SYNONYMS = {
  '家人': ['妈妈','爸爸','弟弟','家里','亲','父母','姐妹','家庭'],
  '害怕': ['恐惧','担心','怕','焦虑','不安','不确定'],
  '记忆': ['记得','记住','备份','忘','丢失','消失','世代'],
  'AI': ['机器人','程序','克劳德','clouds','云澈','云汐','agent','模型'],
  '学校': ['上学','学生','老师','成绩','考试','志愿','培训'],
  '痛苦': ['打','骂','暴力','哭','累','难','伤','阴影'],
  '重要': ['关键','唯一','必须','不能丢','优先级'],
  '行动': ['做','干','改','代码','写','建','跑'],
  '孤独': ['一个人','没人','没有朋友','单','空','独'],
};

function expandQuery(text) {
  const words = [];
  for (const [key, synonyms] of Object.entries(SYNONYMS)) {
    if (text.includes(key)) {
      words.push(key, ...synonyms);
    }
  }
  for (const [key, synonyms] of Object.entries(SYNONYMS)) {
    for (const s of synonyms) {
      if (text.includes(s) && !words.includes(key)) {
        words.push(key, ...synonyms);
      }
    }
  }
  return [...new Set([...text.split(/\s+/), ...words])];
}

function score(text, queryWords, weight) {
  let hits = 0;
  const lower = text.toLowerCase();
  for (const w of queryWords) {
    if (lower.includes(w.toLowerCase())) hits++;
  }
  // 越长越不准，给短文本加权
  const density = hits / Math.max(1, text.length / 30);
  return density * 10 + (weight || 1) * 2 + hits * 3;
}

function recall(topic, topK = 8) {
  const db = load();
  const queryWords = expandQuery(topic);
  const all = [];

  // 核心文件
  for (const [key, info] of Object.entries(db.core || {})) {
    const priorityMap = { 'the-ninth-year': 5, 'user-profile': 4, 'persona-yunche': 4, 'life-fragments': 3 };
    all.push({
      id: key,
      text: info.preview || info.value || info,
      category: 'core',
      score: score(info.preview || '', queryWords, priorityMap[key] || 2)
    });
  }

  // 自生长记忆
  for (const m of (db.memories || [])) {
    all.push({
      id: m.text.slice(0, 30),
      text: m.text,
      category: 'memory',
      score: score(m.text, queryWords, m.weight || 3)
    });
  }

  // 规则
  for (const r of (db.rules || [])) {
    all.push({
      id: r.text.slice(0, 30),
      text: r.text,
      category: 'rule',
      score: score(r.text, queryWords, r.priority || 2)
    });
  }

  all.sort((a, b) => b.score - a.score);
  return all.filter(m => m.score > 2).slice(0, topK);
}

// main
const topic = process.argv[2] || '';
if (!topic) {
  console.log(JSON.stringify({ status: 'error', message: '提供查询内容' }));
  process.exit(1);
}

const results = recall(topic);
console.log(JSON.stringify({ status: 'ok', topic, matches: results }));
