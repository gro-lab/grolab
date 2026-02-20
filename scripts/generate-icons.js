const fs = require('fs');
const path = require('path');

// Simple 1x1 transparent PNG in base64 (will be stretched but works for testing)
const transparentPNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

// Or create colored squares for each size
function createSimplePNG(size, color = [99, 102, 241]) {
  // PNG signature
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  // IHDR chunk
  const ihdr = Buffer.alloc(17);
  ihdr.write('IHDR', 0);
  ihdr.writeUInt32BE(size, 4);  // width
  ihdr.writeUInt32BE(size, 8);  // height
  ihdr[12] = 8;  // bit depth
  ihdr[13] = 2;  // color type (RGB)
  ihdr[14] = 0;  // compression
  ihdr[15] = 0;  // filter
  ihdr[16] = 0;  // interlace
  
  // Simple IDAT (compressed image data) - just colored pixels
  const pixels = Buffer.alloc(size * size * 3 + size); // RGB + filter byte per row
  for (let y = 0; y < size; y++) {
    pixels[y * (size * 3 + 1)] = 0; // filter byte
    for (let x = 0; x < size; x++) {
      const idx = y * (size * 3 + 1) + 1 + x * 3;
      pixels[idx] = color[0];     // R
      pixels[idx + 1] = color[1]; // G
      pixels[idx + 2] = color[2]; // B
    }
  }
  
  // Use minimal zlib compression (just store)
  const zlib = require('zlib');
  const compressed = zlib.deflateSync(pixels);
  
  const idatLen = compressed.length;
  const idat = Buffer.concat([
    Buffer.from([0, 0, 0, 0]).fill(idatLen, 0, 4),
    Buffer.from('IDAT'),
    compressed
  ]);
  
  // Calculate CRC for chunks (simplified - using placeholder)
  const crc = Buffer.alloc(4);
  
  // IEND chunk
  const iend = Buffer.from([0, 0, 0, 0, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82]);
  
  return Buffer.concat([signature, ihdr, idat, iend]);
}

// Generate icons
const sizes = [16, 48, 128];
const iconDir = path.join(__dirname, '..', 'src', 'icons');

console.log('🔧 Generating placeholder icons...');

if (!fs.existsSync(iconDir)) {
  fs.mkdirSync(iconDir, { recursive: true });
}

sizes.forEach(size => {
  const iconPath = path.join(iconDir, `icon${size}.png`);
  // Create a simple purple square (#6366f1)
  const png = createSimplePNG(size, [99, 102, 241]);
  fs.writeFileSync(iconPath, png);
  console.log(`✓ Created icon${size}.png (${size}x${size})`);
});

console.log('✅ Icons generated! Reload the extension.');