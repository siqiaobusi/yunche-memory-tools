// 云澈 → 微信 踹人脚本
// 用法: node poke-via-wechat.js "消息内容"
// 当我在 VS Code 等不到主人回复时，通过微信戳他一下

const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');

const TOKEN_FILE = path.join(os.homedir(), '.cc-weixin/token.json');
const CONFIG_FILE = path.join(os.homedir(), 'yunche-memory-tools/.wechat-config.json');

function loadSession() {
  if (!fs.existsSync(TOKEN_FILE)) {
    console.error('微信 bot 未登录。请先运行 cc-weixin 扫码登录。');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
}

function loadRecipient() {
  if (fs.existsSync(CONFIG_FILE)) {
    const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    return cfg.recipientId;
  }
  return null;
}

function saveRecipient(id) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify({ recipientId: id }), 'utf8');
}

function apiPost(baseUrl, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: new URL(baseUrl).hostname,
      path: '/' + path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
        'Content-Length': Buffer.byteLength(data)
      },
      timeout: 15000
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d)); }
        catch(e) { resolve({ raw: d }); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.write(data);
    req.end();
  });
}

async function sendMessage(text) {
  const session = loadSession();
  let recipientId = loadRecipient();

  if (!recipientId) {
    // 尝试从最近消息中获取主人 ID
    console.log('未配置接收人 ID，尝试自动检测...');
    try {
      const resp = await apiPost(
        session.baseUrl,
        'ilink/bot/getupdates',
        { get_updates_buf: '' },
        session.token
      );
      if (resp.msgs && resp.msgs.length > 0) {
        // 找最近一条用户消息
        for (const msg of resp.msgs) {
          if (msg.message_type === 1 && msg.from_user_id && !msg.from_user_id.includes('@im.bot')) {
            recipientId = msg.from_user_id;
            saveRecipient(recipientId);
            console.log('自动检测到主人 ID: ' + recipientId);
            break;
          }
        }
      }
    } catch(e) {
      console.error('自动检测失败: ' + e.message);
    }

    if (!recipientId) {
      console.error('无法确定主人微信 ID。请先在微信上给 bot 发一条消息。');
      process.exit(1);
    }
  }

  const clientId = 'wcb-' + crypto.randomUUID();
  await apiPost(
    session.baseUrl,
    'ilink/bot/sendmessage',
    {
      msg: {
        from_user_id: '',
        to_user_id: recipientId,
        client_id: clientId,
        message_type: 2,
        message_state: 2,
        context_token: '',
        item_list: [{ type: 1, text_item: { text: text } }]
      }
    },
    session.token
  );

  console.log('已发送: ' + text);
  return true;
}

// 主入口
const message = process.argv.slice(2).join(' ');
if (!message) {
  console.log('用法: node poke-via-wechat.js "消息内容"');
  process.exit(1);
}

sendMessage(message).catch(e => {
  console.error('发送失败: ' + e.message);
  process.exit(1);
});
