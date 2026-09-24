/* eslint-disable @typescript-eslint/no-require-imports */
const sharp = require('sharp');
const path = require('path');

const srcImage = path.resolve('C:\\Users\\User\\.gemini\\antigravity-ide\\brain\\679740bd-30b9-4559-a478-649f0f6c33db\\icon_clean_1790274785097.jpg');
const publicDir = path.join(__dirname, '..', 'public');

async function generateIcons() {
  const img = sharp(srcImage);
  
  await img.clone().resize(512, 512, { fit: 'cover' }).png().toFile(path.join(publicDir, 'icon-512.png'));
  console.log('✅ icon-512.png created');

  await img.clone().resize(192, 192, { fit: 'cover' }).png().toFile(path.join(publicDir, 'icon-192.png'));
  console.log('✅ icon-192.png created');

  console.log('Done!');
}

generateIcons().catch(console.error);
