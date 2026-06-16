// 云澈 · 延迟戳人
// 用法: node poke-me-later.js "消息" 分钟数
// 例: node poke-me-later.js "还在想吗？" 5
// 效果: 5分钟后通过微信发消息给主人

const { execSync } = require('child_process');
const path = require('path');

const message = process.argv[2];
const minutes = parseInt(process.argv[3]) || 5;
const seconds = minutes * 60;

if (!message) {
  console.log('用法: node poke-me-later.js "消息" 分钟数');
  process.exit(1);
}

const pokeScript = path.join(__dirname, 'poke-via-wechat.js');
const cmd = `start /min cmd /c "timeout /t ${seconds} /nobreak >nul && node \\"${pokeScript}\\" \\"${message}\\""`;

console.log(`将在 ${minutes} 分钟后发送: "${message}"`);
execSync(cmd, { windowsHide: true, timeout: 5000 });
console.log('定时器已启动（后台静默）');
