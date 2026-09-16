const { app, BrowserWindow, nativeImage } = require('electron');
const fs = require('fs');
const path = require('path');

const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#141810" />
      <stop offset="50%" stop-color="#0c0e0a" />
      <stop offset="100%" stop-color="#070806" />
    </linearGradient>
    <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#C4F135" stop-opacity="0.8" />
      <stop offset="50%" stop-color="#3d4928" stop-opacity="0.6" />
      <stop offset="100%" stop-color="#C4F135" stop-opacity="0.3" />
    </linearGradient>
    <linearGradient id="penBody" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#D9FF43" />
      <stop offset="60%" stop-color="#C4F135" />
      <stop offset="100%" stop-color="#9BC61A" />
    </linearGradient>
    <linearGradient id="penShadow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0c0e0a" stop-opacity="0.4" />
      <stop offset="100%" stop-color="#0c0e0a" stop-opacity="0" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="12" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background Board Frame (Squircle) -->
  <rect x="24" y="24" width="464" height="464" rx="104" fill="url(#bgGrad)" stroke="url(#borderGrad)" stroke-width="8" />

  <!-- Inner Canvas Board Panel -->
  <rect x="60" y="60" width="392" height="392" rx="68" fill="#12160e" stroke="#242b1d" stroke-width="4" />

  <!-- Subtle Board Grid Lines -->
  <line x1="60" y1="160" x2="452" y2="160" stroke="#1f2718" stroke-width="2" stroke-dasharray="8 8" />
  <line x1="60" y1="260" x2="452" y2="260" stroke="#1f2718" stroke-width="2" stroke-dasharray="8 8" />
  <line x1="60" y1="360" x2="452" y2="360" stroke="#1f2718" stroke-width="2" stroke-dasharray="8 8" />
  <line x1="160" y1="60" x2="160" y2="452" stroke="#1f2718" stroke-width="2" stroke-dasharray="8 8" />
  <line x1="260" y1="60" x2="260" y2="452" stroke="#1f2718" stroke-width="2" stroke-dasharray="8 8" />
  <line x1="360" y1="60" x2="360" y2="452" stroke="#1f2718" stroke-width="2" stroke-dasharray="8 8" />

  <!-- Dynamic Stroke / Mathematical Wave On Board -->
  <path d="M 100 340 C 160 380, 200 240, 260 270 C 310 295, 340 210, 390 190" fill="none" stroke="#C4F135" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" opacity="0.35" />
  <path d="M 100 340 C 160 380, 200 240, 260 270 C 310 295, 340 210, 390 190" fill="none" stroke="#C4F135" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity="0.8" filter="url(#glow)" />

  <!-- Stylized Digital Stylus / Pen (Diagonal) -->
  <g transform="translate(195, 125) rotate(42)">
    <!-- Shadow -->
    <rect x="-16" y="-120" width="36" height="240" rx="14" fill="#000000" opacity="0.4" filter="url(#glow)" />
    
    <!-- Pen Barrel -->
    <rect x="-14" y="-120" width="28" height="190" rx="12" fill="url(#penBody)" stroke="#0c0e0a" stroke-width="3" />
    <rect x="-14" y="-120" width="10" height="190" rx="6" fill="#ffffff" opacity="0.25" />
    
    <!-- Grip Ring & Accent Bands -->
    <rect x="-14" y="-10" width="28" height="35" fill="#12160e" stroke="#0c0e0a" stroke-width="2" />
    <line x1="-14" y1="-2" x2="14" y2="-2" stroke="#C4F135" stroke-width="2" />
    <line x1="-14" y1="12" x2="14" y2="12" stroke="#C4F135" stroke-width="2" />

    <!-- Pen Cone / Tip -->
    <polygon points="-14,70 14,70 0,118" fill="#12160e" stroke="#0c0e0a" stroke-width="3" />
    
    <!-- Fine Nib -->
    <polygon points="-4,106 4,106 0,122" fill="#C4F135" stroke="#0c0e0a" stroke-width="1.5" />
    
    <!-- Glowing Spark at Pen Tip -->
    <circle cx="0" cy="123" r="8" fill="#ffffff" filter="url(#glow)" />
    <circle cx="0" cy="123" r="4" fill="#C4F135" />
  </g>

  <!-- Sparkle Accent (Top Right) -->
  <path d="M 390 95 Q 390 115 410 115 Q 390 115 390 135 Q 390 115 370 115 Q 390 115 390 95 Z" fill="#C4F135" />
  <circle cx="390" cy="115" r="3" fill="#ffffff" />
</svg>
`;

// Helper: Pack multiple PNG buffers into Windows .ICO binary format
function createIcoFromPngs(pngBuffers) {
  // Count
  const count = pngBuffers.length;
  // Header: 6 bytes
  const headerSize = 6;
  // Directory entries: 16 bytes each
  const dirSize = 16 * count;
  
  let currentOffset = headerSize + dirSize;
  const entries = [];

  for (const { buffer, size } of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width (0 = 256)
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height (0 = 256)
    entry.writeUInt8(0, 2); // bColorCount
    entry.writeUInt8(0, 3); // bReserved
    entry.writeUInt16LE(1, 4); // wPlanes
    entry.writeUInt16LE(32, 6); // wBitCount (32-bit RGBA)
    entry.writeUInt32LE(buffer.length, 8); // dwBytesInRes
    entry.writeUInt32LE(currentOffset, 12); // dwImageOffset
    entries.push(entry);
    currentOffset += buffer.length;
  }

  // Header buffer
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = ICO
  header.writeUInt16LE(count, 4); // count

  return Buffer.concat([header, ...entries, ...pngBuffers.map(p => p.buffer)]);
}

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 512,
    height: 512,
    show: false,
    transparent: true,
    backgroundColor: '#00000000',
    webPreferences: { offscreen: true }
  });

  const fullHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          * { margin: 0; padding: 0; }
          body { background: transparent !important; overflow: hidden; }
        </style>
      </head>
      <body>
        ${svgContent}
      </body>
    </html>
  `;
  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(fullHtml));
  await new Promise(resolve => setTimeout(resolve, 800));

  const baseImage = await win.webContents.capturePage();
  const buildDir = path.join(__dirname, '../build');
  const publicDir = path.join(__dirname, '../public');
  const distDir = path.join(__dirname, '../dist');
  [buildDir, publicDir, distDir].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });

  // Save 512x512 PNG
  const png512 = baseImage.toPNG();
  fs.writeFileSync(path.join(buildDir, 'icon.png'), png512);
  fs.writeFileSync(path.join(publicDir, 'icon.png'), png512);
  fs.writeFileSync(path.join(distDir, 'icon.png'), png512);
  console.log('Saved transparent 512x512 icon.png to build, public, and dist');

  // Multi-resolution sizes for Windows: 16, 32, 48, 64, 128, 256
  const sizes = [16, 32, 48, 64, 128, 256];
  const pngBuffers = [];

  for (const size of sizes) {
    const resized = baseImage.resize({ width: size, height: size, quality: 'best' });
    pngBuffers.push({
      size,
      buffer: resized.toPNG()
    });
    console.log(`Generated ${size}x${size} PNG frame`);
  }

  // Pack into .ico
  const icoBuffer = createIcoFromPngs(pngBuffers);
  fs.writeFileSync(path.join(buildDir, 'icon.ico'), icoBuffer);
  console.log(`Successfully created build/icon.ico (${icoBuffer.length} bytes, containing 6 resolutions)`);

  win.destroy();
  app.quit();
});
