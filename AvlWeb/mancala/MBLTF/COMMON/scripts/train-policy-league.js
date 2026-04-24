#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { createModelBundle, parseModelBundleJson, serializeModelBundle } from '../js/ml/modelBundle.js';
import { trainPolicyValueLeague } from '../js/training/policyValueLeagueTrainer.js';

const args = parseArgs(process.argv.slice(2));
const inputModel = args.in
  ? parseModelBundleJson(fs.readFileSync(path.resolve(args.in), 'utf8'))
  : createModelBundle({
    id: 'policy-value-league-starter',
    name: 'Policy Value League Starter',
  });

const result = trainPolicyValueLeague({
  modelBundle: inputModel,
  seed: args.seed,
  options: {
    iterations: args.iterations,
    gamesPerIteration: args.gamesPerIteration,
    evalGames: args.evalGames,
    searchDepth: args.searchDepth,
    minimaxDepth: args.minimaxDepth,
    replayBufferSize: args.replayBufferSize,
    previousBestPoolSize: args.previousBestPoolSize,
    opponentSchedule: args.opponents.split(',').map((value) => value.trim()).filter(Boolean),
    trainingOptions: {
      epochs: args.epochs,
      batchSize: args.batchSize,
      learningRate: args.learningRate,
      policyLossWeight: args.policyLossWeight,
      valueLossWeight: args.valueLossWeight,
      l2Regularization: args.l2Regularization,
    },
  },
});

const outputPath = path.resolve(args.out);
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, serializeModelBundle(result.championBundle));

console.log(JSON.stringify({
  outputPath,
  championEvaluation: result.championEvaluation,
  replayBufferSize: result.replayBufferSize,
  history: result.history,
}, null, 2));

function parseArgs(argv) {
  const options = {
    in: null,
    out: './output/policy-value-league-model.json',
    iterations: 3,
    gamesPerIteration: 16,
    evalGames: 20,
    searchDepth: 2,
    minimaxDepth: 4,
    replayBufferSize: 200,
    previousBestPoolSize: 2,
    opponents: 'random,greedy,minimax,self,previous-best',
    epochs: 2,
    batchSize: 32,
    learningRate: 0.02,
    policyLossWeight: 1,
    valueLossWeight: 0.5,
    l2Regularization: 0.0001,
    seed: 1,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--in' && next) {
      options.in = next;
      index += 1;
    } else if (arg === '--out' && next) {
      options.out = next;
      index += 1;
    } else if (arg === '--iterations' && next) {
      options.iterations = Number(next);
      index += 1;
    } else if (arg === '--games-per-iteration' && next) {
      options.gamesPerIteration = Number(next);
      index += 1;
    } else if (arg === '--eval-games' && next) {
      options.evalGames = Number(next);
      index += 1;
    } else if (arg === '--search-depth' && next) {
      options.searchDepth = Number(next);
      index += 1;
    } else if (arg === '--minimax-depth' && next) {
      options.minimaxDepth = Number(next);
      index += 1;
    } else if (arg === '--replay-buffer-size' && next) {
      options.replayBufferSize = Number(next);
      index += 1;
    } else if (arg === '--previous-best-pool-size' && next) {
      options.previousBestPoolSize = Number(next);
      index += 1;
    } else if (arg === '--opponents' && next) {
      options.opponents = next;
      index += 1;
    } else if (arg === '--epochs' && next) {
      options.epochs = Number(next);
      index += 1;
    } else if (arg === '--batch-size' && next) {
      options.batchSize = Number(next);
      index += 1;
    } else if (arg === '--learning-rate' && next) {
      options.learningRate = Number(next);
      index += 1;
    } else if (arg === '--policy-loss-weight' && next) {
      options.policyLossWeight = Number(next);
      index += 1;
    } else if (arg === '--value-loss-weight' && next) {
      options.valueLossWeight = Number(next);
      index += 1;
    } else if (arg === '--l2' && next) {
      options.l2Regularization = Number(next);
      index += 1;
    } else if (arg === '--seed' && next) {
      options.seed = Number(next);
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
    'Usage: node ./scripts/train-policy-league.js [options]',
    '',
    'Options:',
    '  --in <path>                     Existing model bundle JSON to continue training',
    '  --out <path>                    Output model path. Default: ./output/policy-value-league-model.json',
    '  --iterations <count>            League iterations. Default: 3',
    '  --games-per-iteration <count>   Games generated each iteration. Default: 16',
    '  --eval-games <count>            Checkpoint gating games vs minimax. Default: 20',
    '  --search-depth <count>          Search depth for the policy-value bot. Default: 2',
    '  --minimax-depth <count>         Depth for minimax opponents. Default: 4',
    '  --replay-buffer-size <count>    Hard-loss replay buffer cap. Default: 200',
    '  --previous-best-pool-size <n>   Previous-best snapshots kept in rotation. Default: 2',
    '  --opponents <csv>               League opponents. Default: random,greedy,minimax,self,previous-best',
    '  --epochs <count>                Supervised epochs per iteration. Default: 2',
    '  --batch-size <count>            Batch size per iteration. Default: 32',
    '  --learning-rate <value>         Learning rate per iteration. Default: 0.02',
    '  --policy-loss-weight <value>    Policy loss weight. Default: 1',
    '  --value-loss-weight <value>     Value loss weight. Default: 0.5',
    '  --l2 <value>                    L2 regularization. Default: 0.0001',
    '  --seed <number>                 Deterministic seed. Default: 1',
  ].join('\n'));
  process.exit(0);
}

