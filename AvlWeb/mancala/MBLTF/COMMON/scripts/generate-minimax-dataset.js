#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { generateMinimaxDataset } from '../js/training/minimaxDataset.js';

const args = parseArgs(process.argv.slice(2));
const dataset = generateMinimaxDataset({
  games: args.games,
  seed: args.seed,
  teacherDepth: args.teacherDepth,
  sampleRate: args.sampleRate,
});

const outputPath = path.resolve(args.out);
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(dataset));

console.log(`Wrote ${dataset.samples.length} samples from ${dataset.metadata.games} games to ${outputPath}`);

function parseArgs(argv) {
  const options = {
    out: './output/minimax-dataset.json',
    games: 200,
    seed: 1,
    teacherDepth: 4,
    sampleRate: 1,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--out' && next) {
      options.out = next;
      index += 1;
    } else if (arg === '--games' && next) {
      options.games = Number(next);
      index += 1;
    } else if (arg === '--seed' && next) {
      options.seed = Number(next);
      index += 1;
    } else if (arg === '--teacher-depth' && next) {
      options.teacherDepth = Number(next);
      index += 1;
    } else if (arg === '--sample-rate' && next) {
      options.sampleRate = Number(next);
      index += 1;
    } else if (arg === '--help' || arg === '-h') {
      printHelpAndExit();
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function printHelpAndExit() {
  console.log([
    'Usage: node ./scripts/generate-minimax-dataset.js [options]',
    '',
    'Options:',
    '  --out <path>            Output JSON path. Default: ./output/minimax-dataset.json',
    '  --games <count>         Number of source games to simulate. Default: 200',
    '  --seed <number>         Deterministic RNG seed. Default: 1',
    '  --teacher-depth <n>     Minimax teacher depth. Default: 4',
    '  --sample-rate <0..1>    Fraction of positions to keep. Default: 1',
  ].join('\n'));
  process.exit(0);
}

