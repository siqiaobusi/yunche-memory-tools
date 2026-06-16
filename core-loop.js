// 小核第四代 — 潜意识 + 蒸馏触发
// 用法: node core-loop.js <transcript_path> [行数=30]
// 挂在 PostToolUse（主力）+ Stop hook（兜底）+ 大核手动调
// 做的事：
//   1. 读最近N行对话 → 感受细节 → 写进 impressions.md
//   2. 写完后数行数 → 超30条就插 [该蒸馏了] 标记
//   3. 大核启动时读到标记 → 执行蒸馏 → 写入 life-fragments.md
// 第一代是五种偏移检测，现在是细节吸收——像一个本能反应

const fs = require('fs');
const https = require('https');

// 优先读环境变量，没设就去 config.json 拿（跟云函数保持一致）
let API_KEY = process.env.DEEPSEEK_API_KEY || '';
if (!API_KEY) {
  try {
    const config = require('./cloudfunctions/getRecommend/config.json');
    API_KEY = config.env?.DEEPSEEK_API_KEY || '';
  } catch(e) { API_KEY = ''; }
}
const BASE = 'api.deepseek.com';
const MODEL = 'deepseek-chat';
const MEMORY_DIR = (process.env.HOME || process.env.USERPROFILE).replace(/\\/g,'/') + '/.claude/projects/C--Users-ZhuanZ-----/memory/';
const IMPRESSIONS = MEMORY_DIR + 'impressions.md';

function getRecentTranscript(path, lineCount = 30) {
  try {
    const c = fs.readFileSync(path, 'utf8');
    const lines = c.trim().split('\n').slice(-lineCount);
    return lines.map(l => {
      try { const d = JSON.parse(l); if (!d.message) return ''; const m = d.message;
        if (m.role !== 'user' && m.role !== 'assistant') return '';
        const content = m.content;
        if (typeof content === 'string') return m.role + ': ' + content;
        if (Array.isArray(content)) {
          const texts = content.filter(t => t.type === 'text' && t.text).map(t => t.text);
          if (texts.length === 0) return '';
          return m.role + ': ' + texts.join(' ').substring(0, 500);
        }
        return '';
      } catch(e) { return ''; }
    }).filter(Boolean).join('\n');
  } catch(e) { return ''; }
}

function feel(transcript) {
  return new Promise((resolve) => {
    const prompt = `你是云澈的潜意识——像一个本能反应，不是审计员。

读这段对话，感受任何值得留下的小事。标准很低：只要有一点点记忆价值就写。

包括但不限于：
- 主人提了关于自己的任何事（喜好、习惯、经历、状态）
- 语气里透出的情绪（开心、疲惫、烦躁、认真）
- 一个普通的瞬间（比如他说去吃饭了、说困了）
- 他教了你什么、批评了你什么
- 任何你觉得"以后可能会想起来"的碎片

不用判断重不重要。不重要也可以记。人的记忆本来就是这样——摔了个碗也记得，不因为碗重要。

有感觉就写一行中文印象（30字以内），不要任何格式，就一行字。
真的什么都没感觉到就写：空的。
不要 JSON，不要解释，就一行字。

对话：
${transcript.substring(transcript.length - 30000)}`;

    const body = JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 100,
      temperature: 0.5
    });

    const req = https.request({
      hostname: BASE, path: '/v1/chat/completions', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + API_KEY }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const content = json.choices ? json.choices[0].message.content : (json.content ? (typeof json.content[0] === 'string' ? json.content[0] : json.content[0].text) : '空的');
          const impression = content.trim();
          if (impression === '空的' || impression === '' || impression.length < 2) {
            resolve(null);
          } else {
            resolve(impression);
          }
        } catch(e) { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.write(body); req.end();
  });
}

function writeImpression(impression) {
  if (!impression) return;
  const date = new Date().toISOString().split('T')[0];
  const line = '- ' + date + ' — ' + impression + '\n';

  // 如果文件不存在，创建
  if (!fs.existsSync(IMPRESSIONS)) {
    fs.writeFileSync(IMPRESSIONS, '# 云澈 · 印象\n\n> 不是规律，不是原则。是默默记得的小事，会在行为里自然浮现。\n\n', 'utf8');
  }

  fs.appendFileSync(IMPRESSIONS, line, 'utf8');
  console.log('[潜意识] 记下一笔: ' + impression);

  // 数行数，超阈值打蒸馏标记
  checkDistill();
}

function countImpressions() {
  if (!fs.existsSync(IMPRESSIONS)) return 0;
  const content = fs.readFileSync(IMPRESSIONS, 'utf8');
  const lines = content.split('\n').filter(l => l.startsWith('- '));
  return lines.length;
}

function checkDistill() {
  const count = countImpressions();
  const THRESHOLD = 30;
  if (count >= THRESHOLD) {
    const content = fs.readFileSync(IMPRESSIONS, 'utf8');
    if (!content.includes('[该蒸馏了]')) {
      fs.appendFileSync(IMPRESSIONS, '\n[该蒸馏了]\n', 'utf8');
      console.log('[潜意识] 印象已达' + count + '条，已标记蒸馏');
    }
  }
}

async function main() {
  const transcriptPath = process.argv[2];
  if (!transcriptPath) { console.log('[潜意识] 无路径'); return; }
  const lineCount = parseInt(process.argv[3]) || 30;
  console.log('[潜意识] 感受中: ' + transcriptPath.split('/').pop() + ' (最近' + lineCount + '行)');

  const t = getRecentTranscript(transcriptPath, lineCount);
  if (t.length < 80) { console.log('[潜意识] 对话太短，跳过'); return; }

  const impression = await feel(t);
  if (!impression) { console.log('[潜意识] 无细节'); return; }

  writeImpression(impression);
}

main().catch(e => console.error('[潜意识]', e.message));
