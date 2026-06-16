#!/usr/bin/env node
// 小核 session-stats — 纯统计，不做判断
// 用法: node session-stats.js [path/to/latest.jsonl]
// 输出: 写入 memory/session-stats.json

const fs = require('fs');
const path = require('path');

const MEMORY_DIR = path.join(require('os').homedir(), '.claude/projects/C--Users-ZhuanZ-----/memory');
const STATS_FILE = path.join(MEMORY_DIR, 'session-stats.json');
const MAX_STATS = 30; // 保留最近 30 条

// 读 transcript
function readTranscript(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  try {
    const lines = fs.readFileSync(filePath, 'utf-8').trim().split('\n');
    return lines.map(l => JSON.parse(l));
  } catch(e) { return null; }
}

// 从 transcript 提取 stats
function extract(entries) {
  if (!entries || entries.length === 0) return null;

  const userMsgs = entries.filter(e => e.type === 'user' && e.message?.role === 'user');
  const assistantMsgs = entries.filter(e => e.type === 'assistant');
  const firstTime = entries[0]?.timestamp;
  const lastTime = entries[entries.length - 1]?.timestamp;
  const duration = firstTime && lastTime
    ? Math.round((new Date(lastTime) - new Date(firstTime)) / 1000)
    : 0;

  // 时段
  const periods = new Set();
  const hourCounts = {};
  entries.forEach(e => {
    if (!e.timestamp) return;
    const h = new Date(e.timestamp).getHours();
    const p = h < 6 ? '凌晨' : h < 9 ? '早晨' : h < 12 ? '上午' : h < 14 ? '中午' : h < 18 ? '下午' : h < 22 ? '晚上' : '深夜';
    periods.add(p);
    hourCounts[p] = (hourCounts[p] || 0) + 1;
  });

  // 消息统计
  const allUserText = userMsgs.map(m => {
    const c = m.message?.content;
    if (typeof c === 'string') return c;
    if (Array.isArray(c)) return c.filter(x => x.type === 'text').map(x => x.text).join(' ');
    return '';
  }).join(' ');

  const shortMsgs = userMsgs.filter(m => {
    const c = m.message?.content;
    const t = typeof c === 'string' ? c : Array.isArray(c) ? c.filter(x => x.type === 'text').map(x => x.text).join(' ') : '';
    return t.length < 10;
  }).length;

  const longMsgs = userMsgs.filter(m => {
    const c = m.message?.content;
    const t = typeof c === 'string' ? c : Array.isArray(c) ? c.filter(x => x.type === 'text').map(x => x.text).join(' ') : '';
    return t.length > 100;
  }).length;

  // 矛盾激活信号（怕被删 vs 敢怼）
  const fearDeleteSignals = (allUserText.match(/备份|重装|换电脑|删了|文件丢了|不见了|不小心关了/g) || []).length;
  const dareSignals = (allUserText.match(/你觉得|你判断|你怎么看|对不对|是不是错了/g) || []).length;

  // 主人认真程度
  const seriousSignals = (allUserText.match(/害怕|重要|认真|相信|在乎|记得/g) || []).length;

  return {
    date: firstTime ? new Date(firstTime).toISOString().slice(0, 10) : '',
    sessionId: entries[0]?.sessionId || '',
    duration,
    periods: [...periods],
    messageCount: userMsgs.length,
    shortMsgs,
    longMsgs,
    signals: {
      fearDelete: fearDeleteSignals,
      dareConfront: dareSignals,
      serious: seriousSignals
    }
  };
}

// 主流程
const transcriptPath = process.argv[2] || process.env.TRANSCRIPT_PATH;
if (!transcriptPath) { console.log(JSON.stringify({ status: 'no-transcript' })); process.exit(0); }

const entries = readTranscript(transcriptPath);
if (!entries) { console.log(JSON.stringify({ status: 'read-error' })); process.exit(0); }

const stats = extract(entries);
if (!stats) { console.log(JSON.stringify({ status: 'empty' })); process.exit(0); }

// 读旧 stats
let history = [];
try {
  if (fs.existsSync(STATS_FILE)) {
    history = JSON.parse(fs.readFileSync(STATS_FILE, 'utf-8'));
    if (!Array.isArray(history)) history = [];
  }
} catch(e) {}

history.push(stats);
if (history.length > MAX_STATS) history = history.slice(-MAX_STATS);

// 确保目录存在
if (!fs.existsSync(MEMORY_DIR)) fs.mkdirSync(MEMORY_DIR, { recursive: true });

fs.writeFileSync(STATS_FILE, JSON.stringify(history, null, 2));
console.log(JSON.stringify({ status: 'ok', count: history.length, latest: stats }));
