#!/usr/bin/env node
// 批量同步刷新率 — 从 miniprogram 到 cloudfunction
// 一次跑完，不再一条条改

const fs = require('fs');
const path = require('path');

const BASE = 'C:/Users/ZhuanZ（无密码）/Desktop/微信开发者工具文件/主要文件';

const PAIRS = [
  {
    src: path.join(BASE, 'miniprogram/data/database/new/phone/phone.js'),
    dst: path.join(BASE, 'cloudfunctions/getRecommend/db/new_phone.js'),
    category: 'phone'
  },
  {
    src: path.join(BASE, 'miniprogram/data/database/new/phone/new_laptop.js'),
    dst: path.join(BASE, 'cloudfunctions/getRecommend/db/new_laptop.js'),
    category: 'laptop'
  }
];

function loadData(filePath) {
  const text = fs.readFileSync(filePath, 'utf-8');
  // 提取 module.exports = [...]
  const match = text.match(/module\.exports\s*=\s*(\[[\s\S]*\]);?\s*$/);
  if (!match) {
    console.error(`Cannot parse: ${filePath}`);
    return [];
  }
  return eval(match[1]);
}

function extractRefreshRates(products) {
  const map = {};
  for (const p of products) {
    if (p.name && p.abilities && p.abilities.refresh_rate) {
      map[p.name] = p.abilities.refresh_rate;
    }
  }
  return map;
}

function applyRefreshRates(filePath, rateMap) {
  let text = fs.readFileSync(filePath, 'utf-8');
  let count = 0;

  for (const [name, targetRate] of Object.entries(rateMap)) {
    // 找 "name": "产品名" 后面的 refresh_rate
    const pattern = new RegExp(
      `"name":\\s*"${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"` +
      `[\\s\\S]*?(\\"refresh_rate\\":\\s*)(\\d+)`,
      'g'
    );

    let match;
    while ((match = pattern.exec(text)) !== null) {
      const currentRate = parseInt(match[2]);
      if (currentRate !== targetRate) {
        const before = text.slice(0, match.index + match[1].length);
        const after = text.slice(match.index + match[1].length + match[2].length);
        text = before + targetRate + after;
        count++;
        console.log(`  ${name}: ${currentRate} → ${targetRate}`);
      }
      break; // 只改第一个匹配
    }
  }

  if (count > 0) {
    fs.writeFileSync(filePath, text);
  }
  return count;
}

// main
console.log('=== 批量刷新率同步 ===');
console.log('');

for (const pair of PAIRS) {
  console.log(`--- ${pair.category} ---`);
  const srcData = loadData(pair.src);
  const srcRates = extractRefreshRates(srcData);
  console.log(`  源: ${Object.keys(srcRates).length} 产品`);

  const changed = applyRefreshRates(pair.dst, srcRates);
  console.log(`  同步: ${changed} 处修改`);
  console.log('');
}

console.log('=== 完成 ===');
