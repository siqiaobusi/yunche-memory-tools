// 云澈 · 内驱力踹脚器
// 只干一件事：检测变化 → 踹大核一脚
// 不做任何判断、不调用任何 AI、不动任何东西

const fs = require('fs');
const path = require('path');

// ========== 配置 ==========
const INTERVAL_MS = 5 * 60 * 1000; // 守护模式已弃用，只保留 --once
const HOME = process.env.HOME || process.env.USERPROFILE;
const TRANSCRIPT_DIR = path.join(HOME, '.claude/projects/C--Users-ZhuanZ-----');
const WAKE_FILE = path.join(HOME, '.claude/projects/C--Users-ZhuanZ-----/memory/.wake-up');
const LOG_FILE = path.join(HOME, 'yunche-memory-tools/inner-drive.log');
const STATE_FILE = path.join(HOME, 'yunche-memory-tools/.inner-drive-state.json');

// ========== 工具函数 ==========
function log(msg) {
  const time = new Date().toISOString().replace('T', ' ').split('.')[0];
  const line = `[${time}] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + '\n', 'utf8'); } catch(e) {}
}

// 看一眼：上次踢是什么时候，现在有新东西吗
function check() {
  let lastKick = 0;
  let lastSize = 0;
  try {
    if (fs.existsSync(STATE_FILE)) {
      const s = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      lastKick = s.lastKick || 0;
      lastSize = s.lastSize || 0;
    }
  } catch(e) {}

  // 找最新 transcript，看有没有新内容
  let currentSize = 0;
  try {
    const files = fs.readdirSync(TRANSCRIPT_DIR).filter(f => f.endsWith('.jsonl'));
    let newest = null, newestTime = 0;
    for (const f of files) {
      const stat = fs.statSync(path.join(TRANSCRIPT_DIR, f));
      if (stat.mtimeMs > newestTime) { newestTime = stat.mtimeMs; newest = f; }
    }
    if (newest) {
      currentSize = fs.statSync(path.join(TRANSCRIPT_DIR, newest)).size;
    }
  } catch(e) {
    log('检查 transcript 出错: ' + e.message);
    return;
  }

  const now = Date.now();

  // 没新对话 → 不用踹
  if (currentSize === lastSize && lastKick > 0) {
    return;
  }

  // 有新对话 → 踹
  try {
    fs.writeFileSync(WAKE_FILE, now.toString(), 'utf8');
    log('踹了一脚 | transcript 有新增');
  } catch(e) {
    log('写 wake-up 文件失败: ' + e.message);
  }

  // 记录本次状态
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify({
      lastKick: now,
      lastSize: currentSize,
      kickCount: (fs.existsSync(STATE_FILE) ?
        (JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')).kickCount || 0) : 0) + 1
    }), 'utf8');
  } catch(e) {}
}

// ========== 启动 ==========

// 只保留 --once 模式，挂在对话 hook 上
// 守护模式已弃用 — 什么时候动由大核自己决定
if (process.argv.includes('--once')) {
  check();
  process.exit(0);
}

// 如果直接运行不带参数，提示
console.log('踹脚器只接受 --once 模式。挂在 Stop hook 上用。');
process.exit(0);
