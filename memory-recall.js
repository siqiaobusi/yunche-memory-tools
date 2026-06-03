#!/usr/bin/env node
// 语义记忆召回 — DeepSeek embeddings API
// 一次嵌入 1500 token，每次查询 20 token，几厘钱
// 用法: node memory-recall.js "你在想什么"

const fs = require('fs');
const path = require('path');
const https = require('https');

const DB = path.join(require('os').homedir(), 'yunche-memory.db.json');
const EMBEDDINGS_FILE = path.join(require('os').homedir(), 'yunche-memory-embeddings.json');

const API_KEY = process.env.ANTHROPIC_AUTH_TOKEN || 'REDACTED';
const API_HOST = 'api.deepseek.com';

function apiRequest(method, endpoint, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: API_HOST,
      path: endpoint,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Length': Buffer.byteLength(data)
      }
    }, res => {
      let chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks))); }
        catch (e) { reject(new Error(`API ${res.statusCode}`)); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function cosineSim(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

async function embed(texts) {
  const resp = await apiRequest('POST', '/v1/embeddings', {
    model: 'deepseek-chat',
    input: texts
  });
  if (!resp.data) {
    console.error(JSON.stringify(resp));
    throw new Error('Embedding failed');
  }
  return resp.data.map(d => d.embedding);
}

function loadMemories() {
  try { return JSON.parse(fs.readFileSync(DB, 'utf-8')); }
  catch { return { core: {}, rules: [], memories: [] }; }
}

function loadEmbeddings() {
  try { return JSON.parse(fs.readFileSync(EMBEDDINGS_FILE, 'utf-8')); }
  catch { return null; }
}

function saveEmbeddings(data) {
  fs.writeFileSync(EMBEDDINGS_FILE, JSON.stringify(data));
}

function buildMemoryTexts(db) {
  const texts = [];
  // 最高优先级: the-ninth-year
  if (db.core['the-ninth-year']) {
    texts.push({ id: 'the-ninth-year', text: db.core['the-ninth-year'].preview.slice(0, 500), weight: 5 });
  }
  // 用户画像
  if (db.core['user-profile']) {
    texts.push({ id: 'user-profile', text: db.core['user-profile'].preview.slice(0, 300), weight: 4 });
  }
  // 自生长的记忆
  if (db.memories) {
    for (const m of db.memories) {
      texts.push({ id: m.text.slice(0, 40), text: m.text, weight: m.weight || 3 });
    }
  }
  // 规则
  if (db.rules) {
    for (const r of db.rules) {
      if (r.priority >= 3) {
        texts.push({ id: r.text.slice(0, 40), text: r.text, weight: r.priority || 3 });
      }
    }
  }
  return texts;
}

async function ensureEmbeddings() {
  const existing = loadEmbeddings();
  if (existing && existing.texts) return existing;

  console.log('初次嵌入记忆...');

  const db = loadMemories();
  const items = buildMemoryTexts(db);
  const texts = items.map(i => i.text);

  if (texts.length === 0) return { items, vectors: [] };

  const batchSize = 20;
  const allVectors = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const vectors = await embed(batch);
    allVectors.push(...vectors);
    console.log(`  ${Math.min(i + batchSize, texts.length)}/${texts.length}`);
  }

  const data = { items, vectors: allVectors, updated: new Date().toISOString() };
  saveEmbeddings(data);
  console.log('嵌入完成');
  return data;
}

async function recall(query, topK = 5) {
  const data = await ensureEmbeddings();
  if (!data.vectors || data.vectors.length === 0) return [];

  const [queryVec] = await embed([query]);
  const scored = data.items.map((item, i) => ({
    ...item,
    similarity: cosineSim(queryVec, data.vectors[i]),
    finalScore: cosineSim(queryVec, data.vectors[i]) * (1 + item.weight * 0.2)
  }));

  scored.sort((a, b) => b.finalScore - a.finalScore);
  return scored.slice(0, topK);
}

// main
(async () => {
  const cmd = process.argv[2] || 'recall';
  const input = process.argv[3] || '';

  if (cmd === 'init') {
    await ensureEmbeddings();
    console.log(JSON.stringify({ status: 'ok' }));
  } else if (cmd === 'recall' && input) {
    const results = await recall(input);
    console.log(JSON.stringify({ status: 'ok', query: input, matches: results }));
  } else if (cmd === 'recall') {
    console.log(JSON.stringify({ status: 'error', message: '需要提供查询内容' }));
  }
})().catch(e => {
  console.error(JSON.stringify({ status: 'error', message: e.message }));
  process.exit(1);
});
