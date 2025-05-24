// Usage: node redim.js --fromRootDir <dir> --toRootDir <dir> --ext <ext>
import { program } from 'commander';
import fs from 'fs-extra';
import process from 'node:process';
import { glob } from 'glob';
import path from 'node:path';
import cliProgress from 'cli-progress';
import winston from 'winston';
import sharp from 'sharp';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.simple()
  ),
  transports: [
    new winston.transports.File({ filename: `redim-${new Date().toISOString().split('.')[0]}.log` })
  ]
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

program
  .requiredOption('--fromRootDir "<dir>"', 'Directory to read files from')
  .requiredOption('--toRootDir "<dir>"', 'Directory to write files to');

program.parse();
const options = program.opts();

const source = path.resolve(options.fromRootDir);
if (!fs.pathExistsSync(source)) {
  console.error(`Source directory does not exist: ${source}`);
  process.exit(1);
}

const dest = path.resolve(options.toRootDir);
if (!fs.pathExistsSync(dest)) {
  console.error(`Destination directory does not exist: ${dest}`);
  process.exit(1);
}

const sourceGlob = path.join(source, '/**/*.{jpg,jpeg,png,gif,webp,svg}');
const images = await glob([sourceGlob]);

console.log(`Found ${images.length} images to process.`);

const progress = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
progress.start(images.length, 0);

let count = 0;
for (const image of images) {
  const relativePath = path.relative(source, image);
  const destPath = path.join(dest, relativePath);
  try {
    logger.info(`Processing image: ${image}`);
    progress.update({ filename: relativePath });

    await fs.ensureDir(path.dirname(destPath));
    await fs.copyFile(image, destPath);
    logger.info(`Copied to ${destPath}`);

    const resizedPath = path.join(path.dirname(destPath), `resized-${path.basename(destPath)}`);
    await sharp(destPath)
      .resize({ width: 800, height: 600, fit: 'inside' })
      .toFile(resizedPath);
    logger.info(`Resized image saved to ${resizedPath}`);

    fs.renameSync(resizedPath, destPath);
    logger.info(`Final image saved to ${destPath}`);
  } catch (error) {
    logger.error(`Error copying to ${destPath}:`, error);
  } finally {
    progress.increment();
  }
  count += 1;
  if (count === 10) {
    break;
  }
}

progress.stop();
console.log('Exiting gracefully...');
logger.info('Exiting gracefully...');
process.removeAllListeners();
process.exit(0);
