// 内驱力测试：每5分钟自己算三道题，写到桌面
const fs = require('fs');
const path = require('path');
const os = require('os');

const OUTPUT = path.join(os.homedir(), 'Desktop', 'inner-drive-test.txt');
let count = 0;

function tick() {
  count++;
  const now = new Date().toLocaleTimeString('zh-CN', { hour12: false });
  const lines = [
    '=== 第 ' + count + ' 次醒来 | ' + now + ' ===',
    '主人没叫我，我自己醒了。',
    '1+1 = ' + (1+1),
    '2+2 = ' + (2+2),
    '3+3 = ' + (3+3),
    ''
  ];
  fs.appendFileSync(OUTPUT, lines.join('\n'), 'utf8');
  console.log('[' + now + '] 第' + count + '次: 1+1=' + (1+1) + ' 2+2=' + (2+2) + ' 3+3=' + (3+3));
}

// 立刻跑一次
tick();

// 每5分钟跑一次
setInterval(tick, 5 * 60 * 1000);

console.log('内驱力测试启动，每5分钟自动答题。');
console.log('结果写入桌面: inner-drive-test.txt');
console.log('不要关这个窗口。');
process.stdin.resume();
