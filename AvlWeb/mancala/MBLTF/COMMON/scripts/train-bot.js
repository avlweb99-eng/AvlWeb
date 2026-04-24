import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { parseProfileJson, serializeProfile } from '../js/bots/botProfiles.js';
import { trainWeightedProfile } from '../js/training/trainer.js';

const args = parseArgs(process.argv.slice(2));

if (args.help || args.h) {
  printUsage();
  process.exit(0);
}

if (!args.in || !args.out) {
  printUsage();
  process.exit(1);
}

const parsed = parseProfileJson(await readFile(args.in, 'utf8'));
if (Array.isArray(parsed)) {
  throw new Error('Expected a single profile JSON file for training.');
}

const profile = applyOverrides(parsed, args);
const games = Number(args.games) || profile.training.evalGames;
const seed = Number(args.seed) || 1;
const opponentBotId = args.opponent || profile.training.opponentBotId;
const result = trainWeightedProfile({
  profile,
  games,
  opponentBotId,
  seed,
});

await mkdir(path.dirname(path.resolve(args.out)), { recursive: true });
await writeFile(args.out, serializeProfile(result.profile));

console.log(JSON.stringify({
  output: args.out,
  games: result.metrics.games,
  bootstrapGames: result.metrics.bootstrapGames,
  policyGradientGames: result.metrics.policyGradientGames,
  record: {
    wins: result.metrics.wins,
    losses: result.metrics.losses,
    ties: result.metrics.ties,
    winRate: result.metrics.winRate,
  },
  evaluation: {
    games: result.metrics.evaluation.games,
    winsA: result.metrics.evaluation.winsA,
    winsB: result.metrics.evaluation.winsB,
    ties: result.metrics.evaluation.ties,
    winRateA: result.metrics.evaluation.winRateA,
    averageMarginA: result.metrics.evaluation.averageMarginA,
  },
}, null, 2));

function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      result[key] = true;
      continue;
    }
    result[key] = next;
    i += 1;
  }
  return result;
}

function printUsage() {
  console.error('Usage: npm run train:bot -- --in <profile.json> --out <trained.json> --games 10000 --seed 42');
}

function applyOverrides(profile, args) {
  const nextTraining = {
    ...profile.training,
  };

  if (args.opponent) {
    nextTraining.opponentBotId = args.opponent;
    if (!String(args.opponent).startsWith('custom:')) {
      nextTraining.opponentProfile = null;
    }
  }
  if (args['learning-rate']) nextTraining.learningRate = Number(args['learning-rate']);
  if (args.gamma) nextTraining.gamma = Number(args.gamma);
  if (args['batch-size']) nextTraining.batchSize = Number(args['batch-size']);
  if (args['eval-games']) nextTraining.evalGames = Number(args['eval-games']);

  return {
    ...profile,
    training: nextTraining,
  };
}

