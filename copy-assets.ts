import * as fs from 'fs';
import * as path from 'path';
import pngToIco from 'png-to-ico';

const srcIconPath = path.join(process.cwd(), 'src', 'assets', 'images', 'app_logo.png');
const buildDir = path.join(process.cwd(), 'build');
const destIconPath = path.join(buildDir, 'icon.png');

async function buildAssets() {
  try {
    if (!fs.existsSync(srcIconPath)) {
      console.error(`Source icon not found at: ${srcIconPath}`);
      process.exit(1);
    }

    if (!fs.existsSync(buildDir)) {
      fs.mkdirSync(buildDir, { recursive: true });
      console.log(`Created build directory: ${buildDir}`);
    }

    fs.copyFileSync(srcIconPath, destIconPath);
    console.log(`Successfully copied ${srcIconPath} to ${destIconPath}`);

    const destIcoPath = path.join(buildDir, 'icon.ico');
    console.log(`Converting PNG to high-quality, fully compatible Windows ICO format...`);
    const buf = await pngToIco(srcIconPath);
    fs.writeFileSync(destIcoPath, buf);
    console.log(`Successfully generated and wrote compliant Windows icon to ${destIcoPath}`);
  } catch (error) {
    console.error('Error copying assets:', error);
    process.exit(1);
  }
}

buildAssets();
