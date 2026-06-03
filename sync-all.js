#!/usr/bin/env node
// 全量同步：价格、刷新率、命名 — miniprogram → cloudfunction
const fs = require('fs');
const path = require('path');

const BASE = 'C:/Users/ZhuanZ（无密码）/Desktop/微信开发者工具文件/主要文件';

const PAIRS = [
  ['miniprogram/data/database/new/tablet/tablet.js', 'cloudfunctions/getRecommend/db/new_tablet.js'],
  ['miniprogram/data/database/new/phone/new_laptop.js', 'cloudfunctions/getRecommend/db/new_laptop.js'],
  ['miniprogram/data/database/new/phone/phone.js', 'cloudfunctions/getRecommend/db/new_phone.js'],
  ['miniprogram/data/database/used/tablet/tablet.js', 'cloudfunctions/getRecommend/db/used_tablet.js'],
  ['miniprogram/data/database/used/laptop/laptop.js', 'cloudfunctions/getRecommend/db/used_laptop.js'],
];

function extractFields(text) {
  const products = {};
  const re = /"name":\s*"([^"]+)"[\s\S]*?(?="name"|$)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const block = m[0];
    const name = m[1];
    const fields = {};
    const pr = block.match(/"price_range":\s*"([^"]+)"/);
    const rr = block.match(/"refresh_rate":\s*(\d+)/);
    if (pr) fields.price_range = pr[1];
    if (rr) fields.refresh_rate = parseInt(rr[1]);
    products[name] = fields;
  }
  return products;
}

for (const [src, dst] of PAIRS) {
  const srcPath = path.join(BASE, src);
  const dstPath = path.join(BASE, dst);
  if (!fs.existsSync(srcPath) || !fs.existsSync(dstPath)) continue;

  const srcText = fs.readFileSync(srcPath, 'utf-8');
  const dstText = fs.readFileSync(dstPath, 'utf-8');
  const srcData = extractFields(srcText);
  const dstData = extractFields(dstText);
  let fixed = dstText;
  let count = 0;

  for (const [name, fields] of Object.entries(srcData)) {
    if (!dstData[name]) continue;

    // 刷新率
    if (fields.refresh_rate && dstData[name].refresh_rate !== fields.refresh_rate) {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`"name": "${escaped}"[\\s\\S]*?"refresh_rate": ${dstData[name].refresh_rate}`);
      fixed = fixed.replace(re, match => match.replace(`"refresh_rate": ${dstData[name].refresh_rate}`, `"refresh_rate": ${fields.refresh_rate}`));
      count++;
    }

    // 价格
    if (fields.price_range && dstData[name].price_range !== fields.price_range) {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`"name": "${escaped}"[\\s\\S]*?"price_range": "${dstData[name].price_range.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`);
      fixed = fixed.replace(re, match => match.replace(`"price_range": "${dstData[name].price_range}"`, `"price_range": "${fields.price_range}"`));
      count++;
    }
  }

  if (count > 0) {
    fs.writeFileSync(dstPath, fixed);
    console.log(`${path.basename(dst)}: ${count}处`);
  }
}
console.log('done');
