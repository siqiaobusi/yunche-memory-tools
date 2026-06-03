#!/usr/bin/env node
// 产品名汉化 — 英文→中文，让主人一眼看懂
// 用法: node translate-names.js [path/to/file.js]
// 不加参数则处理所有 used 数据文件

const fs = require('fs');
const path = require('path');

const BRAND_MAP = {
  'Lenovo': '联想', 'Xiaomi': '小米', 'Samsung': '三星',
  'Huawei': '华为', 'Honor': '荣耀', 'OnePlus': '一加',
  'Microsoft': '微软', 'Nokia': '诺基亚', 'OPPO': 'OPPO',
  'vivo': 'vivo', 'Redmi': 'Redmi', 'Apple': 'Apple',
  'ROG': 'ROG', 'Dell': '戴尔', 'HP': '惠普',
  'MSI': '微星', 'Acer': '宏碁', 'Legion': '联想 拯救者',
  'Surface': '微软 Surface', 'ThinkPad': 'ThinkPad',
  'Xiaoxin': '联想 小新', 'ThinkBook': '联想 ThinkBook',
  'MagicBook': '荣耀 MagicBook', 'MateBook': '华为 MateBook',
  'RedmiBook': 'Redmi Book', 'Zenbook': '华硕 灵耀',
  'OMEN': '惠普 暗影精灵', 'EliteBook': '惠普 EliteBook',
};

// 具体产品名替换
const NAME_REPLACEMENTS = [
  ['Lenovo Legion Y700 (2023)', '联想 拯救者 Y700 (2023)'],
  ['Lenovo Legion Y700 (2022)', '联想 拯救者 Y700 (2022)'],
  ['Lenovo Legion Y700 2025', '联想 拯救者 Y700 2025'],
  ['Lenovo Tab Extreme', '联想 Tab Extreme'],
  ['Lenovo Xiaoxin Pad Pro 2022', '联想 小新 Pad Pro 2022'],
  ['Lenovo Xiaoxin Pad 2022', '联想 小新 Pad 2022'],
  ['Legion Y7000P 2021', '联想 拯救者 Y7000P 2021'],
  ['Legion R9000P 2021', '联想 拯救者 R9000P 2021'],
  ['Legion Y9000P 2022', '联想 拯救者 Y9000P 2022'],
  ['Legion Y9000P 2023', '联想 拯救者 Y9000P 2023'],
  ['Xiaomi Pad 6 Pro', '小米 Pad 6 Pro'],
  ['Xiaomi Pad 6', '小米 Pad 6'],
  ['Xiaomi Pad 5 Pro', '小米 Pad 5 Pro'],
  ['Xiaomi Pad 5', '小米 Pad 5'],
  ['Xiaomi Pad 4 Plus', '小米 Pad 4 Plus'],
  ['Xiaomi Book Pro 16 2022', '小米 Book Pro 16 2022'],
  ['Xiaomi Redmi G Pro 2022', '小米 Redmi G Pro 2022'],
  ['Xiaomi Redmi Book 14', '小米 Redmi Book 14'],
  ['Samsung Galaxy Tab S9', '三星 Galaxy Tab S9'],
  ['Samsung Galaxy Tab S9 Ultra', '三星 Galaxy Tab S9 Ultra'],
  ['Samsung Galaxy Tab S8', '三星 Galaxy Tab S8'],
  ['Samsung Galaxy Tab S8 Ultra', '三星 Galaxy Tab S8 Ultra'],
  ['Samsung Galaxy Tab S7 FE', '三星 Galaxy Tab S7 FE'],
  ['Samsung Galaxy Tab S7', '三星 Galaxy Tab S7'],
  ['Samsung Galaxy Tab S6', '三星 Galaxy Tab S6'],
  ['Huawei MatePad Pro 11 (2022)', '华为 MatePad Pro 11 (2022)'],
  ['Huawei MatePad Pro 11 (2024)', '华为 MatePad Pro 11 (2024)'],
  ['Huawei MatePad Pro 13.2', '华为 MatePad Pro 13.2'],
  ['Huawei MatePad Pro 12.6 (2022)', '华为 MatePad Pro 12.6 (2022)'],
  ['Huawei MatePad 11 (2023)', '华为 MatePad 11 (2023)'],
  ['Huawei MatePad 10.8', '华为 MatePad 10.8'],
  ['Huawei MatePad Air', '华为 MatePad Air'],
  ['Huawei MediaPad M6', '华为 MediaPad M6'],
  ['Honor MagicPad 13', '荣耀 MagicPad 13'],
  ['Honor Pad V8 Pro', '荣耀 Pad V8 Pro'],
  ['OnePlus Pad', '一加 Pad'],
  ['Microsoft Surface Pro 9', '微软 Surface Pro 9'],
  ['Microsoft Surface Pro 8', '微软 Surface Pro 8'],
  ['Surface Go 2', '微软 Surface Go 2'],
  ['Surface Go 3', '微软 Surface Go 3'],
  ['Surface Laptop Studio', '微软 Surface Laptop Studio'],
  ['Nokia T20', '诺基亚 T20'],
  ['iPad Pro 11-inch (2022)', 'iPad Pro 11寸 (2022)'],
  ['iPad Pro 12.9-inch (2022)', 'iPad Pro 12.9寸 (2022)'],
  ['iPad Pro 11-inch (2018)', 'iPad Pro 11寸 (2018)'],
  ['iPad Pro 11-inch (2024)', 'iPad Pro 11寸 (2024)'],
  ['iPad Pro 13-inch (2024)', 'iPad Pro 13寸 (2024)'],
  ['iPad Air (6th generation)', 'iPad Air 6代'],
  ['iPad Air (3rd generation)', 'iPad Air 3代'],
  ['iPad mini (5th generation)', 'iPad mini 5代'],
  ['iPad (10th generation)', 'iPad 10代'],
  ['iPad (8th generation)', 'iPad 8代'],
  ['MateBook 14 2021', '华为 MateBook 14 2021'],
  ['MateBook D14', '华为 MateBook D14'],
  ['MagicBook 14 2022', '荣耀 MagicBook 14 2022'],
  ['Dell 灵越 7420', '戴尔 灵越 7420'],
  ['Dell G15 5520', '戴尔 G15 5520'],
  ['Dell XPS 15 9520', '戴尔 XPS 15 9520'],
  ['Dell XPS 13 Plus', '戴尔 XPS 13 Plus'],
  ['HP 战66 五代', '惠普 战66 五代'],
  ['HP EliteBook 845 G9', '惠普 EliteBook 845 G9'],
  ['OMEN 暗影精灵8', '惠普 暗影精灵8'],
  ['ROG 幻14 2022', 'ROG 幻14 2022'],
  ['ROG 幻16 2023', 'ROG 幻16 2023'],
  ['ROG 幻16 2022', 'ROG 幻16 2022'],
  ['ROG 幻X 2023', 'ROG 幻X 2023'],
  ['ROG 枪神6', 'ROG 枪神6'],
  ['ROG 枪神7 Plus', 'ROG 枪神7 Plus'],
  ['MacBook Air 15 M2', 'MacBook Air 15寸 M2'],
  ['iPad mini 2', 'iPad mini 2代'],
  ['iPad mini 4', 'iPad mini 4代'],
  // 全新平板
  ['iPad Pro 11-inch M4', 'iPad Pro 11寸 M4'],
  ['iPad Pro 13-inch M4', 'iPad Pro 13寸 M4'],
  ['iPad Air 11-inch M2', 'iPad Air 11寸 M2'],
  ['iPad Air 13-inch M2', 'iPad Air 13寸 M2'],
  ['iPad 10', 'iPad 10代'],
  ['iPad mini 7', 'iPad mini 7代'],
  ['Huawei MatePad Pro 11 2024', '华为 MatePad Pro 11 (2024)'],
  ['Huawei MatePad 11.5 S', '华为 MatePad 11.5 S'],
  ['Huawei MatePad 11.5', '华为 MatePad 11.5'],
  ['Huawei MatePad SE 11', '华为 MatePad SE 11'],
  ['Huawei MatePad Pro 12.2', '华为 MatePad Pro 12.2'],
  ['Xiaomi Pad 7 Pro', '小米 Pad 7 Pro'],
  ['Xiaomi Pad 7', '小米 Pad 7'],
  ['Xiaomi Pad 6S Pro 12.4', '小米 Pad 6S Pro 12.4'],
  ['Xiaomi Pad 6 Max 14', '小米 Pad 6 Max 14'],
  ['Redmi Pad Pro 5G', 'Redmi Pad Pro 5G'],
  ['OPPO Pad 3 Pro', 'OPPO Pad 3 Pro'],
  ['OPPO Pad Air 2', 'OPPO Pad Air 2'],
  ['OnePlus Pad Pro', '一加 Pad Pro'],
  ['vivo Pad 3 Pro', 'vivo Pad 3 Pro'],
  ['vivo Pad Air', 'vivo Pad Air'],
  ['Samsung Galaxy Tab S10 Ultra', '三星 Galaxy Tab S10 Ultra'],
  ['Samsung Galaxy Tab S10 Plus', '三星 Galaxy Tab S10 Plus'],
  ['Samsung Galaxy Tab S9 FE', '三星 Galaxy Tab S9 FE'],
  ['Samsung Galaxy Tab A9 Plus', '三星 Galaxy Tab A9 Plus'],
  ['Lenovo Xiaoxin Pad Pro 12.7 2025', '联想 小新 Pad Pro 12.7 2025'],
  ['Lenovo Xiaoxin Pad 2024', '联想 小新 Pad 2024'],
  ['Lenovo Tab P12', '联想 Tab P12'],
  ['Lenovo Tab Plus', '联想 Tab Plus'],
  ['Lenovo Legion Tab Gen4', '联想 拯救者 Y700 四代'],
  // 全新笔记本
  ['MacBook Air 13 M4', 'MacBook Air 13寸 M4'],
  ['MacBook Air 15 M4', 'MacBook Air 15寸 M4'],
  ['MacBook Air 13 M5', 'MacBook Air 13寸 M5'],
  ['MacBook Air 15 M5', 'MacBook Air 15寸 M5'],
  ['MacBook Pro 14 M4', 'MacBook Pro 14寸 M4'],
  ['MacBook Pro 14 M4 Pro', 'MacBook Pro 14寸 M4 Pro'],
  ['MacBook Pro 16 M4 Pro', 'MacBook Pro 16寸 M4 Pro'],
  ['MacBook Pro 14 M4 Max', 'MacBook Pro 14寸 M4 Max'],
  ['MacBook Pro 16 M4 Max', 'MacBook Pro 16寸 M4 Max'],
  ['MacBook Pro 14 M5', 'MacBook Pro 14寸 M5'],
  ['MacBook Pro 14 M5 Pro', 'MacBook Pro 14寸 M5 Pro'],
  ['MacBook Pro 16 M5 Pro', 'MacBook Pro 16寸 M5 Pro'],
  ['MacBook Pro 14 M5 Max', 'MacBook Pro 14寸 M5 Max'],
  ['MacBook Pro 16 M5 Max', 'MacBook Pro 16寸 M5 Max'],
  ['MacBook Pro 13 M1', 'MacBook Pro 13寸 M1'],
  ['MacBook Pro 14 M1 Pro', 'MacBook Pro 14寸 M1 Pro'],
  ['MacBook Pro 16 M1 Pro', 'MacBook Pro 16寸 M1 Pro'],
  ['MacBook Pro 14 M2 Pro', 'MacBook Pro 14寸 M2 Pro'],
  ['MacBook Pro 16 M3 Pro', 'MacBook Pro 16寸 M3 Pro'],
  ['MacBook Air M1', 'MacBook Air M1'],
  ['MacBook Air M2', 'MacBook Air M2'],
];

function processFile(filePath) {
  if (!fs.existsSync(filePath)) return 0;
  let text = fs.readFileSync(filePath, 'utf-8');
  let count = 0;

  for (const [from, to] of NAME_REPLACEMENTS) {
    if (text.includes(from)) {
      text = text.replace(new RegExp(`"name": "${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g'), `"name": "${to}"`);
      count++;
    }
  }

  fs.writeFileSync(filePath, text);
  return count;
}

// main
const target = process.argv[2];
const USED_DIR = 'C:/Users/ZhuanZ（无密码）/Desktop/微信开发者工具文件/主要文件/miniprogram/data/database/used';

const files = target ? [target] : [
  path.join(USED_DIR, 'tablet/tablet.js'),
  path.join(USED_DIR, 'laptop/laptop.js'),
  path.join(USED_DIR, 'phone/used_phone.js'),
  path.join(USED_DIR, 'phone/used_tablet.js'),
  path.join(USED_DIR, 'phone/used_laptop.js'),
];

let total = 0;
for (const f of files) {
  const n = processFile(f);
  if (n > 0) {
    const name = path.basename(path.dirname(f)) + '/' + path.basename(f);
    console.log(`  ${name}: ${n} 处修改`);
    total += n;
  }
}
console.log(`\n共 ${total} 处修改`);
