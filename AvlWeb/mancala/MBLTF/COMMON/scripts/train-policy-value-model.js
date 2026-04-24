#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { createModelBundle, parseModelBundleJson, serializeModelBundle } from '../js/ml/modelBundle.js';
import { trainPolicyValueModel } from '../js/training/policyValueTrainer.js';

const args = parseArgs(process.argv.slice(2));
if (!args.dataset) {
  throw new Error('--dataset is required');
}

const datasetPath = path.resolve(args.dataset);
const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
dataset.metadata = {
  ...(dataset.metadata ?? {}),
  path: datasetPath,
};

const inputModel = args.in
  ? parseModelBundleJson(fs.readFileSync(path.resolve(args.in), 'utf8'))
  : createModelBundle({
    id: deriveModelId(datasetPath),
    name: deriveModelName(datasetPath),
    inputLength: Number(dataset.metadata?.inputLength) || undefined,
  });

const result = trainPolicyValueModel({
  modelBundle: inputModel,
  dataset,
  options: {
    epochs: args.epochs,
    batchSize: args.batchSize,
    learningRate: args.learningRate,
    policyLossWeight: args.policyLossWeight,
    valueLossWeight: args.valueLossWeight,
    l2Regularization: args.l2Regularization,
    shuffleSeed: args.seed,
  },
});

const outputPath = path.resolve(args.out);
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, serializeModelBundle(result.modelBundle));

console.log(JSON.stringify({
  outputPath,
  finalMetrics: result.finalMetrics,
  history: result.history,
}, null, 2));

function parseArgs(argv) {
  const options = {
    dataset: null,
    in: null,
    out: './output/policy-value-model.json',
    epochs: 12,
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
    if (arg === '--dataset' && next) {
      options.dataset = next;
      index += 1;
    } else if (arg === '--in' && next) {
      options.in = next;
      index += 1;
    } else if (arg === '--out' && next) {
      options.out = next;
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

function deriveModelId(datasetPath) {
  return `${path.basename(datasetPath, path.extname(datasetPath))}-model`;
}

function deriveModelName(datasetPath) {
  return `Policy Value Model from ${path.basename(datasetPath)}`;
}

function printHelpAndExit() {
  console.log([
    'Usage: node ./scripts/train-policy-value-model.js --dataset <dataset.json> [options]',
    '',
    'Options:',
    '  --in <path>                 Existing model bundle JSON to continue training',
    '  --out <path>                Output model path. Default: ./output/policy-value-model.json',
    '  --epochs <count>            Training epochs. Default: 12',
    '  --batch-size <count>        Batch size. Default: 32',
    '  --learning-rate <value>     Learning rate. Default: 0.02',
    '  --policy-loss-weight <v>    Policy loss weight. Default: 1',
    '  --value-loss-weight <v>     Value loss weight. Default: 0.5',
    '  --l2 <value>                L2 regularization. Default: 0.0001',
    '  --seed <number>             Deterministic shuffle seed. Default: 1',
  ].join('\n'));
  process.exit(0);
}

