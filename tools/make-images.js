// Генерация растровых ассетов без внешних зависимостей.
//
//   assets/og-cover.png     1200x630  — превью ссылки в WhatsApp/Telegram/соцсетях
//   assets/apple-touch-icon.png  180x180
//   favicon.ico             48x48 (PNG внутри ICO-контейнера)
//
// Запуск:  node tools/make-images.js
// Пересобирать нужно только если поменялся логотип или палитра.

'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..');

// ─── CRC32 (для чанков PNG) ───
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

// ─── Декодер PNG (8 бит, RGB/RGBA/grayscale, без интерлейса) ───
function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('не PNG');

  let pos = 8;
  let width = 0, height = 0, bitDepth = 0, colorType = 0;
  const idat = [];

  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.slice(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      if (data[12] !== 0) throw new Error('интерлейс не поддерживается');
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') break;
    pos += 12 + len;
  }

  if (bitDepth !== 8) throw new Error('поддерживается только 8 бит на канал, получено ' + bitDepth);
  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType];
  if (!channels) throw new Error('colorType ' + colorType + ' не поддерживается');

  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp = channels;
  const stride = width * bpp;
  const out = Buffer.alloc(height * stride);

  let rp = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[rp++];
    const line = raw.slice(rp, rp + stride);
    rp += stride;
    const cur = out.slice(y * stride, (y + 1) * stride);
    const prev = y > 0 ? out.slice((y - 1) * stride, y * stride) : null;

    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0;
      const b = prev ? prev[x] : 0;
      const c = prev && x >= bpp ? prev[x - bpp] : 0;
      let v = line[x];
      switch (filter) {
        case 0: break;
        case 1: v += a; break;
        case 2: v += b; break;
        case 3: v += (a + b) >> 1; break;
        case 4: {
          const p = a + b - c;
          const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
          v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
          break;
        }
        default: throw new Error('неизвестный фильтр ' + filter);
      }
      cur[x] = v & 0xff;
    }
  }

  // Приводим всё к RGBA
  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const s = i * channels, d = i * 4;
    if (colorType === 6) {
      rgba[d] = out[s]; rgba[d + 1] = out[s + 1]; rgba[d + 2] = out[s + 2]; rgba[d + 3] = out[s + 3];
    } else if (colorType === 2) {
      rgba[d] = out[s]; rgba[d + 1] = out[s + 1]; rgba[d + 2] = out[s + 2]; rgba[d + 3] = 255;
    } else if (colorType === 0) {
      rgba[d] = rgba[d + 1] = rgba[d + 2] = out[s]; rgba[d + 3] = 255;
    } else {
      rgba[d] = rgba[d + 1] = rgba[d + 2] = out[s]; rgba[d + 3] = out[s + 1];
    }
  }

  return { width, height, data: rgba };
}

// ─── Энкодер PNG (RGBA, фильтр 0) ───
function encodePng(width, height, rgba) {
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body), 0);
    return Buffer.concat([len, body, crc]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ─── Ресемплинг (усреднение по боксу — качественно для уменьшения) ───
function resize(src, dstW, dstH) {
  const out = Buffer.alloc(dstW * dstH * 4);
  const xRatio = src.width / dstW;
  const yRatio = src.height / dstH;

  for (let y = 0; y < dstH; y++) {
    const y0 = Math.floor(y * yRatio), y1 = Math.max(y0 + 1, Math.floor((y + 1) * yRatio));
    for (let x = 0; x < dstW; x++) {
      const x0 = Math.floor(x * xRatio), x1 = Math.max(x0 + 1, Math.floor((x + 1) * xRatio));
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let sy = y0; sy < y1 && sy < src.height; sy++) {
        for (let sx = x0; sx < x1 && sx < src.width; sx++) {
          const i = (sy * src.width + sx) * 4;
          const al = src.data[i + 3] / 255;
          // Премультиплицируем, иначе прозрачные пиксели «затянут» края в чёрный
          r += src.data[i] * al; g += src.data[i + 1] * al; b += src.data[i + 2] * al;
          a += src.data[i + 3];
          n++;
        }
      }
      const d = (y * dstW + x) * 4;
      const alpha = a / n;
      const inv = alpha > 0 ? 255 / alpha : 0;
      out[d] = Math.min(255, Math.round((r / n) * inv));
      out[d + 1] = Math.min(255, Math.round((g / n) * inv));
      out[d + 2] = Math.min(255, Math.round((b / n) * inv));
      out[d + 3] = Math.round(alpha);
    }
  }
  return { width: dstW, height: dstH, data: out };
}

// ─── Композитинг «source-over» ───
function drawOver(dst, src, ox, oy) {
  for (let y = 0; y < src.height; y++) {
    const dy = oy + y;
    if (dy < 0 || dy >= dst.height) continue;
    for (let x = 0; x < src.width; x++) {
      const dx = ox + x;
      if (dx < 0 || dx >= dst.width) continue;
      const s = (y * src.width + x) * 4;
      const d = (dy * dst.width + dx) * 4;
      const a = src.data[s + 3] / 255;
      if (a === 0) continue;
      dst.data[d] = Math.round(src.data[s] * a + dst.data[d] * (1 - a));
      dst.data[d + 1] = Math.round(src.data[s + 1] * a + dst.data[d + 1] * (1 - a));
      dst.data[d + 2] = Math.round(src.data[s + 2] * a + dst.data[d + 2] * (1 - a));
      dst.data[d + 3] = 255;
    }
  }
}

// ─── Убираем чёрную подложку логотипа ───
// Заливкой от краёв, а не по порогу яркости: иначе прозрачной стала бы и
// чёрная буква K внутри белого значка.
function keyOutBackground(img, threshold) {
  const { width: w, height: h, data } = img;
  const lum = (i) => Math.max(data[i], data[i + 1], data[i + 2]);
  const seen = new Uint8Array(w * h);
  const queue = [];

  for (let x = 0; x < w; x++) {
    queue.push(x, (h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    queue.push(y * w, y * w + w - 1);
  }

  while (queue.length) {
    const p = queue.pop();
    if (seen[p]) continue;
    const i = p * 4;
    if (lum(i) > threshold) continue;
    seen[p] = 1;
    data[i + 3] = 0;
    const x = p % w, y = (p - x) / w;
    if (x > 0) queue.push(p - 1);
    if (x < w - 1) queue.push(p + 1);
    if (y > 0) queue.push(p - w);
    if (y < h - 1) queue.push(p + w);
  }

  // Смягчаем границу: полупрозрачные пиксели на стыке убирают «лесенку»
  const copy = Buffer.from(data);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      if (seen[p]) continue;
      const i = p * 4;
      if (copy[i + 3] === 0) continue;
      let clear = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (seen[(y + dy) * w + (x + dx)]) clear++;
        }
      }
      if (clear > 0 && lum(i) < threshold * 2) {
        data[i + 3] = Math.round(255 * (1 - clear / 9));
      }
    }
  }
  return img;
}

// ─── Фон в стиле сайта: тёмная база + мягкие неоновые пятна ───
const PALETTE = {
  bg: [0x07, 0x07, 0x0a],
  cyan: [0x00, 0xe5, 0xff],
  pink: [0xff, 0x2e, 0x7e],
  orange: [0xff, 0x8a, 0x3d],
};

function makeBackdrop(w, h) {
  const data = Buffer.alloc(w * h * 4);
  const glows = [
    { x: w * 0.16, y: h * 0.12, r: w * 0.52, c: PALETTE.cyan, i: 0.30 },
    { x: w * 0.88, y: h * 0.24, r: w * 0.46, c: PALETTE.pink, i: 0.26 },
    { x: w * 0.62, y: h * 1.02, r: w * 0.44, c: PALETTE.orange, i: 0.20 },
  ];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // Базовый вертикальный градиент
      const t = y / h;
      let r = PALETTE.bg[0] + t * 8;
      let g = PALETTE.bg[1] + t * 8;
      let b = PALETTE.bg[2] + t * 14;

      for (const gl of glows) {
        const dx = x - gl.x, dy = y - gl.y;
        const dist = Math.sqrt(dx * dx + dy * dy) / gl.r;
        if (dist >= 1) continue;
        // Плавное затухание к краю пятна
        const f = Math.pow(1 - dist, 2.2) * gl.i;
        r += gl.c[0] * f; g += gl.c[1] * f; b += gl.c[2] * f;
      }

      const d = (y * w + x) * 4;
      data[d] = Math.min(255, Math.round(r));
      data[d + 1] = Math.min(255, Math.round(g));
      data[d + 2] = Math.min(255, Math.round(b));
      data[d + 3] = 255;
    }
  }
  return { width: w, height: h, data };
}

// ─── ICO-контейнер с PNG внутри ───
function encodeIco(pngBuf, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);      // reserved
  header.writeUInt16LE(1, 2);      // type: icon
  header.writeUInt16LE(1, 4);      // количество изображений

  const entry = Buffer.alloc(16);
  entry[0] = size >= 256 ? 0 : size;
  entry[1] = size >= 256 ? 0 : size;
  entry[2] = 0;                    // палитра не используется
  entry[3] = 0;
  entry.writeUInt16LE(1, 4);       // color planes
  entry.writeUInt16LE(32, 6);      // бит на пиксель
  entry.writeUInt32LE(pngBuf.length, 8);
  entry.writeUInt32LE(22, 12);     // смещение данных

  return Buffer.concat([header, entry, pngBuf]);
}

// ─── Сборка ───
function main() {
  const logo = decodePng(fs.readFileSync(path.join(ROOT, 'assets', 'logo.png')));
  const glyph = decodePng(fs.readFileSync(path.join(ROOT, 'assets', 'logo-glyph.png')));
  console.log('  логотип: ' + logo.width + 'x' + logo.height);

  // OG-превью 1200x630
  const OG_W = 1200, OG_H = 630;
  const og = makeBackdrop(OG_W, OG_H);
  keyOutBackground(logo, 28);
  const logoSize = 560;
  const scaled = resize(logo, logoSize, Math.round(logo.height * (logoSize / logo.width)));
  drawOver(og, scaled, Math.round((OG_W - scaled.width) / 2), Math.round((OG_H - scaled.height) / 2));
  fs.writeFileSync(path.join(ROOT, 'assets', 'og-cover.png'), encodePng(OG_W, OG_H, og.data));
  console.log('  assets/og-cover.png        1200x630');

  // apple-touch-icon 180x180 на фирменном фоне (прозрачность там не поддерживается)
  const touch = makeBackdrop(180, 180);
  keyOutBackground(glyph, 28);
  const glyph140 = resize(glyph, 148, 148);
  drawOver(touch, glyph140, 16, 16);
  fs.writeFileSync(path.join(ROOT, 'assets', 'apple-touch-icon.png'), encodePng(180, 180, touch.data));
  console.log('  assets/apple-touch-icon.png 180x180');

  // favicon.ico 48x48 — боты и старые браузеры просят его по корневому пути
  const fav = resize(glyph, 48, 48);
  fs.writeFileSync(path.join(ROOT, 'favicon.ico'), encodeIco(encodePng(48, 48, fav.data), 48));
  console.log('  favicon.ico                 48x48');
}

if (require.main === module) main();

module.exports = { decodePng, encodePng, resize, drawOver, keyOutBackground };
