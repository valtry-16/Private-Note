// Generate app icons using only Node.js built-in modules
// Creates a shield icon matching the Lucide Shield used in the sidebar
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeB = Buffer.from(type);
  const crcB = Buffer.alloc(4);
  crcB.writeUInt32BE(crc32(Buffer.concat([typeB, data])));
  return Buffer.concat([len, typeB, data, crcB]);
}

function createPNG(size, drawPixel) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA

  const raw = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    const row = y * (1 + size * 4);
    raw[row] = 0; // filter none
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = drawPixel(x, y, size);
      const p = row + 1 + x * 4;
      raw[p] = r; raw[p+1] = g; raw[p+2] = b; raw[p+3] = a;
    }
  }

  return Buffer.concat([
    sig,
    createChunk("IHDR", ihdr),
    createChunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    createChunk("IEND", Buffer.alloc(0)),
  ]);
}

// Lucide-style shield outline: open at top, pointed at bottom
// SVG path: M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z
// Normalized to [-1, 1] coordinate space
function isInsideShield(nx, ny) {
  // Shield shape: top at y=-1, bottom point at y=1
  // Width tapers from top to bottom
  // Top half: sides slope slightly inward
  // Bottom half: sides converge to a point
  
  const absX = Math.abs(nx);
  
  // Top edge (flat-ish) at y ~ -0.85
  if (ny < -0.85) return false;
  // Bottom point at y ~ 0.85
  if (ny > 0.85) return false;
  
  // Shield contour
  let maxX;
  if (ny <= -0.2) {
    // Upper portion: relatively straight sides
    maxX = 0.72 + (ny + 0.85) * 0.05;
  } else {
    // Lower portion: converges to point
    const t = (ny + 0.2) / 1.05; // 0 at ny=-0.2, 1 at ny=0.85
    maxX = 0.75 * (1 - t * t); // Smooth taper quadratic
  }
  
  return absX <= maxX;
}

function drawIcon(x, y, size) {
  const cx = size / 2, cy = size / 2;
  const scale = size * 0.42;

  // Normalize coordinates to [-1, 1] centered
  const nx = (x - cx) / scale;
  const ny = (y - cy) / scale;
  
  const inside = isInsideShield(nx, ny);
  
  if (!inside) return [0, 0, 0, 0]; // transparent
  
  // Check if we're on the border (stroke) of the shield
  const strokeWidth = 2.8 / scale; // ~2.8px stroke
  
  // Sample nearby points to determine if we're near the edge
  const step = 1.0 / scale;
  let isEdge = false;
  for (let dy = -step; dy <= step; dy += step) {
    for (let dx = -step; dx <= step; dx += step) {
      if (!isInsideShield(nx + dx, ny + dy)) {
        isEdge = true;
        break;
      }
    }
    if (isEdge) break;
  }
  
  // Wider border check for thicker stroke
  if (!isEdge) {
    const step2 = strokeWidth * 0.7;
    for (const dy of [-step2, 0, step2]) {
      for (const dx of [-step2, 0, step2]) {
        if (dx === 0 && dy === 0) continue;
        if (!isInsideShield(nx + dx, ny + dy)) {
          isEdge = true;
          break;
        }
      }
      if (isEdge) break;
    }
  }

  if (isEdge) {
    // Blue shield stroke: #3b82f6 (blue-500)
    return [59, 130, 246, 255];
  }
  
  // Interior: fill with lighter blue
  return [219, 234, 254, 255]; // blue-100
}

// Generate both sizes
const pub = path.join(__dirname, "..", "public");
for (const size of [192, 512]) {
  const png = createPNG(size, drawIcon);
  fs.writeFileSync(path.join(pub, `icon-${size}.png`), png);
  console.log(`Created icon-${size}.png (${png.length} bytes)`);
}
