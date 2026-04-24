import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { createWriteStream } from 'node:fs';
import { access, appendFile, mkdir, readFile, readdir, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { getBuiltinBotDefinitions } from '../js/bots/catalog.js';
import { getPromotedBotEntries } from '../js/bots/promotedRegistry.js';
import { createStarterProfile, serializeProfile } from '../js/bots/botProfiles.js';
import { artifactGuideCatalog, factoryBotGuideCatalog, learnOverviewSections, scriptGuideCatalog } from './content.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const devRoot = path.resolve(__dirname, '..');
const repoRoot = devRoot;
const publicRoot = path.join(devRoot, 'app', 'public');
const runtimeRoot = path.join(devRoot, 'runtime');
const jobsRoot = path.join(runtimeRoot, 'jobs');
const logsRoot = path.join(runtimeRoot, 'logs');
const stateRoot = path.join(runtimeRoot, 'state');
const stagingRoot = path.join(runtimeRoot, 'staging');
const outputRoot = path.join(devRoot, 'output');
const scriptsRoot = path.join(devRoot, 'scripts');
const serverLogPath = path.join(logsRoot, 'server.log');
const configRoot = path.join(devRoot, 'server', 'config');
const benchmarkConfigPath = path.join(configRoot, 'benchmark.json');

const args = parseArgs(process.argv.slice(2));
const port = Number(args.port ?? process.env.PORT ?? 8110);
const host = '127.0.0.1';
const activeJobs = new Map();

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
};

const scriptCatalog = [
  {
    id: 'train-bot',
    jobType: 'weighted-train',
    path: path.join(scriptsRoot, 'train-bot.js'),
    title: 'Weighted Bot Trainer',
    purpose: 'Trains a weighted-preference bot from a JSON profile on the local machine.',
    concepts: ['training loop', 'evaluation games', 'opponent bot', 'local artifacts'],
  },
  {
    id: 'generate-minimax-dataset',
    jobType: 'dataset-generate',
    path: path.join(scriptsRoot, 'generate-minimax-dataset.js'),
    title: 'Minimax Dataset Generator',
    purpose: 'Generates labeled state/action examples from simulated Mancala games.',
    concepts: ['teacher model', 'dataset generation', 'sampling', 'state encoding'],
  },
  {
    id: 'train-policy-value-model',
    jobType: 'policy-train',
    path: path.join(scriptsRoot, 'train-policy-value-model.js'),
    title: 'Policy/Value Model Trainer',
    purpose: 'Trains a policy/value network bundle from a local dataset JSON file.',
    concepts: ['epochs', 'batch size', 'loss weights', 'model bundle'],
  },
  {
    id: 'train-policy-league',
    jobType: 'league-train',
    path: path.join(scriptsRoot, 'train-policy-league.js'),
    title: 'League Fine-Tuner',
    purpose: 'Improves a policy/value model through self-play and league-style training.',
    concepts: ['league training', 'checkpoint gating', 'replay buffer', 'benchmarking'],
  },
];

const builtinBotDefinitions = getBuiltinBotDefinitions();
const promotedBotEntries = getPromotedBotEntries();
const benchmarkConfig = await loadBenchmarkConfig();

const trainingCatalog = {
  builtinBots: builtinBotDefinitions,
  modes: [
    {
      id: 'weighted-train',
      title: 'Weighted Bot',
      badge: 'Best first project',
      scriptId: 'train-bot',
      description: 'Train a weighted-preference bot locally, starting from a starter profile or an existing custom profile.',
      beginnerNote: 'You can leave the input profile blank and the Bot Lab will generate a starter profile for you.',
      defaults: {
        profileName: 'Bot Lab Weighted Bot',
        inputProfilePath: '',
        outputPath: 'bot-lab/weighted-bot.json',
        games: 6000,
        seed: 1,
        opponentBotId: 'greedy',
        learningRate: 0.03,
        gamma: 0.97,
        batchSize: 200,
        evalGames: 500,
      },
    },
    {
      id: 'dataset-generate',
      title: 'Minimax Dataset',
      badge: 'Teacher data',
      scriptId: 'generate-minimax-dataset',
      description: 'Generate a local dataset of Mancala positions labeled by a minimax teacher.',
      beginnerNote: 'This is the bridge between classic search and later policy/value training.',
      defaults: {
        outputPath: 'bot-lab/minimax-dataset.json',
        games: 200,
        seed: 1,
        teacherDepth: 4,
        sampleRate: 1,
      },
    },
    {
      id: 'policy-train',
      title: 'Policy Model',
      badge: 'Advanced',
      scriptId: 'train-policy-value-model',
      description: 'Train a policy/value model bundle from a dataset JSON file already on disk.',
      beginnerNote: 'This mode needs a dataset path. A good next step is to generate a dataset first, then paste that path here.',
      defaults: {
        datasetPath: '',
        inputModelPath: '',
        outputPath: 'bot-lab/policy-value-model.json',
        epochs: 12,
        batchSize: 32,
        learningRate: 0.02,
        policyLossWeight: 1,
        valueLossWeight: 0.5,
        l2Regularization: 0.0001,
        seed: 1,
      },
    },
    {
      id: 'league-train',
      title: 'League Fine-Tune',
      badge: 'Longest runs',
      scriptId: 'train-policy-league',
      description: 'Improve a policy/value model locally through self-play, replay buffers, and league checkpoints.',
      beginnerNote: 'This can be the longest-running mode. It is designed for users who want to push a strong model further.',
      defaults: {
        inputModelPath: '',
        outputPath: 'bot-lab/policy-value-league-model.json',
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
      },
    },
  ],
};

await ensureRuntimeFolders();
await reconcileInterruptedJobs();
await writeServerState();
await appendServerLog(`Server booted on ${host}:${port} (pid ${process.pid}).`);

const server = createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url || '/', `http://${host}:${port}`);
    const pathname = decodeURIComponent(requestUrl.pathname);

    if (pathname.startsWith('/api/')) {
      await handleApiRequest(req, res, pathname, requestUrl);
      return;
    }

    await serveStaticAsset(res, pathname);
  } catch (error) {
    const statusCode = error?.code === 'ENOENT' ? 404 : 500;
    await appendServerLog(`Route error for ${req.method ?? 'GET'} ${req.url ?? '/'}: ${error.message}`);
    sendText(res, statusCode, statusCode === 404 ? 'Not found' : `Server error: ${error.message}`);
  }
});

server.listen(port, host, () => {
  console.log(`Bot Lab server running at http://${host}:${port}/`);
});

async function handleApiRequest(req, res, pathname, requestUrl) {
  if (req.method === 'GET') {
    if (pathname === '/api/health') {
      sendJson(res, 200, buildHealthPayload());
      return;
    }
    if (pathname === '/api/setup') {
      sendJson(res, 200, await buildSetupPayload());
      return;
    }
    if (pathname === '/api/diagnostics') {
      sendJson(res, 200, await buildDiagnosticsPayload());
      return;
    }
    if (pathname === '/api/jobs') {
      sendJson(res, 200, await buildJobsPayload());
      return;
    }
    if (pathname === '/api/outputs') {
      sendJson(res, 200, await buildOutputsPayload());
      return;
    }
    if (pathname === '/api/learn/overview') {
      sendJson(res, 200, buildLearnOverviewPayload());
      return;
    }
    if (pathname === '/api/learn/scripts') {
      sendJson(res, 200, await buildScriptCatalogPayload());
      return;
    }
    if (pathname === '/api/factory-bots') {
      sendJson(res, 200, buildFactoryBotsPayload());
      return;
    }
    if (pathname === '/api/integration/hosted-game') {
      sendJson(res, 200, buildHostedGamePayload());
      return;
    }
    if (pathname === '/api/integration/benchmark') {
      sendJson(res, 200, buildBenchmarkPayload());
      return;
    }

    const artifactImportHelpMatch = pathname.match(/^\/api\/outputs\/(.+)\/import-help$/);
    if (artifactImportHelpMatch) {
      sendJson(res, 200, await buildArtifactImportHelpPayload(artifactImportHelpMatch[1]));
      return;
    }

    const artifactMatch = pathname.match(/^\/api\/outputs\/(.+)$/);
    if (artifactMatch) {
      sendJson(res, 200, await buildArtifactDetailPayload(artifactMatch[1]));
      return;
    }

    const scriptMatch = pathname.match(/^\/api\/learn\/scripts\/([^/]+)$/);
    if (scriptMatch) {
      sendJson(res, 200, await buildScriptDetailPayload(scriptMatch[1]));
      return;
    }

    const jobMatch = pathname.match(/^\/api\/jobs\/([^/]+)$/);
    if (jobMatch) {
      sendJson(res, 200, await readJobRecord(jobMatch[1]));
      return;
    }

    const jobLogMatch = pathname.match(/^\/api\/jobs\/([^/]+)\/log$/);
    if (jobLogMatch) {
      const tail = Number(requestUrl.searchParams.get('tail') ?? 0);
      sendText(res, 200, await readJobLog(jobLogMatch[1], tail));
      return;
    }
  }

  if (req.method === 'POST') {
    if (pathname === '/api/files/stage') {
      const staged = await stageUploadedFile(req);
      sendJson(res, 201, staged);
      return;
    }

    if (pathname === '/api/jobs') {
      const body = await readJsonBody(req);
      const job = await createJob(body?.type, body?.payload ?? {});
      sendJson(res, 202, { ok: true, job });
      return;
    }

    const cancelMatch = pathname.match(/^\/api\/jobs\/([^/]+)\/cancel$/);
    if (cancelMatch) {
      const job = await cancelJob(cancelMatch[1]);
      sendJson(res, 200, { ok: true, job });
      return;
    }
  }

  sendJson(res, 404, { error: 'Route not found.' });
}

async function serveStaticAsset(res, pathname) {
  const normalizedPath = pathname === '/' ? '/index.html' : pathname;
  const filePath = resolveSafePath(publicRoot, normalizedPath);
  const body = await readFile(filePath);
  const contentType = mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream';

  res.writeHead(200, {
    'Cache-Control': 'no-store',
    'Content-Type': contentType,
  });
  res.end(body);
}

function buildHealthPayload() {
  return {
    name: 'Mancala Bot Lab',
    ok: true,
    host,
    port,
    pid: process.pid,
    activeJobCount: activeJobs.size,
    uptimeSeconds: Math.round(process.uptime()),
    now: new Date().toISOString(),
  };
}

async function buildSetupPayload() {
  const scriptChecks = await Promise.all(scriptCatalog.map(async (entry) => ({
    id: entry.id,
    title: entry.title,
    exists: await pathExists(entry.path),
    path: entry.path,
    jobType: entry.jobType,
  })));

  const writableChecks = await Promise.all([
    testWritable(runtimeRoot),
    testWritable(jobsRoot),
    testWritable(logsRoot),
    testWritable(stateRoot),
    testWritable(stagingRoot),
    testWritable(outputRoot),
  ]);

  return {
    node: {
      version: process.version,
      platform: process.platform,
      arch: process.arch,
    },
    paths: {
      repoRoot,
      devRoot,
      publicRoot,
      runtimeRoot,
      outputRoot,
    },
    runtime: {
      writable: writableChecks.every(Boolean),
      folders: {
        runtimeRoot: writableChecks[0],
        jobsRoot: writableChecks[1],
        logsRoot: writableChecks[2],
        stateRoot: writableChecks[3],
        stagingRoot: writableChecks[4],
        outputRoot: writableChecks[5],
      },
    },
    scripts: scriptChecks,
    trainingCatalog,
    benchmark: buildBenchmarkPayload(),
    warnings: [
      !scriptChecks.every((entry) => entry.exists) ? 'One or more Bot Lab scripts are missing.' : null,
      !writableChecks.every(Boolean) ? 'One or more local runtime folders are not writable.' : null,
    ].filter(Boolean),
  };
}

async function buildDiagnosticsPayload() {
  const setup = await buildSetupPayload();
  const jobs = await buildJobsPayload();
  return {
    generatedAt: new Date().toISOString(),
    setupWarnings: setup.warnings,
    runtime: setup.runtime,
    paths: setup.paths,
    recentJobs: jobs.jobs.slice(0, 5).map((job) => ({
      id: job.id,
      title: job.title,
      status: job.status,
      message: job.summary?.message ?? null,
      benchmarkPassed: Boolean(job.summary?.benchmarkPassed),
      createdAt: job.createdAt,
    })),
    recoveryGuide: [
      {
        caseId: 'missing-node',
        title: 'Node.js is missing before launch',
        guidance: 'Use the Bot Lab launcher again after installing Node.js. The launcher already checks for Node and shows a friendly stop message if it is missing.',
      },
      {
        caseId: 'invalid-json',
        title: 'A JSON file will not import or inspect cleanly',
        guidance: 'Use a Bot Lab export or a compatible custom bot JSON. If the file came from somewhere else, compare it with a known good Bot Lab artifact first.',
      },
      {
        caseId: 'failed-job',
        title: 'A training job fails',
        guidance: 'Open the selected job, read the short error summary first, then export the log if you need help. Most failures come from a missing input path, an invalid JSON file, or a write path outside the output folder.',
      },
      {
        caseId: 'canceled-job',
        title: 'A job was canceled',
        guidance: 'Canceled jobs are safe to rerun. The Bot Lab keeps the log so you can confirm where the run stopped.',
      },
      {
        caseId: 'artifact-compatibility',
        title: 'An artifact looks incompatible',
        guidance: 'If the Bot Lab cannot read JSON metadata from a file, treat it as a local artifact first. Re-export from a known good bot or model run before importing it into the hosted game.',
      },
    ],
    releaseChecklist: [
      'Node runtime is visible and runtime folders are writable.',
      'A beginner can start a local job without using the terminal directly.',
      'A finished artifact explains what it is and how to use it in the hosted game.',
      'Benchmark messaging and invitation copy are visible when relevant.',
      'Diagnostics can be copied or downloaded locally when support is needed.',
    ],
  };
}

async function buildJobsPayload() {
  const entries = await readJsonRecords(jobsRoot);
  entries.sort((left, right) => String(right.createdAt ?? '').localeCompare(String(left.createdAt ?? '')));
  return {
    activeCount: entries.filter((entry) => ['queued', 'starting', 'running'].includes(entry.status)).length,
    totalCount: entries.length,
    jobs: entries,
  };
}

async function buildOutputsPayload() {
  const jobRecords = await readJsonRecords(jobsRoot);
  const artifactJobIndex = createArtifactJobIndex(jobRecords);
  const artifacts = [];
  await collectArtifacts(outputRoot, artifacts, artifactJobIndex);
  artifacts.sort((left, right) => String(right.modifiedAt).localeCompare(String(left.modifiedAt)));
  return {
    count: artifacts.length,
    artifacts,
  };
}

async function buildArtifactDetailPayload(artifactId) {
  const artifactPath = resolveArtifactPathFromId(artifactId);
  const fileStat = await stat(artifactPath);
  const type = classifyArtifact(path.basename(artifactPath));
  const metadata = await readArtifactMetadata(artifactPath, type);
  const sourceJob = await findSourceJobForArtifact(artifactPath);

  return {
    id: artifactId,
    name: path.basename(artifactPath),
    path: artifactPath,
    relativePath: path.relative(outputRoot, artifactPath),
    type,
    sizeBytes: fileStat.size,
    modifiedAt: fileStat.mtime.toISOString(),
    sourceJobId: sourceJob?.id ?? null,
    sourceJobTitle: sourceJob?.title ?? null,
    benchmarkPassed: Boolean(sourceJob?.summary?.benchmarkPassed),
    benchmarkMessage: sourceJob?.summary?.benchmarkMessage ?? null,
    submissionInvitation: sourceJob?.summary?.submissionInvitation ?? null,
    guide: artifactGuideCatalog[type] ?? artifactGuideCatalog.artifact,
    metadata,
  };
}

async function buildArtifactImportHelpPayload(artifactId) {
  const artifact = await buildArtifactDetailPayload(artifactId);
  const hostedGame = buildHostedGamePayload();
  return {
    artifactId,
    artifactName: artifact.name,
    artifactType: artifact.type,
    importable: artifact.guide.importable,
    guideLabel: artifact.guide.label,
    whatItIs: artifact.guide.whatItIs,
    nextStep: artifact.guide.nextStep,
    hostedGameUrl: hostedGame.hostedGameUrl,
    hostedGameSteps: artifact.guide.hostedGameSteps,
    localPrivacyNote: artifact.guide.localPrivacyNote,
    hostedGameChecklist: hostedGame.checklist,
    hostedGameControls: hostedGame.controls,
  };
}

function buildLearnOverviewPayload() {
  return {
    sections: learnOverviewSections,
  };
}

function buildFactoryBotsPayload() {
  const builtins = builtinBotDefinitions.map((bot) => ({
    ...bot,
    family: 'factory',
    description: factoryBotGuideCatalog[bot.id] ?? null,
  }));
  const promoted = promotedBotEntries.map((entry) => ({
    id: entry.id,
    name: entry.name,
    kind: 'promoted',
    family: 'factory',
    promotedAt: entry.promotedAt,
    searchDepth: entry.searchDepth,
    notes: entry.notes,
    description: factoryBotGuideCatalog[entry.id] ?? null,
  }));

  return {
    intro: 'These are the factory bots already available in the Mancala game. They give learners a shared language for what each opponent is trying to do before they start training their own bots.',
    bots: [...builtins, ...promoted],
  };
}

async function buildScriptCatalogPayload() {
  return {
    scripts: await Promise.all(scriptCatalog.map(async (entry) => ({
      ...entry,
      exists: await pathExists(entry.path),
      relativePath: path.relative(repoRoot, entry.path),
      whenToUse: scriptGuideCatalog[entry.id]?.whenToUse ?? null,
      beginnerExplanation: scriptGuideCatalog[entry.id]?.beginnerExplanation ?? null,
    }))),
  };
}

async function buildScriptDetailPayload(scriptId) {
  const script = scriptCatalog.find((entry) => entry.id === scriptId);
  if (!script) {
    const error = new Error('Script not found.');
    error.code = 'ENOENT';
    throw error;
  }

  return {
    ...script,
    exists: await pathExists(script.path),
    relativePath: path.relative(repoRoot, script.path),
    guide: scriptGuideCatalog[script.id] ?? null,
    source: await readFile(script.path, 'utf8'),
  };
}

function buildHostedGamePayload() {
  return {
    hostedGameUrl: 'https://render-hosted-mancala.example',
    localBotPolicy: 'Custom bots stay local in the browser during normal play.',
    workspaceName: 'Bot Lab',
    controls: {
      profilesCard: 'Profiles',
      importButton: 'Import JSON',
      exportButton: 'Export JSON',
      matchupSelectors: ['Player 1', 'Player 2'],
    },
    importSteps: [
      'Train or export a bot locally from the Bot Lab.',
      'Open the hosted Mancala game and switch to the Bot Lab workspace.',
      'In the Profiles card, use Import JSON to load the local bot file.',
      'Pick the imported bot in the Player 1 or Player 2 selectors and start a match.',
    ],
    checklist: [
      'Your bot file stays local in the browser during normal play.',
      'Import starts from Bot Lab > Profiles > Import JSON.',
      'Imported bots appear alongside factory bots in local selection controls.',
      'Use Player 1 and Player 2 selectors to test the bot immediately.',
    ],
    note: 'The real hosted URL can be filled in once the production Render deployment is finalized.',
    benchmarkTrack: benchmarkConfig.label,
  };
}

function buildBenchmarkPayload() {
  return {
    ...benchmarkConfig,
    summary: `Beat ${benchmarkConfig.benchmarkBotName} with at least ${asPercent(benchmarkConfig.minimumWinRate)} over ${benchmarkConfig.minimumGames} games on the V1 benchmark track.`,
    challengeSteps: [
      'Train a weighted bot locally inside the Bot Lab.',
      `Use ${benchmarkConfig.benchmarkBotName} as the benchmark opponent.`,
      `Run at least ${benchmarkConfig.minimumGames} evaluation games so the result counts for the V1 track.`,
      'If the run clears the target, import the bot into the hosted game and celebrate the invitation moment.',
    ],
    submissionChecklist: [
      'Beating the benchmark is worth celebrating, but submission is still optional.',
      'Inclusion in the hosted game will stay curated.',
      'A fuller submission and leaderboard flow is planned for a later phase.',
    ],
  };
}

async function createJob(type, payload) {
  const mode = trainingCatalog.modes.find((entry) => entry.id === type);
  if (!mode) {
    throw new Error(`Unknown job type: ${type}`);
  }

  const jobId = `job_${new Date().toISOString().replaceAll(/[-:.TZ]/g, '').slice(0, 14)}_${randomUUID().slice(0, 8)}`;
  const logPath = path.join(logsRoot, `${jobId}.log`);
  const prepared = await prepareJob(type, payload, jobId);

  const job = {
    id: jobId,
    type,
    status: 'starting',
    title: prepared.title,
    createdAt: new Date().toISOString(),
    startedAt: null,
    endedAt: null,
    cancelRequested: false,
    payload: prepared.payload,
    command: {
      script: path.basename(prepared.scriptPath),
      scriptPath: prepared.scriptPath,
      args: prepared.args,
    },
    paths: {
      logPath,
      primaryArtifactPath: prepared.primaryArtifactPath,
      stagingInputPath: prepared.stagingInputPath,
    },
    summary: {
      message: 'Preparing local execution.',
      benchmarkPassed: false,
    },
    result: null,
    error: null,
    exitCode: null,
    signal: null,
  };

  await writeJobRecord(job);
  startJob(job);
  await appendServerLog(`Created job ${job.id} (${job.type}).`);
  return job;
}

async function cancelJob(jobId) {
  const job = await readJobRecord(jobId);
  job.cancelRequested = true;
  job.summary = {
    ...job.summary,
    message: 'Cancellation requested. Waiting for the local process to exit.',
  };
  await writeJobRecord(job);

  const handle = activeJobs.get(jobId);
  if (handle?.job) {
    handle.job.cancelRequested = true;
    handle.job.summary = {
      ...handle.job.summary,
      message: 'Cancellation requested. Waiting for the local process to exit.',
    };
  }
  if (handle?.child) {
    try {
      handle.child.kill('SIGTERM');
    } catch {
      handle.child.kill();
    }
  }

  await appendServerLog(`Cancellation requested for job ${jobId}.`);
  return job;
}

function startJob(job) {
  const logStream = createWriteStream(job.paths.logPath, { flags: 'a' });
  let child;
  try {
    child = spawn(process.execPath, [job.command.scriptPath, ...job.command.args], {
      cwd: devRoot,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    writeLogLine(logStream, `# Mancala Bot Lab job ${job.id}`);
    writeLogLine(logStream, `# Script: ${job.command.script}`);
    writeLogLine(logStream, `# Immediate spawn failure: ${error.message}`);
    logStream.end();
    job.status = 'failed';
    job.endedAt = new Date().toISOString();
    job.error = { message: error.message };
    job.summary = {
      ...job.summary,
      message: 'The local process could not be started.',
    };
    void writeJobRecord(job);
    void appendServerLog(`Job ${job.id} failed to spawn: ${error.message}`);
    return;
  }

  const handle = {
    job,
    child,
    logStream,
    stdoutChunks: [],
    stderrChunks: [],
    settled: false,
  };
  activeJobs.set(job.id, handle);

  writeLogLine(logStream, `# Mancala Bot Lab job ${job.id}`);
  writeLogLine(logStream, `# Script: ${job.command.script}`);
  writeLogLine(logStream, `# Command: node ${job.command.script} ${job.command.args.join(' ')}`);
  writeLogLine(logStream, `# Created: ${job.createdAt}`);
  writeLogLine(logStream, '');

  child.on('spawn', async () => {
    job.status = 'running';
    job.startedAt = new Date().toISOString();
    job.summary = {
      ...job.summary,
      message: 'Running locally. You can close the browser tab and reopen it later while the server stays up.',
    };
    await writeJobRecord(job);
    await appendServerLog(`Started job ${job.id}.`);
  });

  child.stdout.on('data', (chunk) => {
    const text = chunk.toString();
    handle.stdoutChunks.push(text);
    handle.logStream.write(text);
  });

  child.stderr.on('data', (chunk) => {
    const text = chunk.toString();
    handle.stderrChunks.push(text);
    handle.logStream.write(text);
  });

  child.on('error', async (error) => {
    if (handle.settled) return;
    handle.settled = true;
    activeJobs.delete(job.id);
    handle.logStream.end();

    job.status = job.cancelRequested ? 'canceled' : 'failed';
    job.endedAt = new Date().toISOString();
    job.error = { message: error.message };
    job.summary = {
      ...job.summary,
      message: job.cancelRequested ? 'Canceled before execution completed.' : 'The local process failed before completion.',
    };
    await writeJobRecord(job);
    await appendServerLog(`Job ${job.id} failed to start: ${error.message}`);
  });

  child.on('close', async (code, signal) => {
    if (handle.settled) return;
    handle.settled = true;
    activeJobs.delete(job.id);
    handle.logStream.end();

    const stdoutText = handle.stdoutChunks.join('');
    const stderrText = handle.stderrChunks.join('');
    const primaryArtifactExists = job.paths.primaryArtifactPath
      ? await pathExists(job.paths.primaryArtifactPath)
      : false;
    const parsed = await buildJobCompletion(job, stdoutText, stderrText, code, signal, primaryArtifactExists);

    job.status = parsed.status;
    job.endedAt = new Date().toISOString();
    job.exitCode = code;
    job.signal = signal;
    job.result = parsed.result;
    job.summary = parsed.summary;
    job.error = parsed.error;
    await writeJobRecord(job);
    await appendServerLog(`Job ${job.id} finished with status ${job.status}.`);
  });
}

async function buildJobCompletion(job, stdoutText, stderrText, code, signal, primaryArtifactExists) {
  if (job.cancelRequested) {
    return {
      status: 'canceled',
      result: null,
      summary: {
        message: 'The local job was canceled by the user.',
        benchmarkPassed: false,
      },
      error: null,
    };
  }

  if (code !== 0) {
    return {
      status: 'failed',
      result: null,
      summary: {
        message: 'The local job exited with an error.',
        benchmarkPassed: false,
      },
      error: {
        message: stderrText.trim() || `Process exited with code ${code}${signal ? ` (${signal})` : ''}.`,
      },
    };
  }

  const parsedResult = parseJobResult(job.type, stdoutText);
  return {
    status: 'succeeded',
    result: parsedResult,
    summary: summarizeSuccessfulJob(job, parsedResult, primaryArtifactExists, job.paths.primaryArtifactPath),
    error: null,
  };
}

function parseJobResult(type, stdoutText) {
  const trimmed = stdoutText.trim();
  if (!trimmed) return null;

  if (type === 'dataset-generate') {
    const match = trimmed.match(/^Wrote\s+(\d+)\s+samples\s+from\s+(\d+)\s+games\s+to\s+(.+)$/m);
    if (!match) {
      return { message: trimmed };
    }
    return {
      sampleCount: Number(match[1]),
      gameCount: Number(match[2]),
      outputPath: match[3].trim(),
    };
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return { message: trimmed };
  }
}

function summarizeSuccessfulJob(job, result, primaryArtifactExists, primaryArtifactPath) {
  const benchmarkOutcome = evaluateBenchmark(job, result);
  switch (job.type) {
    case 'weighted-train': {
      const winRate = asPercent(result?.record?.winRate ?? result?.evaluation?.winRateA);
      const games = result?.games ?? 'unknown';
      return {
        message: `Weighted training complete. Win rate: ${winRate}. Training games: ${games}.`,
        benchmarkPassed: benchmarkOutcome.passed,
        benchmarkMessage: benchmarkOutcome.message,
        submissionInvitation: benchmarkOutcome.invitation,
        primaryArtifactPath,
        artifactReady: primaryArtifactExists,
      };
    }
    case 'dataset-generate': {
      const sampleCount = result?.sampleCount ?? 'unknown';
      const gameCount = result?.gameCount ?? 'unknown';
      return {
        message: `Dataset generation complete. Collected ${sampleCount} samples from ${gameCount} games.`,
        benchmarkPassed: false,
        benchmarkMessage: benchmarkOutcome.message,
        primaryArtifactPath,
        artifactReady: primaryArtifactExists,
      };
    }
    case 'policy-train': {
      const finalLoss = result?.finalMetrics?.totalLoss;
      return {
        message: `Policy/value training complete.${Number.isFinite(finalLoss) ? ` Final total loss: ${Number(finalLoss).toFixed(4)}.` : ''}`,
        benchmarkPassed: false,
        benchmarkMessage: benchmarkOutcome.message,
        primaryArtifactPath,
        artifactReady: primaryArtifactExists,
      };
    }
    case 'league-train': {
      const winRate = asPercent(result?.championEvaluation?.winRateA);
      return {
        message: `League training complete. Champion evaluation win rate: ${winRate}.`,
        benchmarkPassed: false,
        benchmarkMessage: benchmarkOutcome.message,
        primaryArtifactPath,
        artifactReady: primaryArtifactExists,
      };
    }
    case 'bot-eval': {
      const winRate = asPercent(result?.winRateA);
      const opponent = result?.opponent ?? 'unknown opponent';
      return {
        message: `Evaluation complete. Win rate versus ${opponent}: ${winRate}.`,
        benchmarkPassed: benchmarkOutcome.passed,
        benchmarkMessage: benchmarkOutcome.message,
        submissionInvitation: benchmarkOutcome.invitation,
        primaryArtifactPath: null,
        artifactReady: false,
      };
    }
    default:
      return {
        message: primaryArtifactExists ? 'Job completed successfully.' : 'Job completed successfully, but no artifact was detected.',
        benchmarkPassed: benchmarkOutcome.passed,
        benchmarkMessage: benchmarkOutcome.message,
        submissionInvitation: benchmarkOutcome.invitation,
        primaryArtifactPath,
        artifactReady: primaryArtifactExists,
      };
  }
}

function evaluateBenchmark(job, result) {
  if (!benchmarkConfig.evaluatedJobTypes.includes(job.type)) {
    return { passed: false, message: 'This job type does not use the benchmark track yet.', invitation: null };
  }

  const opponentBotId = job.payload?.opponentBotId;
  if (opponentBotId !== benchmarkConfig.benchmarkBotId) {
    return {
      passed: false,
      message: `To use the V1 benchmark track, evaluate against ${benchmarkConfig.benchmarkBotName}.`,
      invitation: null,
    };
  }

  const games = Number(job.type === 'bot-eval' ? result?.games : result?.evaluation?.games);
  const winRate = Number(job.type === 'bot-eval' ? result?.winRateA : result?.evaluation?.winRateA);

  if (!Number.isFinite(games) || games < benchmarkConfig.minimumGames) {
    return {
      passed: false,
      message: `Run at least ${benchmarkConfig.minimumGames} evaluation games against ${benchmarkConfig.benchmarkBotName} to activate the benchmark invitation.`,
      invitation: null,
    };
  }

  if (!Number.isFinite(winRate) || winRate < benchmarkConfig.minimumWinRate) {
    return {
      passed: false,
      message: `The current V1 benchmark asks for at least ${asPercent(benchmarkConfig.minimumWinRate)} win rate versus ${benchmarkConfig.benchmarkBotName}.`,
      invitation: null,
    };
  }

  return {
    passed: true,
    message: benchmarkConfig.celebrationMessage,
    invitation: benchmarkConfig.submissionInvitation,
  };
}

async function prepareJob(type, payload, jobId) {
  switch (type) {
    case 'weighted-train':
      return prepareWeightedTrainJob(payload, jobId);
    case 'dataset-generate':
      return prepareDatasetJob(payload);
    case 'policy-train':
      return preparePolicyTrainJob(payload);
    case 'league-train':
      return prepareLeagueTrainJob(payload);
    case 'bot-eval':
      return prepareEvaluationJob(payload);
    default:
      throw new Error(`Unsupported job type: ${type}`);
  }
}

async function prepareWeightedTrainJob(payload, jobId) {
  const defaults = getModeDefaults('weighted-train');
  const outputPath = resolveOutputPath(payload.outputPath, defaults.outputPath);
  const opponentBotId = normalizeBuiltinBotId(payload.opponentBotId ?? defaults.opponentBotId);
  const normalizedPayload = {
    profileName: normalizeText(payload.profileName, defaults.profileName),
    inputProfilePath: normalizeText(payload.inputProfilePath, ''),
    outputPath,
    games: normalizeInteger(payload.games, defaults.games, 2, 500000),
    seed: normalizeInteger(payload.seed, defaults.seed, 1, 99999999),
    opponentBotId,
    learningRate: normalizeNumber(payload.learningRate, defaults.learningRate, 0.0001, 1),
    gamma: normalizeNumber(payload.gamma, defaults.gamma, 0, 1),
    batchSize: normalizeInteger(payload.batchSize, defaults.batchSize, 1, 100000),
    evalGames: normalizeInteger(payload.evalGames, defaults.evalGames, 2, 10000),
  };

  let inputProfilePath = normalizedPayload.inputProfilePath
    ? resolveInputPath(normalizedPayload.inputProfilePath)
    : path.join(stagingRoot, `${jobId}-starter-weighted-bot.json`);
  let stagingInputPath = null;

  if (normalizedPayload.inputProfilePath) {
    await assertFileReadable(inputProfilePath, 'Weighted training input profile');
  } else {
    stagingInputPath = inputProfilePath;
    const starter = createStarterProfile();
    const profile = {
      ...starter,
      name: normalizedPayload.profileName,
      training: {
        ...starter.training,
        learningRate: normalizedPayload.learningRate,
        gamma: normalizedPayload.gamma,
        batchSize: normalizedPayload.batchSize,
        opponentBotId: normalizedPayload.opponentBotId,
        evalGames: normalizedPayload.evalGames,
      },
    };
    await writeFile(stagingInputPath, serializeProfile(profile), 'utf8');
  }

  return {
    title: `Train Weighted Bot: ${normalizedPayload.profileName}`,
    scriptPath: path.join(scriptsRoot, 'train-bot.js'),
    args: [
      '--in', inputProfilePath,
      '--out', normalizedPayload.outputPath,
      '--games', String(normalizedPayload.games),
      '--seed', String(normalizedPayload.seed),
      '--opponent', normalizedPayload.opponentBotId,
      '--learning-rate', String(normalizedPayload.learningRate),
      '--gamma', String(normalizedPayload.gamma),
      '--batch-size', String(normalizedPayload.batchSize),
      '--eval-games', String(normalizedPayload.evalGames),
    ],
    payload: {
      ...normalizedPayload,
      inputProfilePath,
      usedStarterProfile: !normalizedPayload.inputProfilePath,
    },
    primaryArtifactPath: normalizedPayload.outputPath,
    stagingInputPath,
  };
}

function prepareDatasetJob(payload) {
  const defaults = getModeDefaults('dataset-generate');
  const normalizedPayload = {
    outputPath: resolveOutputPath(payload.outputPath, defaults.outputPath),
    games: normalizeInteger(payload.games, defaults.games, 1, 500000),
    seed: normalizeInteger(payload.seed, defaults.seed, 1, 99999999),
    teacherDepth: normalizeInteger(payload.teacherDepth, defaults.teacherDepth, 1, 10),
    sampleRate: normalizeNumber(payload.sampleRate, defaults.sampleRate, 0.0001, 1),
  };

  return {
    title: 'Generate Minimax Dataset',
    scriptPath: path.join(scriptsRoot, 'generate-minimax-dataset.js'),
    args: [
      '--out', normalizedPayload.outputPath,
      '--games', String(normalizedPayload.games),
      '--seed', String(normalizedPayload.seed),
      '--teacher-depth', String(normalizedPayload.teacherDepth),
      '--sample-rate', String(normalizedPayload.sampleRate),
    ],
    payload: normalizedPayload,
    primaryArtifactPath: normalizedPayload.outputPath,
    stagingInputPath: null,
  };
}

async function preparePolicyTrainJob(payload) {
  const defaults = getModeDefaults('policy-train');
  const datasetPath = resolveRequiredInputPath(payload.datasetPath, 'Policy training dataset');
  const inputModelPath = normalizeText(payload.inputModelPath, '')
    ? resolveInputPath(payload.inputModelPath)
    : null;

  await assertFileReadable(datasetPath, 'Policy training dataset');
  if (inputModelPath) {
    await assertFileReadable(inputModelPath, 'Policy training input model');
  }

  const normalizedPayload = {
    datasetPath,
    inputModelPath,
    outputPath: resolveOutputPath(payload.outputPath, defaults.outputPath),
    epochs: normalizeInteger(payload.epochs, defaults.epochs, 1, 1000),
    batchSize: normalizeInteger(payload.batchSize, defaults.batchSize, 1, 100000),
    learningRate: normalizeNumber(payload.learningRate, defaults.learningRate, 0.000001, 1),
    policyLossWeight: normalizeNumber(payload.policyLossWeight, defaults.policyLossWeight, 0, 1000),
    valueLossWeight: normalizeNumber(payload.valueLossWeight, defaults.valueLossWeight, 0, 1000),
    l2Regularization: normalizeNumber(payload.l2Regularization, defaults.l2Regularization, 0, 1),
    seed: normalizeInteger(payload.seed, defaults.seed, 1, 99999999),
  };

  const args = [
    '--dataset', normalizedPayload.datasetPath,
    '--out', normalizedPayload.outputPath,
    '--epochs', String(normalizedPayload.epochs),
    '--batch-size', String(normalizedPayload.batchSize),
    '--learning-rate', String(normalizedPayload.learningRate),
    '--policy-loss-weight', String(normalizedPayload.policyLossWeight),
    '--value-loss-weight', String(normalizedPayload.valueLossWeight),
    '--l2', String(normalizedPayload.l2Regularization),
    '--seed', String(normalizedPayload.seed),
  ];

  if (normalizedPayload.inputModelPath) {
    args.unshift('--in', normalizedPayload.inputModelPath);
  }

  return {
    title: 'Train Policy/Value Model',
    scriptPath: path.join(scriptsRoot, 'train-policy-value-model.js'),
    args,
    payload: normalizedPayload,
    primaryArtifactPath: normalizedPayload.outputPath,
    stagingInputPath: null,
  };
}

async function prepareLeagueTrainJob(payload) {
  const defaults = getModeDefaults('league-train');
  const inputModelPath = normalizeText(payload.inputModelPath, '')
    ? resolveInputPath(payload.inputModelPath)
    : null;

  if (inputModelPath) {
    await assertFileReadable(inputModelPath, 'League training input model');
  }

  const normalizedPayload = {
    inputModelPath,
    outputPath: resolveOutputPath(payload.outputPath, defaults.outputPath),
    iterations: normalizeInteger(payload.iterations, defaults.iterations, 1, 500),
    gamesPerIteration: normalizeInteger(payload.gamesPerIteration, defaults.gamesPerIteration, 1, 100000),
    evalGames: normalizeInteger(payload.evalGames, defaults.evalGames, 2, 10000),
    searchDepth: normalizeInteger(payload.searchDepth, defaults.searchDepth, 1, 8),
    minimaxDepth: normalizeInteger(payload.minimaxDepth, defaults.minimaxDepth, 1, 8),
    replayBufferSize: normalizeInteger(payload.replayBufferSize, defaults.replayBufferSize, 1, 1000000),
    previousBestPoolSize: normalizeInteger(payload.previousBestPoolSize, defaults.previousBestPoolSize, 1, 1000),
    opponents: normalizeText(payload.opponents, defaults.opponents),
    epochs: normalizeInteger(payload.epochs, defaults.epochs, 1, 1000),
    batchSize: normalizeInteger(payload.batchSize, defaults.batchSize, 1, 100000),
    learningRate: normalizeNumber(payload.learningRate, defaults.learningRate, 0.000001, 1),
    policyLossWeight: normalizeNumber(payload.policyLossWeight, defaults.policyLossWeight, 0, 1000),
    valueLossWeight: normalizeNumber(payload.valueLossWeight, defaults.valueLossWeight, 0, 1000),
    l2Regularization: normalizeNumber(payload.l2Regularization, defaults.l2Regularization, 0, 1),
    seed: normalizeInteger(payload.seed, defaults.seed, 1, 99999999),
  };

  const args = [
    '--out', normalizedPayload.outputPath,
    '--iterations', String(normalizedPayload.iterations),
    '--games-per-iteration', String(normalizedPayload.gamesPerIteration),
    '--eval-games', String(normalizedPayload.evalGames),
    '--search-depth', String(normalizedPayload.searchDepth),
    '--minimax-depth', String(normalizedPayload.minimaxDepth),
    '--replay-buffer-size', String(normalizedPayload.replayBufferSize),
    '--previous-best-pool-size', String(normalizedPayload.previousBestPoolSize),
    '--opponents', normalizedPayload.opponents,
    '--epochs', String(normalizedPayload.epochs),
    '--batch-size', String(normalizedPayload.batchSize),
    '--learning-rate', String(normalizedPayload.learningRate),
    '--policy-loss-weight', String(normalizedPayload.policyLossWeight),
    '--value-loss-weight', String(normalizedPayload.valueLossWeight),
    '--l2', String(normalizedPayload.l2Regularization),
    '--seed', String(normalizedPayload.seed),
  ];

  if (normalizedPayload.inputModelPath) {
    args.unshift('--in', normalizedPayload.inputModelPath);
  }

  return {
    title: 'League Fine-Tune Policy/Value Model',
    scriptPath: path.join(scriptsRoot, 'train-policy-league.js'),
    args,
    payload: normalizedPayload,
    primaryArtifactPath: normalizedPayload.outputPath,
    stagingInputPath: null,
  };
}

async function prepareEvaluationJob(payload) {
  const defaults = getModeDefaults('bot-eval');
  const inputPath = resolveRequiredInputPath(payload.inputPath, 'Bot evaluation input profile');
  await assertFileReadable(inputPath, 'Bot evaluation input profile');

  const normalizedPayload = {
    inputPath,
    opponentBotId: normalizeBuiltinBotId(payload.opponentBotId ?? defaults.opponentBotId),
    games: normalizeInteger(payload.games, defaults.games, 2, 10000),
    seed: normalizeInteger(payload.seed, defaults.seed, 1, 99999999),
  };

  return {
    title: 'Evaluate Weighted Bot',
    scriptPath: path.join(scriptsRoot, 'eval-bot.js'),
    args: [
      '--in', normalizedPayload.inputPath,
      '--opponent', normalizedPayload.opponentBotId,
      '--games', String(normalizedPayload.games),
      '--seed', String(normalizedPayload.seed),
    ],
    payload: normalizedPayload,
    primaryArtifactPath: null,
    stagingInputPath: null,
  };
}

async function ensureRuntimeFolders() {
  await mkdir(publicRoot, { recursive: true });
  await mkdir(runtimeRoot, { recursive: true });
  await mkdir(jobsRoot, { recursive: true });
  await mkdir(logsRoot, { recursive: true });
  await mkdir(stateRoot, { recursive: true });
  await mkdir(stagingRoot, { recursive: true });
  await mkdir(outputRoot, { recursive: true });
}

async function reconcileInterruptedJobs() {
  const jobs = await readJsonRecords(jobsRoot);
  const now = new Date().toISOString();

  await Promise.all(jobs.map(async (job) => {
    if (!['queued', 'starting', 'running'].includes(job.status)) return;
    const next = {
      ...job,
      status: 'failed',
      endedAt: now,
      summary: {
        ...(job.summary ?? {}),
        message: 'This job was interrupted because the Bot Lab server restarted before it finished.',
        benchmarkPassed: false,
      },
      error: {
        message: 'Bot Lab server restarted while this job was active.',
      },
    };
    await writeJobRecord(next);
  }));
}

async function writeServerState() {
  const statePath = path.join(stateRoot, 'app-state.json');
  const state = {
    name: 'Mancala Bot Lab',
    startedAt: new Date().toISOString(),
    host,
    port,
    pid: process.pid,
  };
  await writeFile(statePath, JSON.stringify(state, null, 2));
}

async function readJsonRecords(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const records = [];

  for (const entry of entries) {
    if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== '.json') continue;
    const filePath = path.join(directory, entry.name);
    try {
      const text = await readFile(filePath, 'utf8');
      records.push(JSON.parse(text));
    } catch {
      records.push({
        id: entry.name,
        status: 'corrupt',
        title: entry.name,
        createdAt: null,
      });
    }
  }

  return records;
}

async function writeJobRecord(job) {
  const filePath = path.join(jobsRoot, `${job.id}.json`);
  await writeFile(filePath, JSON.stringify(job, null, 2));
}

async function readJobRecord(jobId) {
  const filePath = path.join(jobsRoot, `${jobId}.json`);
  const text = await readFile(filePath, 'utf8');
  return JSON.parse(text);
}

async function readJobLog(jobId, tail = 0) {
  const job = await readJobRecord(jobId);
  if (!(await pathExists(job.paths?.logPath))) {
    return '';
  }

  const text = await readFile(job.paths.logPath, 'utf8');
  if (!tail || tail <= 0) return text;
  return text.slice(-tail);
}

function createArtifactJobIndex(jobRecords) {
  const index = new Map();
  for (const job of jobRecords) {
    const artifactPath = normalizePathKey(job.paths?.primaryArtifactPath);
    if (!artifactPath) continue;
    index.set(artifactPath, {
      id: job.id,
      title: job.title,
      benchmarkPassed: Boolean(job.summary?.benchmarkPassed),
    });
  }
  return index;
}

async function findSourceJobForArtifact(artifactPath) {
  const jobs = await readJsonRecords(jobsRoot);
  return jobs.find((job) => normalizePathKey(job.paths?.primaryArtifactPath) === normalizePathKey(artifactPath)) ?? null;
}

async function collectArtifacts(directory, artifacts, artifactJobIndex = new Map()) {
  if (!(await pathExists(directory))) return;

  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await collectArtifacts(filePath, artifacts, artifactJobIndex);
      continue;
    }

    const fileStat = await stat(filePath);
    const sourceJob = artifactJobIndex.get(normalizePathKey(filePath));
    artifacts.push({
      id: path.relative(outputRoot, filePath).replaceAll(path.sep, '/'),
      name: entry.name,
      path: filePath,
      relativePath: path.relative(outputRoot, filePath),
      sizeBytes: fileStat.size,
      modifiedAt: fileStat.mtime.toISOString(),
      type: classifyArtifact(entry.name),
      sourceJobId: sourceJob?.id ?? null,
      sourceJobTitle: sourceJob?.title ?? null,
      benchmarkPassed: sourceJob?.benchmarkPassed ?? false,
    });
  }
}

function classifyArtifact(fileName) {
  const lower = fileName.toLowerCase();
  if (lower.includes('dataset')) return 'dataset';
  if (lower.includes('league')) return 'league-model';
  if (lower.includes('model')) return 'policy-model';
  if (lower.endsWith('.json')) return 'weighted-profile';
  return 'artifact';
}

function resolveArtifactPathFromId(artifactId) {
  const sanitized = String(artifactId).replaceAll('/', path.sep);
  const artifactPath = path.resolve(outputRoot, sanitized);
  if (!isPathInsideRoot(outputRoot, artifactPath)) {
    throw new Error('Artifact path escapes the output folder.');
  }
  return artifactPath;
}

async function readArtifactMetadata(artifactPath, type) {
  if (path.extname(artifactPath).toLowerCase() !== '.json') {
    return null;
  }

  try {
    const parsed = JSON.parse(await readFile(artifactPath, 'utf8'));
    if (type === 'weighted-profile') {
      return {
        botType: parsed.botType ?? 'weighted-preference',
        name: parsed.name ?? path.basename(artifactPath),
        opponentBotId: parsed.training?.opponentBotId ?? null,
        evalGames: parsed.training?.evalGames ?? null,
      };
    }
    if (type === 'dataset') {
      return {
        format: parsed.format ?? parsed.metadata?.format ?? 'dataset-json',
        sampleCount: parsed.samples?.length ?? null,
        gameCount: parsed.metadata?.games ?? null,
      };
    }
    if (type === 'policy-model' || type === 'league-model') {
      return {
        botType: parsed.botType ?? parsed.modelType ?? null,
        name: parsed.name ?? path.basename(artifactPath),
        gamesSeen: parsed.trainingMetadata?.gamesSeen ?? null,
        searchDepth: parsed.trainingMetadata?.lastLeagueTrainingRun?.searchDepth ?? parsed.trainingMetadata?.searchDepth ?? null,
      };
    }
    return null;
  } catch {
    return null;
  }
}

async function testWritable(directory) {
  const probePath = path.join(directory, '.write-test.tmp');
  try {
    await access(directory);
    await writeFile(probePath, 'ok');
    await unlink(probePath);
    return true;
  } catch {
    return false;
  }
}

async function pathExists(candidatePath) {
  try {
    await access(candidatePath);
    return true;
  } catch {
    return false;
  }
}

function resolveSafePath(root, pathname) {
  const relativePath = pathname.replace(/^\/+/, '') || 'index.html';
  const resolvedPath = path.resolve(root, relativePath);
  const relativeToRoot = path.relative(root, resolvedPath);

  if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
    const error = new Error('Path escapes allowed root.');
    error.code = 'EACCES';
    throw error;
  }

  return resolvedPath;
}

function resolveInputPath(inputPath) {
  const trimmed = normalizeText(inputPath, '');
  return path.isAbsolute(trimmed) ? path.resolve(trimmed) : path.resolve(repoRoot, trimmed);
}

function resolveRequiredInputPath(inputPath, label) {
  const trimmed = normalizeText(inputPath, '');
  if (!trimmed) {
    throw new Error(`${label} is required.`);
  }
  return resolveInputPath(trimmed);
}

function resolveOutputPath(outputPath, fallbackRelativePath) {
  const trimmed = normalizeText(outputPath, fallbackRelativePath);
  const candidate = path.isAbsolute(trimmed)
    ? path.resolve(trimmed)
    : path.resolve(outputRoot, trimmed);
  if (!isPathInsideRoot(outputRoot, candidate)) {
    throw new Error(`Output path must stay inside ${outputRoot}.`);
  }
  return candidate;
}

function isPathInsideRoot(root, candidatePath) {
  const relativeToRoot = path.relative(root, candidatePath);
  return !relativeToRoot.startsWith('..') && !path.isAbsolute(relativeToRoot);
}

async function assertFileReadable(candidatePath, label) {
  if (!(await pathExists(candidatePath))) {
    throw new Error(`${label} was not found at ${candidatePath}.`);
  }
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('Request body must be valid JSON.');
  }
}

async function stageUploadedFile(req) {
  const encodedFileName = String(req.headers['x-file-name'] ?? 'upload.json');
  const encodedFieldName = String(req.headers['x-field-name'] ?? 'upload');
  const fileName = sanitizeFileName(decodeURIComponent(encodedFileName));
  const fieldName = sanitizePathSegment(decodeURIComponent(encodedFieldName));
  const fieldDirectory = path.join(stagingRoot, fieldName);
  await mkdir(fieldDirectory, { recursive: true });

  const targetPath = path.join(fieldDirectory, `${Date.now()}-${randomUUID().slice(0, 8)}-${fileName}`);
  const stream = createWriteStream(targetPath);
  let sizeBytes = 0;

  try {
    for await (const chunk of req) {
      sizeBytes += chunk.length;
      if (sizeBytes > 512 * 1024 * 1024) {
        throw new Error('Staged files must stay under 512 MB.');
      }
      if (!stream.write(chunk)) {
        await new Promise((resolve, reject) => {
          stream.once('drain', resolve);
          stream.once('error', reject);
        });
      }
    }

    await new Promise((resolve, reject) => {
      stream.end(resolve);
      stream.once('error', reject);
    });
  } catch (error) {
    stream.destroy();
    if (await pathExists(targetPath)) {
      await unlink(targetPath).catch(() => {});
    }
    throw error;
  }

  return {
    ok: true,
    fieldName,
    fileName,
    path: targetPath,
    sizeBytes,
    stagedAt: new Date().toISOString(),
  };
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
  });
  res.end(JSON.stringify(payload, null, 2));
}

function sendText(res, statusCode, message) {
  res.writeHead(statusCode, {
    'Cache-Control': 'no-store',
    'Content-Type': 'text/plain; charset=utf-8',
  });
  res.end(message);
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      result[key] = true;
      continue;
    }
    result[key] = next;
    index += 1;
  }
  return result;
}

function sanitizeFileName(value) {
  const safe = String(value || 'upload.json').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').trim();
  return safe || 'upload.json';
}

function sanitizePathSegment(value) {
  const safe = String(value || 'upload').replace(/[^a-z0-9_-]/gi, '-').replace(/-+/g, '-').trim();
  return safe || 'upload';
}

function getModeDefaults(modeId) {
  return trainingCatalog.modes.find((entry) => entry.id === modeId)?.defaults ?? {};
}

function normalizeBuiltinBotId(botId) {
  const candidate = normalizeText(botId, 'greedy');
  return builtinBotDefinitions.some((entry) => entry.id === candidate) ? candidate : 'greedy';
}

function normalizeText(value, fallback = '') {
  const trimmed = String(value ?? '').trim();
  return trimmed || fallback;
}

function normalizeInteger(value, fallback, minimum, maximum) {
  const numeric = Number(value);
  const safe = Number.isFinite(numeric) ? Math.round(numeric) : fallback;
  return Math.max(minimum, Math.min(maximum, safe));
}

function normalizeNumber(value, fallback, minimum, maximum) {
  const numeric = Number(value);
  const safe = Number.isFinite(numeric) ? numeric : fallback;
  return Math.max(minimum, Math.min(maximum, safe));
}

function asPercent(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 'n/a';
  return `${(numeric * 100).toFixed(1)}%`;
}

function writeLogLine(stream, line) {
  stream.write(`${line}\n`);
}

async function appendServerLog(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  await appendFile(serverLogPath, line, 'utf8');
}

async function loadBenchmarkConfig() {
  const raw = await readFile(benchmarkConfigPath, 'utf8');
  return JSON.parse(raw);
}

function normalizePathKey(value) {
  if (!value) return null;
  return path.resolve(String(value)).toLowerCase();
}

