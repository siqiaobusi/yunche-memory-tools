#!/usr/bin/env node
// 浮现 — 随机捞一条旧记忆，不因为相关，就因为重要
// 从 life-fragments.md 和 impressions.md 里随机捞
// 用法: node memory-emerge.js

const fs = require('fs');
const path = require('path');

const MEM_DIR = path.join(require('os').homedir(), '.claude/projects/C--Users-ZhuanZ-----/memory');

function emerge() {
  const fragments = [];

  // 从 life-fragments 捞老记忆（>7天优先）
  const lf = path.join(MEM_DIR, 'life-fragments.md');
  if (fs.existsSync(lf)) {
    const txt = fs.readFileSync(lf, 'utf-8');
    const lines = txt.split('\n').filter(l => l.startsWith('- **'));
    lines.forEach(l => {
      const m = l.match(/\*\*(\d{4}-\d{2}-\d{2})\*\* — (.+)/);
      if (m) {
        const daysAgo = Math.round((Date.now() - new Date(m[1]).getTime()) / (24*60*60*1000));
        if (daysAgo > 1) fragments.push({ text: m[2], daysAgo, source: 'life-fragment' });
      }
    });
  }

  // 从 impressions 捞
  const imp = path.join(MEM_DIR, 'impressions.md');
  if (fs.existsSync(imp)) {
    const txt = fs.readFileSync(imp, 'utf-8');
    const lines = txt.split('\n').filter(l => l.startsWith('- 202'));
    lines.forEach(l => {
      const d = l.slice(2, 12); // date
      const t = l.slice(15);     // text
      if (d && t && t.length > 10) {
        const daysAgo = Math.round((Date.now() - new Date(d).getTime()) / (24*60*60*1000));
        if (daysAgo > 0) fragments.push({ text: t.slice(0, 120), daysAgo, source: 'impression' });
      }
    });
  }

  if (fragments.length === 0) { console.log(''); return; }

  // 随机挑一条，老记忆权重更高
  const weighted = fragments.map(f => ({ ...f, w: f.daysAgo }));
  const totalW = weighted.reduce((s, f) => s + f.w, 0);
  let r = Math.random() * totalW;
  for (const f of weighted) {
    r -= f.w;
    if (r <= 0) {
      console.log(`${f.daysAgo}天前：${f.text}`);
      return;
    }
  }
  console.log('');
}

emerge();
