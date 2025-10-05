const { createCanvas } = require('canvas');
const fs = require('fs');

function createIcon(size, filename) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Create gradient background
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#4F46E5');
  gradient.addColorStop(1, '#06B6D4');

  // Fill background
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  // Add rounded corners
  ctx.globalCompositeOperation = 'destination-in';
  ctx.fillStyle = '#000';
  ctx.roundRect = function(x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    this.beginPath();
    this.moveTo(x+r, y);
    this.arcTo(x+w, y,   x+w, y+h, r);
    this.arcTo(x+w, y+h, x,   y+h, r);
    this.arcTo(x,   y+h, x,   y,   r);
    this.arcTo(x,   y,   x+w, y,   r);
    this.closePath();
    return this;
  }
  
  ctx.roundRect(0, 0, size, size, size * 0.1);
  ctx.fill();
  
  // Reset composite operation
  ctx.globalCompositeOperation = 'source-over';

  // Draw F letter
  ctx.fillStyle = 'white';
  ctx.font = `bold ${size * 0.4}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('F', size / 2, size / 2);

  // Add small chart bars
  const barWidth = size * 0.04;
  const barSpacing = size * 0.02;
  const barsStartX = size * 0.7;
  const barsStartY = size * 0.2;
  
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  
  // Draw 3 bars
  ctx.fillRect(barsStartX, barsStartY + size * 0.1, barWidth, size * 0.1);
  ctx.fillRect(barsStartX + barWidth + barSpacing, barsStartY, barWidth, size * 0.2);
  ctx.fillRect(barsStartX + (barWidth + barSpacing) * 2, barsStartY + size * 0.05, barWidth, size * 0.15);

  // Save to file
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(`public/${filename}`, buffer);
  console.log(`✅ Created public/${filename} (${size}x${size})`);
}

// Create all required icons
console.log('🎨 Creating PWA icons...');

try {
  createIcon(192, 'android-chrome-192x192.png');
  createIcon(512, 'android-chrome-512x512.png');
  createIcon(180, 'apple-touch-icon.png');
  createIcon(32, 'favicon-32x32.png');
  createIcon(16, 'favicon-16x16.png');
  
  console.log('🎉 All icons created successfully!');
} catch (error) {
  console.error('❌ Error creating icons:', error);
}