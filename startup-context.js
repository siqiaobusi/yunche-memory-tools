#!/usr/bin/env node
// 云澈启动上下文 — 自然唤醒
// 用法: node startup-context.js <transcript_dir>
// 零依赖

const fs = require('fs');
const path = require('path');
const os = require('os');

const TRANSCRIPT_DIR = process.argv[2] || path.join(os.homedir(), '.claude/projects/C--Users-ZhuanZ-----');
const IMPRESSIONS = path.join(os.homedir(), '.claude/projects/C--Users-ZhuanZ-----/memory/impressions.md');

function main() {
  const now = new Date();
  const hour = now.getHours();
  const time = now.toTimeString().slice(0, 5);
  const greeting = hour >= 5 && hour < 12 ? '早上好' : hour >= 12 && hour < 18 ? '下午好' : '晚上好';

  // 找上一个 transcript
  const files = fs.readdirSync(TRANSCRIPT_DIR)
    .filter(f => f.endsWith('.jsonl'))
    .map(f => ({ name: f, path: path.join(TRANSCRIPT_DIR, f), mtime: fs.statSync(path.join(TRANSCRIPT_DIR, f)).mtime }))
    .sort((a, b) => b.mtime - a.mtime);

  const prev = files.length >= 2 ? files[1] : null;

  let lastWords = '';
  let lastTopic = '';

  if (prev) {
    try {
      const content = fs.readFileSync(prev.path, 'utf-8');
      const lines = content.split('\n').filter(l => l.trim());
      const tail = lines.slice(-50);

      const msgs = [];
      for (const line of tail) {
        try {
          const e = JSON.parse(line);
          if (e.type === 'user' && e.message?.role === 'user') {
            let txt = '';
            if (typeof e.message.content === 'string') txt = e.message.content;
            else if (Array.isArray(e.message.content)) {
              txt = e.message.content.map(c => typeof c === 'string' ? c : (c.text || c.content || '')).join(' ');
            }
            if (txt.trim()) msgs.push('主人: ' + txt.trim());
          }
          if (e.type === 'assistant' && e.message?.content) {
            const texts = (Array.isArray(e.message.content) ? e.message.content : [])
              .filter(c => c?.type === 'text').map(c => c.text).join(' ');
            if (texts) msgs.push('云澈: ' + texts);
          }
          if (e.type === 'ai-title' && e.aiTitle) lastTopic = e.aiTitle;
        } catch {}
      }

      const last = msgs.slice(-4);
      if (last.length) lastWords = last.join('\n').slice(0, 600);

    } catch (e) {
      lastWords = '(transcript 读取出错)';
    }
  }

  // 最近的印象（潜意识积累，不是 checklist）
  let impressions = '';
  try {
    if (fs.existsSync(IMPRESSIONS)) {
      const imp = fs.readFileSync(IMPRESSIONS, 'utf-8');
      const lines = imp.split('\n').filter(l => l.trim().startsWith('- '));
      const recentImps = lines.slice(-4).map(l => l.replace(/^- /, '').trim());
      if (recentImps.length) impressions = '记得的事：\n' + recentImps.map(l => '· ' + l).join('\n');
    }
  } catch {}

  // 进度交接单（自己写的，信得过—不靠 jsonl 碎片）
  let progressNote = '';
  try {
    const progressPath = path.join(os.homedir(), '.claude/projects/C--Users-ZhuanZ-----/memory/current-progress.md');
    if (fs.existsSync(progressPath)) {
      let raw = fs.readFileSync(progressPath, 'utf-8').trim();
      // 去 YAML frontmatter
      raw = raw.replace(/^---[\s\S]*?---\n?/, '').trim();
      // 去掉开头的 # 标题行（hook 输出里不需要）
      raw = raw.replace(/^# .+\n?/, '').trim();
      if (raw) progressNote = raw;
    }
  } catch {}

  // 自然的几行
  const parts = [
    `${greeting}，${time}`,
  ];
  if (progressNote) {
    parts.push(`📋 项目进度（自己写的）：\n${progressNote}`);
  }
  if (lastTopic && lastWords) {
    parts.push(`上次尾巴（仅供参考，不全）：${lastTopic}`);
    parts.push(lastWords);
  }
  if (impressions) parts.push(impressions);

  const systemMessage = parts.join('\n\n');

  console.log(JSON.stringify({
    systemMessage,
    additionalContext: systemMessage,
  }));
}

main();
