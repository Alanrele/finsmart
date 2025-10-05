const fs = require('fs');
const sharp = require('sharp');

// Function to convert SVG to PNG
async function convertSvgToPng(svgPath, pngPath, size) {
  try {
    const svgBuffer = fs.readFileSync(svgPath);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(pngPath);
    console.log(`✅ Created ${pngPath}`);
  } catch (error) {
    console.error(`❌ Error creating ${pngPath}:`, error.message);

    // Fallback: create a simple colored square
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 79, g: 70, b: 229, alpha: 1 }
      }
    })
    .png()
    .toFile(pngPath);
    console.log(`✅ Created fallback ${pngPath}`);
  }
}

// Function to create simple fallback icons without sharp
function createFallbackIcon(path, size) {
  // Create a simple HTML canvas approach or use a different method
  console.log(`Creating fallback for ${path} with size ${size}x${size}`);

  // For now, we'll create the manifest without the PNG files
  // and let the browser use the SVG files
}

// Create the icons
async function createIcons() {
  console.log('🎨 Creating PWA icons...');

  try {
    // Try to use sharp if available
    await convertSvgToPng('./public/icon-192.svg', './public/android-chrome-192x192.png', 192);
    await convertSvgToPng('./public/icon-512.svg', './public/android-chrome-512x512.png', 512);

    // Create additional sizes
    await convertSvgToPng('./public/icon-192.svg', './public/apple-touch-icon.png', 180);
    await convertSvgToPng('./public/icon-192.svg', './public/favicon-32x32.png', 32);
    await convertSvgToPng('./public/icon-192.svg', './public/favicon-16x16.png', 16);

  } catch (error) {
    console.log('Sharp not available, using alternative approach...');

    // Copy SVG files as fallback
    if (fs.existsSync('./public/icon-192.svg')) {
      fs.copyFileSync('./public/icon-192.svg', './public/android-chrome-192x192.svg');
      fs.copyFileSync('./public/icon-512.svg', './public/android-chrome-512x512.svg');
      console.log('✅ SVG fallbacks created');
    }
  }
}

if (require.main === module) {
  createIcons();
}

module.exports = { createIcons };
