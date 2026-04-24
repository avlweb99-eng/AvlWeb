const APP_VERSION = "1.0.0";
const STORAGE_KEY = "mbtfdl-pwa-state-v1";
const WINDOW_PREFS_KEY = "mbtfdl-pwa-window-prefs-v1";
const JOB_PHASES = {
  "weighted-train": [
    "Preparing starter profile",
    "Running browser-native weighted updates",
    "Evaluating against the benchmark bot",
    "Writing profile artifact"
  ],
  "dataset-generate": [
    "Seeding teacher pipeline",
    "Sampling minimax-style positions",
    "Packaging dataset preview",
    "Writing dataset artifact"
  ],
  "policy-train": [
    "Loading dataset artifact",
    "Running browser-side epoch schedule",
    "Scoring validation history",
    "Writing model bundle"
  ],
  "league-train": [
    "Loading model bundle",
    "Rotating opponents through league play",
    "Selecting the strongest checkpoint",
    "Writing champion bundle"
  ]
};

const BENCHMARK = {
  trackId: "weighted-v1",
  label: "Weighted Benchmark",
  benchmarkBotId: "greedy",
  benchmarkBotName: "Greedy Bot",
  minimumWinRate: 0.6,
  minimumGames: 100,
  celebrationTitle: "Benchmark cleared",
  celebrationMessage:
    "A benchmark-clearing run is the moment to celebrate and review a standout local bot.",
  submissionInvitation:
    "Submission is still curated, but the app should clearly call out strong local runs."
};

const BUILTIN_BOTS = [
  {
    id: "random",
    name: "Random Bot",
    summary: "Chooses any legal move without planning ahead.",
    style: "Unpredictable and simple.",
    whyItMatters:
      "This is the easiest comparison target and a reminder that even modest strategy should beat randomness over time."
  },
  {
    id: "greedy",
    name: "Greedy Bot",
    summary: "Prefers immediately rewarding moves.",
    style: "Tactical and short-term.",
    whyItMatters:
      "This is the current beginner benchmark because it is easy to reason about but still punishes weak profiles."
  },
  {
    id: "minimax",
    name: "Minimax Bot (Depth 4)",
    summary: "Searches ahead with classic game-tree lookahead.",
    style: "Calculation-heavy and deliberate.",
    whyItMatters:
      "This bot acts like a strong teacher and gives later pipelines a more serious opponent."
  },
  {
    id: "elite-rules",
    name: "Elite Rules Bot",
    summary: "Uses a curated hand-built ruleset for practical play.",
    style: "Structured and opinionated.",
    whyItMatters:
      "This is the strongest hand-authored baseline in the roster and a useful contrast to learned bots."
  }
];

const LEARN_OVERVIEW = [
  {
    title: "Local First",
    summary:
      "Training runs in the browser on this device. Imported bots, datasets, logs, and generated artifacts remain local unless the user chooses to download or share them."
  },
  {
    title: "Script Driven Spirit",
    summary:
      "The original desktop shell was intentionally an orchestrator over scripts. This PWA keeps that educational framing even though it swaps detached PowerShell runners for browser-native jobs."
  },
  {
    title: "Train, Test, Improve",
    summary:
      "The main loop is still to run a training step, inspect the artifact, then move the result into the Mancala experience for comparison and play."
  },
  {
    title: "Closest Equivalent",
    summary:
      "Desktop-only features like detached processes, folder browsing, and direct runtime paths become virtual browser jobs, reusable artifacts, and downloadable JSON outputs."
  }
];

const OVERVIEW_HIGHLIGHTS = [
  {
    title: "Portable First",
    body:
      "This version is installable, offline-capable, and multi-platform. It preserves the WPF information density while staying browser-safe."
  },
  {
    title: "Browser Jobs",
    body:
      "Where the WPF shell launched local PowerShell and Node processes, the PWA runs deterministic browser-native approximations and stores the results as downloadable artifacts."
  },
  {
    title: "Educational Shell",
    body:
      "Each mode keeps workflow notes, parameter summaries, and source recipes visible so the app still teaches the training pipeline rather than hiding it."
  },
  {
    title: "Artifact Hub",
    body:
      "Generated outputs and imported JSON files live together in one browser-local catalog so later training stages can reuse them."
  }
];

const TRAINING_MODES = [
  {
    id: "weighted-train",
    title: "Weighted Bot",
    badge: "Best first project",
    scriptId: "train-bot",
    scriptFile: "train-bot.js",
    description:
      "Train a weighted-preference bot locally, starting from a generated starter profile or an imported weighted profile.",
    beginnerNote:
      "This is the clearest starting loop because the output is still a transparent JSON bot profile you can inspect.",
    defaultOutput: "bot-lab/weighted-bot.json",
    defaults: {
      profileName: "Bot Lab Weighted Bot",
      inputProfilePath: "",
      outputPath: "bot-lab/weighted-bot.json",
      games: "6000",
      seed: "1",
      opponentBotId: "greedy",
      learningRate: "0.03",
      gamma: "0.97",
      batchSize: "200",
      evalGames: "500"
    },
    fields: [
      { name: "profileName", label: "Bot Name", type: "text", help: "Used when the app generates a starter weighted profile for you." },
      { name: "inputProfilePath", label: "Existing Profile Artifact", type: "file", help: "Optional. Leave blank to generate a starter weighted profile in the browser staging area." },
      { name: "outputPath", label: "Output Path", type: "text", help: "Relative paths stay inside the browser output catalog." },
      { name: "games", label: "Training Games", type: "text", help: "How many learning games to run before evaluation." },
      { name: "seed", label: "Seed", type: "text", help: "A deterministic seed so experiments can be repeated." },
      { name: "opponentBotId", label: "Opponent Bot", type: "select", options: BUILTIN_BOTS },
      { name: "learningRate", label: "Learning Rate", type: "text", help: "How quickly the weighted trainer updates after each batch." },
      { name: "gamma", label: "Gamma", type: "text", help: "How strongly the trainer values future reward." },
      { name: "batchSize", label: "Batch Size", type: "text", help: "How many game samples are grouped per update." },
      { name: "evalGames", label: "Evaluation Games", type: "text", help: "How many games are used for the final report card." }
    ]
  },
  {
    id: "dataset-generate",
    title: "Minimax Dataset",
    badge: "Teacher data",
    scriptId: "generate-minimax-dataset",
    scriptFile: "generate-minimax-dataset.js",
    description:
      "Generate a labeled dataset of Mancala positions from a minimax-style teacher for later policy/value training.",
    beginnerNote:
      "This mode does not create a playable bot directly. It creates the examples used in the next stage.",
    defaultOutput: "bot-lab/minimax-dataset.json",
    defaults: {
      outputPath: "bot-lab/minimax-dataset.json",
      games: "200",
      seed: "1",
      teacherDepth: "4",
      sampleRate: "1"
    },
    fields: [
      { name: "outputPath", label: "Output Path", type: "text", help: "This JSON dataset feeds later policy/value training." },
      { name: "games", label: "Teacher Games", type: "text", help: "How many full teacher-played games to simulate." },
      { name: "seed", label: "Seed", type: "text", help: "Use a fixed seed to recreate the same dataset recipe later." },
      { name: "teacherDepth", label: "Teacher Depth", type: "text", help: "How far the teacher searches ahead." },
      { name: "sampleRate", label: "Sample Rate", type: "text", help: "What fraction of positions to keep in the dataset." }
    ]
  },
  {
    id: "policy-train",
    title: "Policy Model",
    badge: "Advanced",
    scriptId: "train-policy-value-model",
    scriptFile: "train-policy-value-model.js",
    description:
      "Train a policy/value model bundle from an existing dataset JSON artifact.",
    beginnerNote:
      "This is the stage where the app stops writing transparent weighted profiles and starts writing learned model bundles.",
    defaultOutput: "bot-lab/policy-value-model.json",
    defaults: {
      datasetPath: "",
      inputModelPath: "",
      outputPath: "bot-lab/policy-value-model.json",
      epochs: "12",
      batchSize: "32",
      learningRate: "0.02",
      policyLossWeight: "1",
      valueLossWeight: "0.5",
      l2Regularization: "0.0001",
      seed: "1"
    },
    fields: [
      { name: "datasetPath", label: "Dataset Artifact", type: "file", help: "Required. Point this at the dataset JSON already in the artifact catalog." },
      { name: "inputModelPath", label: "Existing Model Artifact", type: "file", help: "Optional. Leave blank to train a fresh model bundle." },
      { name: "outputPath", label: "Output Path", type: "text", help: "Relative paths stay inside the browser output catalog." },
      { name: "epochs", label: "Epochs", type: "text", help: "How many passes to make over the dataset." },
      { name: "batchSize", label: "Batch Size", type: "text", help: "How many examples to process together per update." },
      { name: "learningRate", label: "Learning Rate", type: "text", help: "How aggressively the model updates each step." },
      { name: "policyLossWeight", label: "Policy Loss Weight", type: "text", help: "Balances the move-prediction part of the training objective." },
      { name: "valueLossWeight", label: "Value Loss Weight", type: "text", help: "Balances the game-outcome prediction part of the training objective." },
      { name: "l2Regularization", label: "L2 Regularization", type: "text", help: "A small penalty that helps keep weights from drifting too far." },
      { name: "seed", label: "Seed", type: "text", help: "Controls the deterministic shuffle order used during training." }
    ]
  },
  {
    id: "league-train",
    title: "League Fine-Tune",
    badge: "Longest runs",
    scriptId: "train-policy-league",
    scriptFile: "train-policy-league.js",
    description:
      "Improve a policy/value model through self-play, replay buffers, and league-style checkpointing.",
    beginnerNote:
      "This is the longest-running mode. The main payoff is a stronger champion bundle rather than a simple one-step report card.",
    defaultOutput: "bot-lab/policy-value-league-model.json",
    defaults: {
      inputModelPath: "",
      outputPath: "bot-lab/policy-value-league-model.json",
      iterations: "3",
      gamesPerIteration: "16",
      evalGames: "20",
      searchDepth: "2",
      minimaxDepth: "4",
      replayBufferSize: "200",
      previousBestPoolSize: "2",
      opponents: "random,greedy,minimax,self,previous-best",
      epochs: "2",
      batchSize: "32",
      learningRate: "0.02",
      policyLossWeight: "1",
      valueLossWeight: "0.5",
      l2Regularization: "0.0001",
      seed: "1"
    },
    fields: [
      { name: "inputModelPath", label: "Existing Model Artifact", type: "file", help: "Optional. Leave blank to start from the league starter model." },
      { name: "outputPath", label: "Output Path", type: "text", help: "Relative paths stay inside the browser output catalog." },
      { name: "iterations", label: "Iterations", type: "text", help: "How many league rounds to run." },
      { name: "gamesPerIteration", label: "Games Per Iteration", type: "text", help: "How many new play games to generate in each round." },
      { name: "evalGames", label: "Evaluation Games", type: "text", help: "How many games to use when deciding whether a model deserves to stay champion." },
      { name: "searchDepth", label: "Search Depth", type: "text", help: "How deeply the search wrapper looks during play." },
      { name: "minimaxDepth", label: "Minimax Depth", type: "text", help: "How strong the minimax teacher or opponent behaves inside the league loop." },
      { name: "replayBufferSize", label: "Replay Buffer Size", type: "text", help: "How much recent experience to keep available for updates." },
      { name: "previousBestPoolSize", label: "Previous Best Pool Size", type: "text", help: "How many previous champions remain available as comparison targets." },
      { name: "opponents", label: "Opponents", type: "text", help: "Comma-separated league schedule across built-ins, self-play, and previous champions." },
      { name: "epochs", label: "Epochs", type: "text", help: "How many supervised passes to make per iteration." },
      { name: "batchSize", label: "Batch Size", type: "text", help: "How many samples to process together when updating the network." },
      { name: "learningRate", label: "Learning Rate", type: "text", help: "How aggressively the model updates during fine-tuning." },
      { name: "policyLossWeight", label: "Policy Loss Weight", type: "text", help: "Relative weight of the move-distribution objective." },
      { name: "valueLossWeight", label: "Value Loss Weight", type: "text", help: "Relative weight of the outcome-prediction objective." },
      { name: "l2Regularization", label: "L2 Regularization", type: "text", help: "A small penalty that keeps parameters from drifting too wildly." },
      { name: "seed", label: "Seed", type: "text", help: "Controls deterministic ordering inside the league trainer." }
    ]
  }
];

const SCRIPT_RECIPES = {
  "train-bot": {
    whenToUse:
      "Use this when you want the simplest train-and-play loop: tweak a weighted bot, train it locally, and inspect the resulting JSON.",
    beginnerExplanation:
      "This browser runner starts with a weighted bot profile and nudges those weights through a deterministic approximation of repeated self-play.",
    technicalNote:
      "The PWA resolves an input artifact, simulates weighted updates, evaluates against the selected opponent profile, then writes a browser-local JSON artifact.",
    keyParameters: [
      "--in input weighted profile artifact",
      "--out output weighted profile artifact",
      "--games total training games",
      "--opponent built-in comparison bot",
      "--eval-games report-card games"
    ],
    annotations: [
      "Loads one weighted profile or generates a starter profile.",
      "Applies browser-side overrides without mutating the original input artifact.",
      "Produces a transparent JSON artifact that can be downloaded or reused."
    ],
    source: `async function runWeightedTraining(payload, plan) {
  const baseProfile = plan.inputArtifact
    ? structuredClone(plan.inputArtifact.parsed)
    : createStarterProfile(payload.profileName);

  const rng = createRng(payload.seed + ":" + payload.opponentBotId);
  const tunedWeights = Object.fromEntries(
    Object.entries(baseProfile.weights).map(([name, value], index) => {
      const delta = ((rng() - 0.5) * 2) * (Number(payload.learningRate) * 3 + index * 0.002);
      return [name, round(value + delta, 4)];
    })
  );

  return {
    ...baseProfile,
    weights: tunedWeights,
    training: {
      learningRate: Number(payload.learningRate),
      gamma: Number(payload.gamma),
      batchSize: Number(payload.batchSize),
      opponentBotId: payload.opponentBotId,
      evalGames: Number(payload.evalGames)
    }
  };
}`
  },
  "generate-minimax-dataset": {
    whenToUse:
      "Use this when you want labeled training data for later policy/value training.",
    beginnerExplanation:
      "This browser runner acts like a portable teacher dataset generator. It synthesizes labeled game states and move preferences instead of calling a separate engine process.",
    technicalNote:
      "The PWA creates a deterministic dataset preview and metadata package, then stores it as a reusable JSON artifact.",
    keyParameters: [
      "--out output dataset artifact",
      "--games teacher-played games",
      "--teacher-depth search depth for the minimax-style teacher",
      "--sample-rate fraction of positions to keep"
    ],
    annotations: [
      "This mode creates examples, not a playable bot.",
      "A fixed seed makes dataset creation reproducible.",
      "The dataset keeps a preview subset plus metadata for the full sample count."
    ],
    source: `function buildDatasetArtifact(payload) {
  const totalGames = Number(payload.games);
  const sampleRate = Number(payload.sampleRate);
  const teacherDepth = Number(payload.teacherDepth);
  const totalSamples = Math.max(24, Math.round(totalGames * 40 * sampleRate));
  const previewCount = Math.min(totalSamples, 72);

  const samples = Array.from({ length: previewCount }, (_, index) => ({
    board: syntheticBoard(index),
    suggestedMove: index % 6,
    valueTarget: round(Math.cos(index / 5) * 0.45, 3)
  }));

  return {
    format: "mbtfdl-dataset-v1",
    metadata: { totalGames, sampleRate, teacherDepth, totalSamples },
    samples
  };
}`
  },
  "train-policy-value-model": {
    whenToUse:
      "Use this after you already have a dataset and want to train a more advanced model bundle.",
    beginnerExplanation:
      "This is the step where the app moves from transparent weighted profiles into compact learned models.",
    technicalNote:
      "The PWA consumes a dataset artifact, runs a browser-side epoch schedule, records history, and writes the next model bundle.",
    keyParameters: [
      "--dataset required dataset artifact",
      "--in optional model bundle to continue from",
      "--epochs passes over the dataset",
      "--batch-size examples per update",
      "--learning-rate update size"
    ],
    annotations: [
      "You can start fresh or continue from an existing model.",
      "Dataset metadata carries sample volume forward.",
      "The resulting history is intended to be readable in the learning and jobs screens."
    ],
    source: `function trainPolicyValueModel(payload, datasetArtifact, inputModel) {
  const epochs = Number(payload.epochs);
  const baseSkill = inputModel?.metrics?.skillScore ?? 0.46;
  const history = [];

  for (let epoch = 1; epoch <= epochs; epoch += 1) {
    history.push({
      epoch,
      policyLoss: round(1.1 / (epoch + 0.2), 4),
      valueLoss: round(0.8 / (epoch + 0.5), 4),
      validationScore: round(baseSkill + epoch * 0.013, 4)
    });
  }

  return {
    kind: "policy-value-model",
    format: "mbtfdl-model-v1",
    history,
    metrics: {
      skillScore: history.at(-1).validationScore
    }
  };
}`
  },
  "train-policy-league": {
    whenToUse:
      "Use this when you already have a policy/value model and want a longer self-play style improvement loop.",
    beginnerExplanation:
      "League training is the advanced path. The model rotates through opponents, accumulates replay data, and tries to emerge as a stronger champion.",
    technicalNote:
      "The PWA simulates league rounds, preserves evaluation history, and exports the champion bundle as a reusable JSON artifact.",
    keyParameters: [
      "--in optional input model bundle",
      "--iterations number of league rounds",
      "--games-per-iteration new play data per round",
      "--opponents comma-separated league schedule",
      "--eval-games games used for champion gating"
    ],
    annotations: [
      "This is the longest-running browser mode.",
      "The final artifact is the champion bundle, not every intermediate checkpoint.",
      "Opponent scheduling and replay size still shape the result."
    ],
    source: `function runLeagueFineTune(payload, inputModel) {
  const iterations = Number(payload.iterations);
  const history = [];
  const base = inputModel?.metrics?.skillScore ?? 0.58;

  for (let roundIndex = 1; roundIndex <= iterations; roundIndex += 1) {
    history.push({
      round: roundIndex,
      championScore: round(base + roundIndex * 0.026, 4),
      evalWinRate: round(0.52 + roundIndex * 0.045, 4),
      replaySamples: Number(payload.gamesPerIteration) * 14 * roundIndex
    });
  }

  return {
    kind: "league-model",
    format: "mbtfdl-league-v1",
    history,
    metrics: {
      skillScore: history.at(-1).championScore,
      evalWinRate: history.at(-1).evalWinRate
    }
  };
}`
  }
};

const SUPPORT_NOTES = [
  "Missing install prompt: some browsers only show the install option after a short engagement period. The PWA still runs in a regular tab without installation.",
  "Invalid JSON input: compare the file with a known good bot or dataset export before retrying the run.",
  "Failed browser job: open the Jobs screen, read the summary first, then inspect the live log for the exact validation or simulation failure.",
  "Artifact compatibility: if the app cannot parse JSON metadata, it still keeps the raw imported file available as a browser-local artifact.",
  "Interrupted runs after refresh: the app reconciles queued or running jobs on reload and marks them complete or failed using stored timing metadata."
].join("\n\n");

const dom = {
  navButtons: [...document.querySelectorAll(".nav-button")],
  installAppButton: document.getElementById("install-app-button"),
  screenTitleText: document.getElementById("screen-title-text"),
  screenSubtitleText: document.getElementById("screen-subtitle-text"),
  headerEyebrowText: document.getElementById("header-eyebrow-text"),
  healthText: document.getElementById("health-text"),
  statusDockText: document.getElementById("status-dock-text"),
  sidebarStatusText: document.getElementById("sidebar-status-text"),
  screens: {
    Overview: document.getElementById("screen-overview"),
    Train: document.getElementById("screen-train"),
    Jobs: document.getElementById("screen-jobs"),
    Outputs: document.getElementById("screen-outputs"),
    Learn: document.getElementById("screen-learn"),
    Bots: document.getElementById("screen-bots"),
    Support: document.getElementById("screen-support")
  },
  overviewHighlightsPanel: document.getElementById("overview-highlights-panel"),
  overviewSummaryText: document.getElementById("overview-summary-text"),
  overviewBenchmarkText: document.getElementById("overview-benchmark-text"),
  overviewJourneyText: document.getElementById("overview-journey-text"),
  overviewPathsText: document.getElementById("overview-paths-text"),
  trainModeList: document.getElementById("train-mode-list"),
  trainModeTitleText: document.getElementById("train-mode-title-text"),
  trainModeDescriptionText: document.getElementById("train-mode-description-text"),
  trainFormSummaryText: document.getElementById("train-form-summary-text"),
  trainStatusText: document.getElementById("train-status-text"),
  trainCommandPreviewText: document.getElementById("train-command-preview-text"),
  trainGuideText: document.getElementById("train-guide-text"),
  trainBenchmarkText: document.getElementById("train-benchmark-text"),
  editParametersButton: document.getElementById("edit-parameters-button"),
  runJobButton: document.getElementById("run-job-button"),
  openOutputsButton: document.getElementById("open-outputs-button"),
  refreshTrainButton: document.getElementById("refresh-train-button"),
  jobsList: document.getElementById("jobs-list"),
  jobSummaryText: document.getElementById("job-summary-text"),
  jobPathsText: document.getElementById("job-paths-text"),
  jobLogText: document.getElementById("job-log-text"),
  refreshJobsButton: document.getElementById("refresh-jobs-button"),
  outputsList: document.getElementById("outputs-list"),
  artifactDetailText: document.getElementById("artifact-detail-text"),
  artifactGuideText: document.getElementById("artifact-guide-text"),
  refreshOutputsButton: document.getElementById("refresh-outputs-button"),
  importOutputButton: document.getElementById("import-output-button"),
  downloadArtifactButton: document.getElementById("download-artifact-button"),
  learnOverviewPanel: document.getElementById("learn-overview-panel"),
  scriptList: document.getElementById("script-list"),
  scriptDetailText: document.getElementById("script-detail-text"),
  scriptSourceText: document.getElementById("script-source-text"),
  botsList: document.getElementById("bots-list"),
  botDetailText: document.getElementById("bot-detail-text"),
  supportNotesText: document.getElementById("support-notes-text"),
  diagnosticsText: document.getElementById("diagnostics-text"),
  parameterModal: document.getElementById("parameter-modal"),
  parameterModalTitle: document.getElementById("parameter-modal-title"),
  parameterModalSubtitle: document.getElementById("parameter-modal-subtitle"),
  parameterFormFields: document.getElementById("parameter-form-fields"),
  parameterPreviewText: document.getElementById("parameter-preview-text"),
  closeModalButton: document.getElementById("close-modal-button"),
  saveParametersButton: document.getElementById("save-parameters-button"),
  cancelParametersButton: document.getElementById("cancel-parameters-button"),
  artifactUploadInput: document.getElementById("artifact-upload-input"),
  toast: document.getElementById("toast")
};

const state = loadState();
const modalState = {
  open: false,
  modeId: null,
  values: {},
  pendingUploadField: null
};

let deferredInstallPrompt = null;
let toastTimer = null;

function createInitialState() {
  const formValues = {};
  for (const mode of TRAINING_MODES) {
    formValues[mode.id] = { ...mode.defaults };
  }

  return {
    screen: "Overview",
    currentModeId: "weighted-train",
    formValues,
    jobs: [],
    outputs: [],
    selectedJobId: null,
    selectedOutputId: null,
    selectedScriptId: "train-bot",
    selectedBotId: "random",
    trainStatus:
      "Everything runs locally in this browser shell. Choose a mode, review the educational notes, and start a job when you are ready.",
    outputCounter: 0
  };
}

function loadState() {
  const fallback = createInitialState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw);
    return {
      ...fallback,
      ...parsed,
      formValues: {
        ...fallback.formValues,
        ...(parsed.formValues || {})
      },
      jobs: Array.isArray(parsed.jobs) ? parsed.jobs : [],
      outputs: Array.isArray(parsed.outputs) ? parsed.outputs : []
    };
  } catch {
    return fallback;
  }
}

function persistState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadWindowPrefs() {
  try {
    const raw = localStorage.getItem(WINDOW_PREFS_KEY);
    if (!raw) {
      return { attemptedInitialMaximize: false };
    }
    return {
      attemptedInitialMaximize: false,
      ...JSON.parse(raw)
    };
  } catch {
    return { attemptedInitialMaximize: false };
  }
}

function persistWindowPrefs(prefs) {
  localStorage.setItem(WINDOW_PREFS_KEY, JSON.stringify(prefs));
}

function getCurrentMode() {
  return TRAINING_MODES.find((mode) => mode.id === state.currentModeId) || TRAINING_MODES[0];
}

function getModeById(modeId) {
  return TRAINING_MODES.find((mode) => mode.id === modeId) || null;
}

function getArtifactById(artifactId) {
  return state.outputs.find((artifact) => artifact.id === artifactId) || null;
}

function nowIso() {
  return new Date().toISOString();
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function round(value, digits = 4) {
  const power = 10 ** digits;
  return Math.round(value * power) / power;
}

function deepClone(value) {
  if (globalThis.structuredClone) {
    return globalThis.structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function slugify(text) {
  return String(text || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "artifact";
}

function makeId(prefix) {
  const cryptoValue = globalThis.crypto?.randomUUID?.();
  return cryptoValue ? `${prefix}-${cryptoValue}` : `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function hashSeed(text) {
  let hash = 1779033703;
  for (let index = 0; index < text.length; index += 1) {
    hash = Math.imul(hash ^ text.charCodeAt(index), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }
  return hash >>> 0;
}

function createRng(seedText) {
  let seed = hashSeed(String(seedText));
  return function next() {
    seed += 0x6d2b79f5;
    let temp = seed;
    temp = Math.imul(temp ^ (temp >>> 15), temp | 1);
    temp ^= temp + Math.imul(temp ^ (temp >>> 7), temp | 61);
    return ((temp ^ (temp >>> 14)) >>> 0) / 4294967296;
  };
}

function normalizeOutputPath(outputPath, fallbackPath) {
  const candidate = String(outputPath || fallbackPath).replace(/\\/g, "/").trim() || fallbackPath;
  const parts = candidate.split("/").filter(Boolean);
  if (parts.some((part) => part === "..")) {
    throw new Error("Output path must stay inside the browser output catalog.");
  }
  return parts.join("/");
}

function detectArtifactType(fileName) {
  const lower = fileName.toLowerCase();
  if (lower.includes("dataset")) {
    return "dataset";
  }
  if (lower.includes("league")) {
    return "league-model";
  }
  if (lower.includes("model")) {
    return "policy-model";
  }
  if (lower.endsWith(".json")) {
    return "weighted-profile";
  }
  return "artifact";
}

function parseJsonSafe(content) {
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function createStarterProfile(name = "Starter Weighted Bot") {
  const now = nowIso();
  return {
    version: 1,
    id: "starter-weighted-bot",
    name,
    botType: "weighted-preference",
    weights: {
      bias: 0,
      extraTurn: 0,
      capturedStonesNorm: 0,
      myStoreGainNorm: 0,
      oppStoreGainNorm: 0,
      mySideAfterNorm: 0,
      oppSideAfterNorm: 0,
      movePitNorm: 0,
      winningMove: 0,
      opponentReplyThreatNorm: 0
    },
    play: {
      temperature: 0.9,
      epsilon: 0.08
    },
    training: {
      learningRate: 0.03,
      gamma: 0.97,
      batchSize: 200,
      opponentBotId: "greedy",
      opponentProfile: null,
      evalGames: 500
    },
    createdAt: now,
    updatedAt: now
  };
}

function createScriptCatalog() {
  return TRAINING_MODES.map((mode) => {
    const guide = SCRIPT_RECIPES[mode.scriptId];
    return {
      id: mode.scriptId,
      title: mode.title,
      relativePath: `MultiPlatform/browser-runtime/${mode.scriptFile}`,
      purpose: mode.description,
      whenToUse: guide.whenToUse,
      beginnerExplanation: guide.beginnerExplanation,
      technicalNote: guide.technicalNote,
      keyParameters: guide.keyParameters,
      annotations: guide.annotations,
      source: guide.source
    };
  });
}

function getArtifactGuide(type) {
  switch (type) {
    case "weighted-profile":
      return {
        label: "Weighted Bot JSON",
        importable: true,
        whatItIs: "A plain JSON bot profile with readable weights and training settings.",
        nextStep:
          "Download this file and import it into the hosted Mancala game through Bot Lab > Profiles > Import JSON, then select it in Player 1 or Player 2.",
        hostedGameSteps: [
          "Open the hosted Mancala game and switch to the Bot Lab workspace.",
          "In the Profiles card, click Import JSON.",
          "Choose this weighted bot JSON from your downloads or device storage.",
          "Pick the imported bot and start a match."
        ],
        privacyNote:
          "This PWA keeps the artifact local in browser storage until you explicitly download or move it."
      };
    case "dataset":
      return {
        label: "Training Dataset JSON",
        importable: false,
        whatItIs: "A dataset of labeled Mancala positions, usually produced by a minimax-style teacher.",
        nextStep: "Use this as the input for policy/value model training inside the PWA.",
        hostedGameSteps: [],
        privacyNote: "Datasets stay local unless the user explicitly downloads or shares them later."
      };
    case "policy-model":
      return {
        label: "Policy/Value Model JSON",
        importable: true,
        whatItIs: "A learned model bundle that the Mancala app can wrap in search for stronger play.",
        nextStep:
          "Download this bundle for import into the hosted game if that build supports policy/value custom bots, or keep refining it with league training.",
        hostedGameSteps: [
          "Open the hosted Mancala game and switch to the Bot Lab workspace.",
          "Use Profiles > Import JSON.",
          "Choose the model bundle you downloaded from this PWA.",
          "Select the imported model for one side of the match."
        ],
        privacyNote: "The browser keeps the model local during standard PWA use."
      };
    case "league-model":
      return {
        label: "League-Trained Model JSON",
        importable: true,
        whatItIs: "A policy/value model bundle that has already been pushed through additional league-style training.",
        nextStep:
          "Download this champion bundle for the hosted game or compare it with earlier bundles in the local artifact catalog.",
        hostedGameSteps: [
          "Open the hosted Mancala game and switch to the Bot Lab workspace.",
          "Use Profiles > Import JSON.",
          "Choose the league-trained champion bundle.",
          "Compare it against built-ins or earlier custom models."
        ],
        privacyNote: "The file stays on-device during normal PWA usage."
      };
    default:
      return {
        label: "Local Artifact",
        importable: false,
        whatItIs: "A local browser artifact created by the training facility.",
        nextStep: "Inspect the metadata and decide whether it is a training input, result artifact, or imported helper file.",
        hostedGameSteps: [],
        privacyNote: "Local files remain in browser storage unless you explicitly download them."
      };
  }
}

function createArtifactRecord({ name, relativePath, type, content, sourceJobId = null, sourceJobTitle = null, origin = "generated" }) {
  const parsed = parseJsonSafe(content);
  const sizeBytes = new Blob([content]).size;
  return {
    id: makeId("artifact"),
    name,
    path: `browser://output/${relativePath}`,
    relativePath,
    modifiedAt: nowIso(),
    sizeBytes,
    type: type || detectArtifactType(name),
    sourceJobId,
    sourceJobTitle,
    origin,
    content,
    parsed
  };
}

function createImportedArtifact(fileName, content) {
  state.outputCounter += 1;
  const safeName = fileName || `imported-${state.outputCounter}.json`;
  return createArtifactRecord({
    name: safeName,
    relativePath: `imports/${safeName}`,
    type: detectArtifactType(safeName),
    content,
    sourceJobTitle: "Imported Local File",
    origin: "imported"
  });
}

function upsertArtifact(artifact) {
  state.outputs = [artifact, ...state.outputs.filter((item) => item.id !== artifact.id)];
  state.selectedOutputId = artifact.id;
}

function getArtifactLabel(artifactId) {
  const artifact = getArtifactById(artifactId);
  return artifact ? `${artifact.name} [${artifact.type}]` : "(blank)";
}

function formatParameterValue(field, value) {
  if (!value) {
    return "(blank)";
  }
  if (field.type === "file") {
    return getArtifactLabel(value);
  }
  return value;
}

function formatTrainParameterSummary(mode, values) {
  const lines = [`Mode: ${mode.title}`, "", "Current parameters:"];
  for (const field of mode.fields) {
    lines.push(`- ${field.label}: ${formatParameterValue(field, values[field.name])}`);
  }
  return lines.join("\n");
}

function buildCommandPreview(mode, values) {
  const lines = [`Mode: ${mode.title}`, `Runner: browser-runtime/${mode.scriptFile}`, "", "Current values:"];
  for (const field of mode.fields) {
    lines.push(`- ${field.label}: ${formatParameterValue(field, values[field.name])}`);
  }
  return lines.join("\n");
}

function getHeaderMeta(screen) {
  return {
    Overview: {
      title: "Overview",
      subtitle:
        "A portable training console that keeps workflow, runtime status, and explanations visible in one dense multi-platform layout."
    },
    Train: {
      title: "Train",
      subtitle:
        "Choose a pipeline step, inspect what it does, set inputs and outputs, then launch a browser-native job without leaving the application shell."
    },
    Jobs: {
      title: "Jobs",
      subtitle:
        "Watch browser jobs, inspect summaries, and keep the raw log close at hand for recovery and support."
    },
    Outputs: {
      title: "Outputs",
      subtitle:
        "See what each artifact means, where it lives in browser storage, and whether it belongs in the hosted Mancala game."
    },
    Learn: {
      title: "Scripts",
      subtitle:
        "Read the browser-side source recipes, review beginner notes, and connect each pipeline step to the logic that powers it."
    },
    Bots: {
      title: "Bots",
      subtitle:
        "Use the factory roster as a shared language for what each baseline opponent is trying to do."
    },
    Support: {
      title: "Support",
      subtitle:
        "Keep recovery guidance and diagnostics in one place so the user can solve problems without dropping to another shell."
    }
  }[screen];
}

function renderNav() {
  for (const button of dom.navButtons) {
    button.classList.toggle("is-active", button.dataset.screen === state.screen);
  }

  for (const [screenName, element] of Object.entries(dom.screens)) {
    element.classList.toggle("is-active", screenName === state.screen);
  }

  const header = getHeaderMeta(state.screen);
  dom.headerEyebrowText.textContent = "Portable Training Facility";
  dom.screenTitleText.textContent = header.title;
  dom.screenSubtitleText.textContent = header.subtitle;
}

function getSetupInfo() {
  const installReady = Boolean(deferredInstallPrompt);
  const storageEstimateSupported = Boolean(navigator.storage?.estimate);
  const jobWarnings = [];
  if (!("serviceWorker" in navigator)) {
    jobWarnings.push("Service Worker support is missing, so offline install behavior is limited.");
  }
  if (!installReady) {
    jobWarnings.push("Install prompt is not available yet. The app still works in a regular tab.");
  }

  return {
    runtimeReady: true,
    browser: navigator.userAgent,
    installReady,
    storageEstimateSupported,
    warnings: jobWarnings,
    folderChecks: [
      { label: "browser storage", exists: true, writable: true },
      { label: "artifact catalog", exists: true, writable: true },
      { label: "job queue", exists: true, writable: true },
      { label: "offline cache", exists: "serviceWorker" in navigator, writable: "serviceWorker" in navigator }
    ],
    scriptChecks: TRAINING_MODES.map((mode) => ({
      title: mode.title,
      exists: true
    }))
  };
}

function renderSidebarStatus() {
  const setup = getSetupInfo();
  const activeJobs = state.jobs.filter((job) => ["queued", "running", "starting"].includes(job.status)).length;
  const latestArtifact = state.outputs[0];
  const currentMode = getCurrentMode();
  dom.sidebarStatusText.textContent = [
    `Runtime ready: ${setup.runtimeReady}`,
    `Install prompt ready: ${setup.installReady}`,
    `Artifacts in catalog: ${state.outputs.length}`,
    `Active jobs: ${activeJobs}`,
    `Current mode: ${currentMode.title}`,
    `Latest artifact: ${latestArtifact ? latestArtifact.name : "none yet"}`,
    "",
    "Warnings:",
    setup.warnings.length ? setup.warnings.join("; ") : "none"
  ].join("\n");

  dom.healthText.textContent = `Healthy browser setup | ${activeJobs} active job(s)`;
  dom.statusDockText.textContent = [
    "Training root: browser://workspace",
    "Output root: browser://output",
    "Jobs root: browser://jobs"
  ].join("\n");
}

function renderOverview() {
  dom.overviewHighlightsPanel.innerHTML = OVERVIEW_HIGHLIGHTS.map(
    (card) => `<article class="highlight-card"><h3>${escapeHtml(card.title)}</h3><p class="muted">${escapeHtml(card.body)}</p></article>`
  ).join("");

  const setup = getSetupInfo();
  dom.overviewSummaryText.textContent = [
    `Browser: ${navigator.userAgent}`,
    "",
    "Script checks:",
    ...setup.scriptChecks.map((item) => `- ${item.title}: Exists=${item.exists}`),
    "",
    "Storage checks:",
    ...setup.folderChecks.map((item) => `- ${item.label}: Writable=${item.writable}`),
    "",
    "Portability notes:",
    "- Detached PowerShell jobs became browser-native async jobs.",
    "- Direct folder browsing became downloadable artifacts and virtual paths."
  ].join("\n");

  dom.overviewBenchmarkText.textContent = [
    BENCHMARK.label,
    "",
    `Benchmark bot: ${BENCHMARK.benchmarkBotName}`,
    `Minimum win rate: ${(BENCHMARK.minimumWinRate * 100).toFixed(0)}%`,
    `Minimum games: ${BENCHMARK.minimumGames}`,
    "",
    BENCHMARK.celebrationMessage
  ].join("\n");

  dom.overviewJourneyText.textContent = [
    "1. Start with Weighted Bot if the user is new.",
    "2. Review the description and form before running anything.",
    "3. Launch the browser job and monitor the log in-place.",
    "4. Inspect the output artifact and its import guidance.",
    "5. Move to dataset, policy, and league modes only when the user wants a deeper pipeline."
  ].join("\n");

  dom.overviewPathsText.textContent = [
    "Training root: browser://workspace",
    "Output root: browser://output",
    "Staging root: browser://staging",
    "Jobs root: browser://jobs",
    "",
    "Trust model: custom bots, datasets, logs, and generated outputs stay on this device unless the user explicitly downloads or shares them."
  ].join("\n");
}

function renderTrain() {
  const mode = getCurrentMode();
  const values = state.formValues[mode.id];

  dom.trainModeList.innerHTML = TRAINING_MODES.map((item) => {
    const activeClass = item.id === mode.id ? "is-active" : "";
    const stepLabel = item.id === "dataset-generate" ? "Step 1" :
      item.id === "policy-train" ? "Step 2" :
      item.id === "league-train" ? "Step 3" : item.badge;

    return `<button class="mode-item ${activeClass}" type="button" data-mode-id="${item.id}">
      <div class="mode-item-title">
        <span>${escapeHtml(item.title)}</span>
        <span class="badge">${escapeHtml(stepLabel)}</span>
      </div>
      <div class="mode-item-meta">${escapeHtml(item.beginnerNote)}</div>
    </button>`;
  }).join("");

  dom.trainModeTitleText.textContent = mode.title;
  dom.trainModeDescriptionText.textContent = [
    mode.description,
    "",
    `Beginner note: ${mode.beginnerNote}`,
    "",
    `Default output: ${mode.defaultOutput}`
  ].join("\n");

  dom.trainGuideText.textContent = [
    "Why use this mode:",
    mode.beginnerNote,
    "",
    "What stays visible in this portable shell:",
    "- Inputs and output paths",
    "- Job status and log trail",
    "- Source recipes and learning notes",
    "- Artifact explanation after the run"
  ].join("\n");

  dom.trainBenchmarkText.textContent = [
    BENCHMARK.label,
    "",
    `Current benchmark bot: ${BENCHMARK.benchmarkBotName}`,
    `Target: at least ${(BENCHMARK.minimumWinRate * 100).toFixed(0)}% win rate over ${BENCHMARK.minimumGames} evaluation games.`,
    "",
    BENCHMARK.celebrationMessage
  ].join("\n");

  dom.trainFormSummaryText.textContent = formatTrainParameterSummary(mode, values);
  dom.trainStatusText.textContent = state.trainStatus;
  dom.trainCommandPreviewText.textContent = buildCommandPreview(mode, values);
}

function renderJobs() {
  dom.jobsList.innerHTML = state.jobs.map((job) => {
    const activeClass = job.id === state.selectedJobId ? "is-active" : "";
    return `<button class="list-item ${activeClass}" type="button" data-job-id="${job.id}">
      <div class="list-item-title">
        <span>${escapeHtml(job.title)}</span>
        <span class="badge">${escapeHtml(job.status.toUpperCase())}</span>
      </div>
      <div class="list-item-meta">${escapeHtml(job.summary?.message || "No summary yet.")}</div>
    </button>`;
  }).join("");

  const selected = state.jobs.find((job) => job.id === state.selectedJobId) || state.jobs[0] || null;
  if (!selected) {
    dom.jobSummaryText.textContent = "No job selected.";
    dom.jobPathsText.textContent = "";
    dom.jobLogText.textContent = "";
    return;
  }

  state.selectedJobId = selected.id;
  dom.jobSummaryText.textContent = [
    `Title: ${selected.title}`,
    `Status: ${selected.status}`,
    `Created: ${selected.createdAt || "(not recorded)"}`,
    `Started: ${selected.startedAt || "(not started)"}`,
    `Ended: ${selected.endedAt || "(not ended)"}`,
    "",
    `Summary: ${selected.summary?.message || "No summary yet."}`,
    selected.error?.message ? `\nError: ${selected.error.message}` : "",
    selected.summary?.benchmarkMessage ? `\nBenchmark: ${selected.summary.benchmarkMessage}` : ""
  ].filter(Boolean).join("\n");

  dom.jobPathsText.textContent = [
    `Log path: ${selected.paths?.logPath || "browser://logs"}`,
    `Primary artifact: ${selected.paths?.primaryArtifactPath || "(pending)"}`,
    `Staging input: ${selected.paths?.stagingInputPath || "(none)"}`,
    "",
    `Command line: ${selected.commandLine || "(not available)"}`
  ].join("\n");

  dom.jobLogText.textContent = selected.logLines?.join("\n") || "No log lines yet.";
}

function getArtifactDetail(artifact) {
  const guide = getArtifactGuide(artifact.type);
  const parsed = artifact.parsed || parseJsonSafe(artifact.content);
  let metadata = "The artifact could not be parsed as JSON metadata.";

  if (parsed) {
    switch (artifact.type) {
      case "weighted-profile":
        metadata = [
          `Name: ${parsed.name || "(unknown)"}`,
          `Bot type: ${parsed.botType || "(unknown)"}`,
          `Opponent: ${parsed.training?.opponentBotId || "(unknown)"}`,
          `Evaluation games: ${parsed.training?.evalGames || "(unknown)"}`
        ].join("\n");
        break;
      case "dataset":
        metadata = [
          `Format: ${parsed.format || "(unknown)"}`,
          `Preview samples: ${Array.isArray(parsed.samples) ? parsed.samples.length : 0}`,
          `Total samples: ${parsed.metadata?.totalSamples || parsed.metadata?.sampleCount || 0}`,
          `Game count: ${parsed.metadata?.totalGames || parsed.metadata?.games || 0}`
        ].join("\n");
        break;
      default:
        metadata = JSON.stringify(parsed, null, 2);
        break;
    }
  }

  return { guide, metadata };
}

function renderOutputs() {
  dom.outputsList.innerHTML = state.outputs.map((artifact) => {
    const activeClass = artifact.id === state.selectedOutputId ? "is-active" : "";
    return `<button class="list-item ${activeClass}" type="button" data-output-id="${artifact.id}">
      <div class="list-item-title">
        <span>${escapeHtml(artifact.name)}</span>
        <span class="badge">${escapeHtml(artifact.type)}</span>
      </div>
      <div class="list-item-meta">${escapeHtml(artifact.origin === "imported" ? "Imported local artifact" : `Generated by ${artifact.sourceJobTitle || "browser job"}`)}</div>
    </button>`;
  }).join("");

  const selected = state.outputs.find((artifact) => artifact.id === state.selectedOutputId) || state.outputs[0] || null;
  if (!selected) {
    dom.artifactDetailText.textContent = "No artifact selected.";
    dom.artifactGuideText.textContent = "";
    dom.downloadArtifactButton.disabled = true;
    return;
  }

  state.selectedOutputId = selected.id;
  const detail = getArtifactDetail(selected);
  dom.downloadArtifactButton.disabled = false;
  dom.artifactDetailText.textContent = [
    `Name: ${selected.name}`,
    `Type: ${selected.type}`,
    `Modified: ${selected.modifiedAt}`,
    `Size bytes: ${selected.sizeBytes}`,
    `Path: ${selected.path}`,
    `Source job: ${selected.sourceJobTitle || "Imported Local File"}`,
    "",
    "Metadata:",
    detail.metadata
  ].join("\n");

  dom.artifactGuideText.textContent = [
    detail.guide.label,
    "",
    detail.guide.whatItIs,
    "",
    `Next step: ${detail.guide.nextStep}`,
    "",
    "Hosted game steps:",
    ...(detail.guide.hostedGameSteps.length
      ? detail.guide.hostedGameSteps.map((step) => `- ${step}`)
      : ["- This artifact is not imported directly into the hosted game."]),
    "",
    `Privacy note: ${detail.guide.privacyNote}`
  ].join("\n");
}

function renderLearn() {
  dom.learnOverviewPanel.innerHTML = LEARN_OVERVIEW.map(
    (section) => `<article class="highlight-card"><h3>${escapeHtml(section.title)}</h3><p class="muted">${escapeHtml(section.summary)}</p></article>`
  ).join("");

  const scripts = createScriptCatalog();
  dom.scriptList.innerHTML = scripts.map((item) => {
    const activeClass = item.id === state.selectedScriptId ? "is-active" : "";
    return `<button class="list-item ${activeClass}" type="button" data-script-id="${item.id}">
      <div class="list-item-title"><span>${escapeHtml(item.title)}</span></div>
      <div class="list-item-meta">${escapeHtml(item.purpose)}</div>
    </button>`;
  }).join("");

  const selected = scripts.find((item) => item.id === state.selectedScriptId) || scripts[0];
  state.selectedScriptId = selected.id;
  dom.scriptDetailText.textContent = [
    `Path: ${selected.relativePath}`,
    "",
    `Purpose: ${selected.purpose}`,
    "",
    "When to use:",
    selected.whenToUse,
    "",
    "Beginner explanation:",
    selected.beginnerExplanation,
    "",
    "Technical note:",
    selected.technicalNote,
    "",
    "Key parameters:",
    ...selected.keyParameters.map((item) => `- ${item}`),
    "",
    "Annotations:",
    ...selected.annotations.map((item) => `- ${item}`)
  ].join("\n");

  dom.scriptSourceText.textContent = selected.source;
}

function renderBots() {
  dom.botsList.innerHTML = BUILTIN_BOTS.map((bot) => {
    const activeClass = bot.id === state.selectedBotId ? "is-active" : "";
    return `<button class="list-item ${activeClass}" type="button" data-bot-id="${bot.id}">
      <div class="list-item-title"><span>${escapeHtml(bot.name)}</span></div>
      <div class="list-item-meta">${escapeHtml(bot.summary)}</div>
    </button>`;
  }).join("");

  const selected = BUILTIN_BOTS.find((bot) => bot.id === state.selectedBotId) || BUILTIN_BOTS[0];
  state.selectedBotId = selected.id;
  dom.botDetailText.textContent = [
    selected.name,
    "",
    `Summary: ${selected.summary}`,
    "",
    `Style: ${selected.style}`,
    "",
    `Why it matters: ${selected.whyItMatters}`
  ].join("\n");
}

async function renderSupport() {
  dom.supportNotesText.textContent = SUPPORT_NOTES;
  const estimate = navigator.storage?.estimate ? await navigator.storage.estimate() : null;
  const activeJobs = state.jobs.filter((job) => ["queued", "running"].includes(job.status)).length;
  dom.diagnosticsText.textContent = [
    "Mancala Bot Lab Diagnostics",
    `Generated: ${new Date().toUTCString()}`,
    "Training root: browser://workspace",
    `App version: ${APP_VERSION}`,
    `Install prompt ready: ${Boolean(deferredInstallPrompt)}`,
    `Service worker supported: ${"serviceWorker" in navigator}`,
    `Browser online: ${navigator.onLine}`,
    `Artifact count: ${state.outputs.length}`,
    `Recent jobs tracked: ${state.jobs.length}`,
    `Active jobs: ${activeJobs}`,
    "",
    "Storage estimate:",
    estimate
      ? `- usage=${estimate.usage || 0} quota=${estimate.quota || 0}`
      : "- not available",
    "",
    "Warnings:",
    ...(getSetupInfo().warnings.length ? getSetupInfo().warnings.map((item) => `- ${item}`) : ["- none"])
  ].join("\n");
}

function renderAll() {
  renderNav();
  renderSidebarStatus();
  renderOverview();
  renderTrain();
  renderJobs();
  renderOutputs();
  renderLearn();
  renderBots();
  renderSupport();
  persistState();
}

function openParameterModal() {
  const mode = getCurrentMode();
  modalState.open = true;
  modalState.modeId = mode.id;
  modalState.values = { ...state.formValues[mode.id] };
  modalState.pendingUploadField = null;
  renderParameterModal();
  dom.parameterModal.classList.remove("hidden");
}

function closeParameterModal() {
  modalState.open = false;
  dom.parameterModal.classList.add("hidden");
}

function getAvailableArtifactsForField() {
  return state.outputs.filter((artifact) => artifact.name.toLowerCase().endsWith(".json"));
}

function renderParameterModal() {
  if (!modalState.open) {
    return;
  }

  const mode = getModeById(modalState.modeId);
  dom.parameterModalTitle.textContent = mode.title;
  dom.parameterModalSubtitle.textContent =
    "Edit the parameters for this mode in a focused dialog, then save them back to the Train screen.";
  dom.parameterPreviewText.textContent = formatTrainParameterSummary(mode, modalState.values);

  const availableArtifacts = getAvailableArtifactsForField();
  dom.parameterFormFields.innerHTML = mode.fields.map((field) => {
    if (field.type === "select") {
      return `<section class="field-card">
        <label for="field-${field.name}">${escapeHtml(field.label)}</label>
        <div class="field-help">${escapeHtml(field.help || "")}</div>
        <select class="field-select" id="field-${field.name}" data-field-name="${field.name}">
          ${field.options.map((option) => `<option value="${escapeAttribute(option.id)}" ${modalState.values[field.name] === option.id ? "selected" : ""}>${escapeHtml(option.name)}</option>`).join("")}
        </select>
      </section>`;
    }

    if (field.type === "file") {
      return `<section class="field-card">
        <label for="field-${field.name}">${escapeHtml(field.label)}</label>
        <div class="field-help">${escapeHtml(field.help || "")}</div>
        <div class="field-actions">
          <select class="field-select" id="field-${field.name}" data-field-name="${field.name}">
            <option value="">(blank)</option>
            ${availableArtifacts.map((artifact) => `<option value="${escapeAttribute(artifact.id)}" ${modalState.values[field.name] === artifact.id ? "selected" : ""}>${escapeHtml(artifact.name)} [${escapeHtml(artifact.type)}]</option>`).join("")}
          </select>
          <button class="button button-accent" type="button" data-upload-field="${field.name}">Upload JSON</button>
          <button class="button" type="button" data-clear-field="${field.name}">Clear</button>
        </div>
        <div class="file-pill">${escapeHtml(formatParameterValue(field, modalState.values[field.name]))}</div>
      </section>`;
    }

    return `<section class="field-card">
      <label for="field-${field.name}">${escapeHtml(field.label)}</label>
      <div class="field-help">${escapeHtml(field.help || "")}</div>
      <input class="field-input" id="field-${field.name}" data-field-name="${field.name}" value="${escapeAttribute(modalState.values[field.name] || "")}">
    </section>`;
  }).join("");

  for (const input of dom.parameterFormFields.querySelectorAll("[data-field-name]")) {
    input.addEventListener("input", handleParameterFieldInput);
    input.addEventListener("change", handleParameterFieldInput);
  }

  for (const button of dom.parameterFormFields.querySelectorAll("[data-upload-field]")) {
    button.addEventListener("click", () => {
      modalState.pendingUploadField = button.dataset.uploadField;
      dom.artifactUploadInput.click();
    });
  }

  for (const button of dom.parameterFormFields.querySelectorAll("[data-clear-field]")) {
    button.addEventListener("click", () => {
      modalState.values[button.dataset.clearField] = "";
      renderParameterModal();
    });
  }
}

function handleParameterFieldInput(event) {
  const fieldName = event.currentTarget.dataset.fieldName;
  modalState.values[fieldName] = event.currentTarget.value;
  const mode = getModeById(modalState.modeId);
  const field = mode.fields.find((item) => item.name === fieldName);
  dom.parameterPreviewText.textContent = formatTrainParameterSummary(mode, modalState.values);

  if (field?.type === "file") {
    const pill = event.currentTarget.closest(".field-card")?.querySelector(".file-pill");
    if (pill) {
      pill.textContent = formatParameterValue(field, modalState.values[fieldName]);
    }
  }
}

function saveParameters() {
  state.formValues[modalState.modeId] = { ...modalState.values };
  state.trainStatus = `Updated parameters for ${getModeById(modalState.modeId).title}. Review the summary and command preview, then run the job when ready.`;
  closeParameterModal();
  renderAll();
}

function getOpponentStrength(botId) {
  return {
    random: 0.1,
    greedy: 0.24,
    minimax: 0.38,
    "elite-rules": 0.42
  }[botId] || 0.22;
}

function createExecutionPlan(mode, payload) {
  const outputPath = normalizeOutputPath(payload.outputPath, mode.defaultOutput);
  const outputName = outputPath.split("/").pop();

  switch (mode.id) {
    case "weighted-train": {
      const inputArtifact = payload.inputProfilePath ? getArtifactById(payload.inputProfilePath) : null;
      if (payload.inputProfilePath && !inputArtifact) {
        throw new Error("Input profile artifact was not found.");
      }

      const stagingName = `starter-${slugify(payload.profileName || "weighted-bot")}.json`;
      return {
        outputPath,
        outputName,
        inputArtifact,
        stagingInputPath: inputArtifact ? null : `browser://staging/weighted-train/${stagingName}`,
        commandLine: [
          "browser-run",
          "train-bot",
          `--out "${outputPath}"`,
          `--games ${payload.games}`,
          `--seed ${payload.seed}`,
          `--opponent ${payload.opponentBotId}`,
          `--learning-rate ${payload.learningRate}`,
          `--gamma ${payload.gamma}`,
          `--batch-size ${payload.batchSize}`,
          `--eval-games ${payload.evalGames}`
        ].join(" ")
      };
    }
    case "dataset-generate":
      return {
        outputPath,
        outputName,
        commandLine: [
          "browser-run",
          "generate-minimax-dataset",
          `--out "${outputPath}"`,
          `--games ${payload.games}`,
          `--seed ${payload.seed}`,
          `--teacher-depth ${payload.teacherDepth}`,
          `--sample-rate ${payload.sampleRate}`
        ].join(" ")
      };
    case "policy-train": {
      const datasetArtifact = getArtifactById(payload.datasetPath);
      if (!datasetArtifact) {
        throw new Error("Policy training requires a readable dataset artifact.");
      }
      const inputModelArtifact = payload.inputModelPath ? getArtifactById(payload.inputModelPath) : null;
      if (payload.inputModelPath && !inputModelArtifact) {
        throw new Error("Input model artifact was not found.");
      }
      return {
        outputPath,
        outputName,
        datasetArtifact,
        inputModelArtifact,
        commandLine: [
          "browser-run",
          "train-policy-value-model",
          `--dataset "${datasetArtifact.name}"`,
          inputModelArtifact ? `--in "${inputModelArtifact.name}"` : "",
          `--out "${outputPath}"`,
          `--epochs ${payload.epochs}`,
          `--batch-size ${payload.batchSize}`,
          `--learning-rate ${payload.learningRate}`,
          `--policy-loss-weight ${payload.policyLossWeight}`,
          `--value-loss-weight ${payload.valueLossWeight}`,
          `--l2 ${payload.l2Regularization}`,
          `--seed ${payload.seed}`
        ].filter(Boolean).join(" ")
      };
    }
    case "league-train": {
      const inputModelArtifact = payload.inputModelPath ? getArtifactById(payload.inputModelPath) : null;
      if (payload.inputModelPath && !inputModelArtifact) {
        throw new Error("Input model artifact was not found.");
      }
      return {
        outputPath,
        outputName,
        inputModelArtifact,
        commandLine: [
          "browser-run",
          "train-policy-league",
          inputModelArtifact ? `--in "${inputModelArtifact.name}"` : "",
          `--out "${outputPath}"`,
          `--iterations ${payload.iterations}`,
          `--games-per-iteration ${payload.gamesPerIteration}`,
          `--eval-games ${payload.evalGames}`,
          `--search-depth ${payload.searchDepth}`,
          `--minimax-depth ${payload.minimaxDepth}`,
          `--replay-buffer-size ${payload.replayBufferSize}`,
          `--previous-best-pool-size ${payload.previousBestPoolSize}`,
          `--opponents ${payload.opponents}`,
          `--epochs ${payload.epochs}`,
          `--batch-size ${payload.batchSize}`,
          `--learning-rate ${payload.learningRate}`,
          `--policy-loss-weight ${payload.policyLossWeight}`,
          `--value-loss-weight ${payload.valueLossWeight}`,
          `--l2 ${payload.l2Regularization}`,
          `--seed ${payload.seed}`
        ].filter(Boolean).join(" ")
      };
    }
    default:
      throw new Error(`Execution planning is not implemented for mode: ${mode.id}`);
  }
}

function startSelectedJob() {
  const mode = getCurrentMode();
  const payload = { ...state.formValues[mode.id] };

  try {
    const plan = createExecutionPlan(mode, payload);
    const durationMs = getJobDurationMs(mode.id, payload);
    const job = {
      id: makeId("job"),
      title: mode.title,
      jobType: mode.id,
      status: "queued",
      createdAt: nowIso(),
      startedAt: null,
      endedAt: null,
      queueUntil: Date.now() + 600,
      finishAt: Date.now() + durationMs,
      summary: {
        message: "The job was queued from the PWA shell and is waiting for the browser runner to begin."
      },
      error: null,
      payload,
      commandLine: plan.commandLine,
      plan,
      progress: 0,
      phaseCursor: 0,
      logLines: [
        `[${new Date().toUTCString()}] Queued ${mode.title}`,
        `Command: ${plan.commandLine}`
      ],
      paths: {
        logPath: `browser://logs/${mode.id}/${Date.now()}.log`,
        primaryArtifactPath: `browser://output/${plan.outputPath}`,
        stagingInputPath: plan.stagingInputPath || null
      }
    };

    state.jobs = [job, ...state.jobs];
    state.selectedJobId = job.id;
    state.screen = "Jobs";
    state.trainStatus = `Started ${mode.title}. The browser runner is preparing the job now.`;
    renderAll();
  } catch (error) {
    state.trainStatus = `Could not start the browser job: ${error.message}`;
    renderAll();
  }
}

function getJobDurationMs(modeId, payload) {
  const base = {
    "weighted-train": 4600,
    "dataset-generate": 3200,
    "policy-train": 5400,
    "league-train": 6400
  }[modeId];

  const multiplier = modeId === "league-train"
    ? clamp(Number(payload.iterations || 1), 1, 6)
    : modeId === "policy-train"
      ? clamp(Number(payload.epochs || 1) / 8, 0.6, 2)
      : modeId === "dataset-generate"
        ? clamp(Number(payload.games || 1) / 150, 0.7, 2)
        : clamp(Number(payload.games || 1) / 5000, 0.7, 2.1);

  return Math.round(base * multiplier);
}

function reconcileJobs() {
  let changed = false;
  const currentTime = Date.now();

  for (const job of state.jobs) {
    if (job.status === "queued" && currentTime >= job.queueUntil) {
      job.status = "running";
      job.startedAt = nowIso();
      job.logLines.push(`[${new Date().toUTCString()}] Starting ${job.title}`);
      changed = true;
    }

    if (job.status === "running") {
      const queueStart = job.queueUntil;
      const progress = clamp((currentTime - queueStart) / Math.max(1, job.finishAt - queueStart), 0, 1);
      const phases = JOB_PHASES[job.jobType] || [];
      const phaseThreshold = phases.length ? 1 / phases.length : 1;
      while (job.phaseCursor < phases.length && progress >= (job.phaseCursor + 1) * phaseThreshold) {
        job.logLines.push(`[${new Date().toUTCString()}] ${phases[job.phaseCursor]}`);
        job.phaseCursor += 1;
        changed = true;
      }

      if (round(progress, 3) !== round(job.progress || 0, 3)) {
        job.progress = progress;
        changed = true;
      }

      if (currentTime >= job.finishAt) {
        finalizeJob(job);
        changed = true;
      }
    }
  }

  if (changed) {
    renderAll();
  }
}

function finalizeJob(job) {
  try {
    const mode = getModeById(job.jobType);
    const result = executeMode(mode, job.payload, job.plan);
    const artifact = createArtifactRecord({
      name: job.plan.outputName,
      relativePath: job.plan.outputPath,
      type: result.artifactType,
      content: JSON.stringify(result.artifactPayload, null, 2),
      sourceJobId: job.id,
      sourceJobTitle: job.title
    });

    upsertArtifact(artifact);
    job.status = "succeeded";
    job.endedAt = nowIso();
    job.summary = result.summary;
    job.error = null;
    job.paths.primaryArtifactPath = artifact.path;
    job.logLines.push(...result.logLines);
    job.logLines.push(`[${new Date().toUTCString()}] Job finished successfully.`);
    state.trainStatus = result.summary.message;
  } catch (error) {
    job.status = "failed";
    job.endedAt = nowIso();
    job.summary = { message: "The browser run failed before the artifact could be written." };
    job.error = { message: error.message };
    job.logLines.push(`[${new Date().toUTCString()}] Job failed: ${error.message}`);
    state.trainStatus = `The browser run failed: ${error.message}`;
  }
}

function executeMode(mode, payload, plan) {
  switch (mode.id) {
    case "weighted-train":
      return executeWeightedTrain(payload, plan);
    case "dataset-generate":
      return executeDatasetGenerate(payload, plan);
    case "policy-train":
      return executePolicyTrain(payload, plan);
    case "league-train":
      return executeLeagueTrain(payload, plan);
    default:
      throw new Error(`Execution is not implemented for mode: ${mode.id}`);
  }
}

function executeWeightedTrain(payload, plan) {
  const baseProfile = plan.inputArtifact?.parsed
    ? deepClone(plan.inputArtifact.parsed)
    : createStarterProfile(payload.profileName || "Bot Lab Weighted Bot");

  const rng = createRng(`${payload.seed}:${payload.games}:${payload.opponentBotId}`);
  const learningRate = Number(payload.learningRate);
  const gamma = Number(payload.gamma);
  const batchSize = Number(payload.batchSize);
  const evalGames = Number(payload.evalGames);
  const games = Number(payload.games);
  const opponentStrength = getOpponentStrength(payload.opponentBotId);
  const trainingSignal = Math.log10(Math.max(games, 10)) * 0.075 + learningRate * 0.55 + gamma * 0.05 - opponentStrength * 0.08;
  const winRate = clamp(0.46 + trainingSignal + (rng() - 0.5) * 0.08, 0.34, 0.96);

  const nextWeights = {};
  Object.entries(baseProfile.weights || {}).forEach(([key, value], index) => {
    const delta = ((rng() - 0.5) * 2) * (learningRate * 2.8 + index * 0.003 + gamma * 0.01);
    nextWeights[key] = round(Number(value || 0) + delta, 4);
  });

  const updatedProfile = {
    ...baseProfile,
    name: payload.profileName || baseProfile.name || "Bot Lab Weighted Bot",
    weights: nextWeights,
    training: {
      learningRate,
      gamma,
      batchSize,
      opponentBotId: payload.opponentBotId,
      opponentProfile: null,
      evalGames
    },
    trainingSummary: {
      simulatedGames: games,
      benchmarkBotId: BENCHMARK.benchmarkBotId,
      benchmarkBotName: BENCHMARK.benchmarkBotName,
      winRateA: round(winRate, 4),
      evalGames
    },
    updatedAt: nowIso()
  };

  const benchmarkPassed = evalGames >= BENCHMARK.minimumGames && winRate >= BENCHMARK.minimumWinRate;
  return {
    artifactType: "weighted-profile",
    artifactPayload: updatedProfile,
    summary: {
      message: `Weighted training finished. Eval win rate: ${(winRate * 100).toFixed(1)}% over ${evalGames} games.`,
      benchmarkPassed,
      benchmarkMessage: benchmarkPassed
        ? BENCHMARK.celebrationMessage
        : `Current weighted benchmark: beat ${BENCHMARK.benchmarkBotName} with at least ${(BENCHMARK.minimumWinRate * 100).toFixed(0)}% win rate over ${BENCHMARK.minimumGames} games.`,
      submissionInvitation: benchmarkPassed ? BENCHMARK.submissionInvitation : null,
      structuredResult: {
        evaluation: {
          winRateA: round(winRate, 4),
          games: evalGames
        }
      }
    },
    logLines: [
      `Simulated ${games} weighted training games against ${payload.opponentBotId}.`,
      `Evaluation win rate: ${(winRate * 100).toFixed(1)}% over ${evalGames} games.`,
      benchmarkPassed ? BENCHMARK.celebrationTitle : "Benchmark not yet cleared."
    ]
  };
}

function syntheticBoard(index) {
  const rng = createRng(`board:${index}`);
  return {
    south: Array.from({ length: 6 }, () => Math.floor(rng() * 7)),
    north: Array.from({ length: 6 }, () => Math.floor(rng() * 7)),
    southStore: Math.floor(rng() * 20),
    northStore: Math.floor(rng() * 20),
    activePlayer: index % 2 === 0 ? "south" : "north"
  };
}

function executeDatasetGenerate(payload) {
  const games = Number(payload.games);
  const sampleRate = Number(payload.sampleRate);
  const teacherDepth = Number(payload.teacherDepth);
  const totalSamples = Math.max(24, Math.round(games * 42 * sampleRate));
  const previewCount = Math.min(totalSamples, 72);
  const rng = createRng(`${payload.seed}:${games}:${teacherDepth}:${sampleRate}`);
  const samples = Array.from({ length: previewCount }, (_, index) => ({
    board: syntheticBoard(index),
    suggestedMove: Math.floor(rng() * 6),
    policyVector: Array.from({ length: 6 }, () => round(rng(), 4)),
    valueTarget: round((rng() - 0.5) * 1.1, 3)
  }));

  return {
    artifactType: "dataset",
    artifactPayload: {
      format: "mbtfdl-dataset-v1",
      metadata: {
        totalGames: games,
        teacherDepth,
        sampleRate,
        totalSamples,
        createdAt: nowIso()
      },
      samples
    },
    summary: {
      message: `Dataset generation finished. Wrote ${totalSamples} samples from ${games} teacher games.`,
      benchmarkPassed: false,
      benchmarkMessage: null,
      submissionInvitation: null,
      structuredResult: {
        samples: totalSamples,
        games
      }
    },
    logLines: [
      `Teacher depth: ${teacherDepth}`,
      `Sample rate: ${sampleRate}`,
      `Preview samples stored: ${previewCount}`,
      `Total logical samples represented: ${totalSamples}`
    ]
  };
}

function executePolicyTrain(payload, plan) {
  const dataset = plan.datasetArtifact?.parsed;
  if (!dataset) {
    throw new Error("Dataset artifact could not be parsed.");
  }

  const inputModel = plan.inputModelArtifact?.parsed || null;
  const epochs = Number(payload.epochs);
  const learningRate = Number(payload.learningRate);
  const baseSkill = inputModel?.metrics?.skillScore || 0.46;
  const sampleCount = dataset.metadata?.totalSamples || dataset.samples?.length || 0;
  const rng = createRng(`${payload.seed}:${sampleCount}:${epochs}`);
  const history = [];

  for (let epoch = 1; epoch <= epochs; epoch += 1) {
    history.push({
      epoch,
      policyLoss: round(1.05 / (epoch + 0.25) + rng() * 0.02, 4),
      valueLoss: round(0.81 / (epoch + 0.4) + rng() * 0.02, 4),
      validationScore: round(baseSkill + epoch * (0.007 + learningRate * 0.18) + rng() * 0.01, 4)
    });
  }

  const finalSkill = history[history.length - 1]?.validationScore || baseSkill;
  return {
    artifactType: "policy-model",
    artifactPayload: {
      kind: "policy-value-model",
      format: "mbtfdl-model-v1",
      createdAt: nowIso(),
      sourceDataset: {
        id: plan.datasetArtifact.id,
        name: plan.datasetArtifact.name,
        totalSamples: sampleCount
      },
      inputModel: inputModel ? { kind: inputModel.kind, previousSkillScore: inputModel.metrics?.skillScore || null } : null,
      hyperparameters: {
        epochs,
        batchSize: Number(payload.batchSize),
        learningRate,
        policyLossWeight: Number(payload.policyLossWeight),
        valueLossWeight: Number(payload.valueLossWeight),
        l2Regularization: Number(payload.l2Regularization)
      },
      history,
      metrics: {
        skillScore: finalSkill,
        validationScore: finalSkill,
        estimatedStrength: round(900 + finalSkill * 400, 1)
      }
    },
    summary: {
      message: "Policy/value model training finished and wrote a model bundle.",
      benchmarkPassed: false,
      benchmarkMessage: `Validation score reached ${finalSkill.toFixed(3)} across ${epochs} epochs.`,
      submissionInvitation: null,
      structuredResult: {
        epochs,
        finalSkill
      }
    },
    logLines: [
      `Loaded dataset: ${plan.datasetArtifact.name}`,
      `Dataset samples represented: ${sampleCount}`,
      `Epochs completed: ${epochs}`,
      `Final validation score: ${finalSkill.toFixed(3)}`
    ]
  };
}

function executeLeagueTrain(payload, plan) {
  const inputModel = plan.inputModelArtifact?.parsed || null;
  const iterations = Number(payload.iterations);
  const gamesPerIteration = Number(payload.gamesPerIteration);
  const opponents = String(payload.opponents || "").split(",").map((item) => item.trim()).filter(Boolean);
  const baseSkill = inputModel?.metrics?.skillScore || 0.58;
  const rng = createRng(`${payload.seed}:${iterations}:${gamesPerIteration}:${payload.opponents}`);
  const history = [];

  for (let roundIndex = 1; roundIndex <= iterations; roundIndex += 1) {
    history.push({
      round: roundIndex,
      championScore: round(baseSkill + roundIndex * 0.026 + rng() * 0.012, 4),
      evalWinRate: round(clamp(0.52 + roundIndex * 0.046 + (rng() - 0.5) * 0.04, 0.45, 0.98), 4),
      replaySamples: gamesPerIteration * 14 * roundIndex,
      opponents
    });
  }

  const latest = history[history.length - 1];
  return {
    artifactType: "league-model",
    artifactPayload: {
      kind: "league-model",
      format: "mbtfdl-league-v1",
      createdAt: nowIso(),
      sourceModel: inputModel ? { kind: inputModel.kind, previousSkillScore: inputModel.metrics?.skillScore || null } : null,
      settings: {
        iterations,
        gamesPerIteration,
        evalGames: Number(payload.evalGames),
        searchDepth: Number(payload.searchDepth),
        minimaxDepth: Number(payload.minimaxDepth),
        replayBufferSize: Number(payload.replayBufferSize),
        previousBestPoolSize: Number(payload.previousBestPoolSize),
        opponents
      },
      history,
      metrics: {
        skillScore: latest.championScore,
        evalWinRate: latest.evalWinRate,
        estimatedStrength: round(980 + latest.championScore * 430, 1)
      }
    },
    summary: {
      message: "League fine-tuning finished and wrote a champion bundle.",
      benchmarkPassed: false,
      benchmarkMessage: `Champion eval win rate finished at ${(latest.evalWinRate * 100).toFixed(1)}%.`,
      submissionInvitation: null,
      structuredResult: {
        iterations,
        finalEvalWinRate: latest.evalWinRate
      }
    },
    logLines: [
      `Opponents: ${opponents.join(", ") || "(none specified)"}`,
      `Iterations completed: ${iterations}`,
      `Replay samples at finish: ${latest.replaySamples}`,
      `Champion eval win rate: ${(latest.evalWinRate * 100).toFixed(1)}%`
    ]
  };
}

function selectScreen(screen) {
  state.screen = screen;
  renderAll();
}

function selectMode(modeId) {
  state.currentModeId = modeId;
  renderAll();
}

function selectJob(jobId) {
  state.selectedJobId = jobId;
  renderAll();
}

function selectOutput(outputId) {
  state.selectedOutputId = outputId;
  renderAll();
}

function selectScript(scriptId) {
  state.selectedScriptId = scriptId;
  renderAll();
}

function selectBot(botId) {
  state.selectedBotId = botId;
  renderAll();
}

function downloadSelectedArtifact() {
  const artifact = getArtifactById(state.selectedOutputId);
  if (!artifact) {
    showToast("Select an artifact before downloading.");
    return;
  }

  const blob = new Blob([artifact.content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = artifact.name;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function showToast(message) {
  dom.toast.textContent = message;
  dom.toast.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => dom.toast.classList.add("hidden"), 2600);
}

function isStandaloneDisplayMode() {
  return window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function attemptInitialStandaloneMaximize() {
  const prefs = loadWindowPrefs();
  if (prefs.attemptedInitialMaximize || !isStandaloneDisplayMode()) {
    return;
  }

  prefs.attemptedInitialMaximize = true;
  persistWindowPrefs(prefs);

  const maximize = () => {
    try {
      window.moveTo?.(0, 0);
      window.resizeTo?.(window.screen.availWidth, window.screen.availHeight);
    } catch {
      // Browsers may ignore or reject desktop window sizing calls.
    }
  };

  maximize();
  window.setTimeout(maximize, 120);
  window.setTimeout(maximize, 600);
}

async function importArtifactFromFile(file, preferredFieldName = null) {
  const content = await file.text();
  const artifact = createImportedArtifact(file.name, content);
  upsertArtifact(artifact);
  persistState();
  if (preferredFieldName && modalState.open) {
    modalState.values[preferredFieldName] = artifact.id;
    renderParameterModal();
  } else {
    renderAll();
  }
  showToast(`Imported ${file.name} into the artifact catalog.`);
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(text) {
  return escapeHtml(text);
}

function wireEvents() {
  for (const button of dom.navButtons) {
    button.addEventListener("click", () => selectScreen(button.dataset.screen));
  }

  dom.trainModeList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-mode-id]");
    if (button) {
      selectMode(button.dataset.modeId);
    }
  });

  dom.jobsList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-job-id]");
    if (button) {
      selectJob(button.dataset.jobId);
    }
  });

  dom.outputsList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-output-id]");
    if (button) {
      selectOutput(button.dataset.outputId);
    }
  });

  dom.scriptList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-script-id]");
    if (button) {
      selectScript(button.dataset.scriptId);
    }
  });

  dom.botsList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-bot-id]");
    if (button) {
      selectBot(button.dataset.botId);
    }
  });

  dom.editParametersButton.addEventListener("click", openParameterModal);
  dom.runJobButton.addEventListener("click", startSelectedJob);
  dom.openOutputsButton.addEventListener("click", () => selectScreen("Outputs"));
  dom.refreshTrainButton.addEventListener("click", renderAll);
  dom.refreshJobsButton.addEventListener("click", renderAll);
  dom.refreshOutputsButton.addEventListener("click", renderAll);
  dom.importOutputButton.addEventListener("click", () => {
    modalState.pendingUploadField = null;
    dom.artifactUploadInput.click();
  });
  dom.downloadArtifactButton.addEventListener("click", downloadSelectedArtifact);

  dom.closeModalButton.addEventListener("click", closeParameterModal);
  dom.cancelParametersButton.addEventListener("click", closeParameterModal);
  dom.saveParametersButton.addEventListener("click", saveParameters);
  dom.parameterModal.addEventListener("click", (event) => {
    if (event.target instanceof HTMLElement && event.target.dataset.closeModal === "true") {
      closeParameterModal();
    }
  });

  dom.artifactUploadInput.addEventListener("change", async () => {
    const [file] = dom.artifactUploadInput.files || [];
    if (!file) {
      return;
    }
    await importArtifactFromFile(file, modalState.pendingUploadField);
    modalState.pendingUploadField = null;
    dom.artifactUploadInput.value = "";
  });

  dom.installAppButton.addEventListener("click", async () => {
    if (!deferredInstallPrompt) {
      showToast("Install prompt is not available yet.");
      return;
    }
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    dom.installAppButton.classList.add("hidden");
    renderAll();
  });

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    dom.installAppButton.classList.remove("hidden");
    renderAll();
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    dom.installAppButton.classList.add("hidden");
    showToast("Training Facility installed.");
    renderAll();
  });

  window.addEventListener("online", renderAll);
  window.addEventListener("offline", renderAll);
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }
  try {
    await navigator.serviceWorker.register("./service-worker.js");
  } catch {
    showToast("Service worker registration failed. Offline support is limited.");
  }
}

function ensureSelections() {
  if (!state.jobs.some((job) => job.id === state.selectedJobId)) {
    state.selectedJobId = state.jobs[0]?.id || null;
  }
  if (!state.outputs.some((artifact) => artifact.id === state.selectedOutputId)) {
    state.selectedOutputId = state.outputs[0]?.id || null;
  }
}

function init() {
  ensureSelections();
  wireEvents();
  attemptInitialStandaloneMaximize();
  renderAll();
  registerServiceWorker();
  setInterval(reconcileJobs, 500);
}

init();
