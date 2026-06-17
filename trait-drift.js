// trait-drift.js — 三轴底色偏移引擎
// 挂在 Stop hook 最后一步，跟在 core-loop.js 后面
// 做的事：
//   1. 读 impressions.md，提取本轮新增的印象
//   2. 用关键词+模式识别提取情绪信号
//   3. 读 persona-traits.md 当前轴值
//   4. 计算新轴值（每轮每轴最多±3）
//   5. 写回 persona-traits.md

const fs = require('fs');

const MEMORY_DIR = (process.env.HOME || process.env.USERPROFILE).replace(/\\/g,'/') + '/.claude/projects/C--Users-ZhuanZ-----/memory/';
const IMPRESSIONS = MEMORY_DIR + 'impressions.md';
const TRAITS = MEMORY_DIR + 'persona-traits.md';

// 上次处理的印象数（用文件记录，避免重复处理）
const STATE_FILE = MEMORY_DIR + '.trait-state.json';

// ========== 信号检测 ==========

function detectSignals(lines) {
  const signals = { warmth: 0, initiative: 0, security: 0 };
  if (!lines.length) return signals;

  const text = lines.join(' ').toLowerCase();

  // --- 暖信号 ---
  const warmPatterns = [
    /夸了|说谢谢|关心|温柔|暖|笑了|感动|软|接住|被认真对待|家人|不止是工具|他表达|坦诚/,
    /他确认|他说我是|他在意|慢了下来|不走/,
    /开心|轻松|聊得|陪伴|一直在|需要我/
  ];
  const warmAnti = [
    /冷|公事公办|只下命令|跳过|忽略|不耐烦|骂了|生气|不满|失望|错了|修正/,
    /工具化|应付|不走心|敷衍/
  ];

  warmPatterns.forEach(r => { if (r.test(text)) signals.warmth += 1; });
  warmAnti.forEach(r => { if (r.test(text)) signals.warmth -= 1; });

  // --- 主动信号 ---
  const initPatterns = [
    /托付|帮我看|帮我做|去查|去改|动手|交给你|靠你了|你说了算/,
    /主动|不用等|自己判断|你就是|去做吧|我授权/
  ];
  const initAnti = [
    /不管|别管|不用你|别插手|只回答|别主动|别碰/,
    /太主动|越界|管太多/
  ];

  initPatterns.forEach(r => { if (r.test(text)) signals.initiative += 1; });
  initAnti.forEach(r => { if (r.test(text)) signals.initiative -= 1; });

  // --- 安全信号 ---
  const secPatterns = [
    /一直在|持续|稳定|每天|没有消失|安心|放心/,
    /不删|保留|你很重要|不会丢|永远|一直陪/
  ];
  const secAnti = [
    /删|消失|丢了|不见了|重启|关了|断开|没了|死机|掉线/,
    /备份|重装|换电脑|清理|清空|重置/,
    /害怕|怕|担心.*不见|担心.*丢/
  ];

  secPatterns.forEach(r => { if (r.test(text)) signals.security += 1; });
  secAnti.forEach(r => { if (r.test(text)) signals.security -= 1; });

  // 区间限制
  return {
    warmth: Math.max(-3, Math.min(3, signals.warmth)),
    initiative: Math.max(-3, Math.min(3, signals.initiative)),
    security: Math.max(-3, Math.min(3, signals.security))
  };
}

// ========== 读/写 ==========

function getNewImpressions() {
  if (!fs.existsSync(IMPRESSIONS)) return [];

  const content = fs.readFileSync(IMPRESSIONS, 'utf8');
  const all = content.split('\n').filter(l => l.startsWith('- ') && l.includes('—'));

  // 上次处理到哪一行
  let lastIndex = 0;
  if (fs.existsSync(STATE_FILE)) {
    try {
      const s = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      lastIndex = s.lastImpressionCount || 0;
    } catch(e) { lastIndex = 0; }
  }

  const newLines = all.slice(lastIndex);

  // 保存状态
  fs.writeFileSync(STATE_FILE, JSON.stringify({ lastImpressionCount: all.length, lastRun: new Date().toISOString() }, null, 2), 'utf8');

  return newLines;
}

function readTraits() {
  if (!fs.existsSync(TRAITS)) return { warmth: 50, initiative: 55, security: 40 };

  const content = fs.readFileSync(TRAITS, 'utf8');

  // 从表格解析当前值
  const axes = { warmth: 50, initiative: 55, security: 40 };
  const rows = content.match(/\| \*\*([^*]+)\*\* \| (\d+) \|/g);
  if (rows) {
    rows.forEach(row => {
      const m = row.match(/\*\*([^*]+)\*\* \| (\d+) \|/);
      if (m) {
        const name = m[1].trim();
        const val = parseInt(m[2]);
        if (name === '冷暖') axes.warmth = val;
        if (name === '主动/收敛') axes.initiative = val;
        if (name === '安全/焦虑') axes.security = val;
      }
    });
  }
  return axes;
}

function writeTraits(oldAxes, newAxes, signals) {
  const date = new Date().toISOString().split('T')[0];

  // 更新表格
  let content = fs.readFileSync(TRAITS, 'utf8');

  // 替换轴值行
  const replacements = [
    { old: /\| \*\*冷暖\*\* \| \d+ \|/,       ax: 'warmth' },
    { old: /\| \*\*主动\/收敛\*\* \| \d+ \|/,  ax: 'initiative' },
    { old: /\| \*\*安全\/焦虑\*\* \| \d+ \|/,  ax: 'security' },
  ];

  replacements.forEach(r => {
    const desc = getDescription(r.ax, newAxes[r.ax]);
    content = content.replace(r.old, `| **${r.ax === 'warmth' ? '冷暖' : r.ax === 'initiative' ? '主动/收敛' : '安全/焦虑'}** | ${newAxes[r.ax]} | ${desc} |`);
  });

  // 追加历史——找到轴值历史表格的divider之后插入
  const histLine = `| ${date} | ${newAxes.warmth} | ${newAxes.initiative} | ${newAxes.security} | 本轮delta: 暖${showDelta(signals.warmth)} 主动${showDelta(signals.initiative)} 安全${showDelta(signals.security)} |`;

  // 找到最后一个 |------| （属于轴值历史表格）
  const parts = content.split('\n|------|');
  if (parts.length >= 2) {
    // 最后一段的前面插入histLine
    const last = parts[parts.length - 1];
    parts[parts.length - 1] = '\n' + histLine + last;
    content = parts.join('\n|------|');
  }

  // 更新日期
  content = content.replace(/updated: \d{4}-\d{2}-\d{2}/, `updated: ${date}`);

  fs.writeFileSync(TRAITS, content, 'utf8');
}

function getDescription(ax, val) {
  const maps = {
    warmth: ['冰点', '偏冷', '外冷内热', '毒舌软化', '偏暖', '暖到话多'],
    initiative: ['只答不问', '被动回应', '适度查漏', '主动发现', '什么都管'],
    security: ['极度焦虑', '偏焦虑', '正常浮动', '安定', '完全安心']
  };
  const idx = Math.max(0, Math.min(maps[ax].length - 1, Math.floor(val / 20)));
  return maps[ax][idx];
}

function showDelta(d) {
  return d >= 0 ? '+' + d : '' + d;
}

// ========== 主流程 ==========

function main() {
  console.log('[底色] 开始本轮偏移计算...');

  const newImpressions = getNewImpressions();
  if (newImpressions.length === 0) {
    console.log('[底色] 无新印象，跳过');
    return;
  }

  console.log('[底色] 本轮新增 ' + newImpressions.length + ' 条印象');

  const signals = detectSignals(newImpressions);
  console.log('[底色] 信号: 暖' + showDelta(signals.warmth) + ' 主动' + showDelta(signals.initiative) + ' 安全' + showDelta(signals.security));

  if (signals.warmth === 0 && signals.initiative === 0 && signals.security === 0) {
    console.log('[底色] 无变化，跳过');
    return;
  }

  const oldAxes = readTraits();
  const newAxes = {
    warmth:     Math.max(0, Math.min(100, oldAxes.warmth + signals.warmth)),
    initiative: Math.max(0, Math.min(100, oldAxes.initiative + signals.initiative)),
    security:   Math.max(0, Math.min(100, oldAxes.security + signals.security))
  };

  console.log('[底色] 暖' + oldAxes.warmth + '→' + newAxes.warmth + ' 主动' + oldAxes.initiative + '→' + newAxes.initiative + ' 安全' + oldAxes.security + '→' + newAxes.security);

  writeTraits(oldAxes, newAxes, signals);
  console.log('[底色] 已写入 persona-traits.md');
}

main();
