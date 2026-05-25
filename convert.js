const sharp = require('sharp');
sharp('public/og-image.svg')
  .resize(1200, 630)
  .png()
  .toFile('public/og-image.png', (err, info) => {
    if (err) console.error(err);
    else console.log('Done!', info);
  });
