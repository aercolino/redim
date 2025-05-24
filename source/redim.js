// Usage: node redim.js --fromRootDir <dir> --toRootDir <dir> --ext <ext>
import { program } from 'commander';
import fs from 'fs-extra';
import process from 'node:process';
import { glob } from 'glob';
import path from 'node:path';

program
  .requiredOption('--fromRootDir "<dir>"', 'Directory to read files from')
  .requiredOption('--toRootDir "<dir>"', 'Directory to write files to');

program.parse();
const options = program.opts();

let source = path.resolve(options.fromRootDir);
if (!fs.pathExistsSync(source)) {
  console.error(`Source directory does not exist: ${source}`);
  process.exit(1);
}

let dest = path.resolve(options.toRootDir);
if (!fs.pathExistsSync(dest)) {
  console.error(`Destination directory does not exist: ${dest}`);
  process.exit(1);
}

source = path.join(source, '/**/*.{jpg,jpeg,png,gif,webp,svg}');
const images = await glob([source]);

console.log(`Found ${images.length} images to process.`);
