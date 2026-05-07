const fs = require('fs-extra');
const path = require('path');

async function moveAssets() {
  const srcDir = path.join(__dirname, '..', '.output', 'public', '_build', 'assets');
  const destDir = path.join(__dirname, '..', 'public', 'assets');

  try {
    // Đảm bảo thư mục đích tồn tại
    await fs.ensureDir(destDir);
    
    if (await fs.pathExists(srcDir)) {
      console.log('Copying assets from:', srcDir);
      await fs.copy(srcDir, destDir);
      console.log('Assets moved successfully to public/assets');
    } else {
      console.warn('Source assets directory not found:', srcDir);
    }
  } catch (err) {
    console.error('Error moving assets:', err);
  }
}

moveAssets();
