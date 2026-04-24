export const learnOverviewSections = [
  {
    id: 'local-first',
    title: 'Local First',
    summary: 'Training runs on your machine. Your custom bots and model files stay local unless you explicitly share them later.',
  },
  {
    id: 'script-driven',
    title: 'Script Driven',
    summary: 'The Bot Lab is a thin shell over plain Node.js scripts so you can inspect how training really works.',
  },
  {
    id: 'train-loop',
    title: 'Train, Test, Improve',
    summary: 'The core loop is to train a bot locally, inspect the result, and then import it into the hosted Mancala game for play.',
  },
  {
    id: 'safety',
    title: 'Why This Feels Safe',
    summary: 'The app explains which files are touched, where outputs are stored, and what never leaves your machine during normal use.',
  },
];

export const scriptGuideCatalog = {
  'train-bot': {
    whenToUse: 'Use this when you want the simplest train-and-play loop: tweak a weighted bot, train it locally, and import the resulting JSON into the hosted game.',
    beginnerExplanation: 'This script starts with a weighted bot profile and nudges those weights by playing many local games. Think of it as a transparent training loop you can actually read.',
    technicalNote: 'The script loads one weighted profile JSON, applies CLI overrides, runs the shared trainer from js/training/trainer.js, writes the trained profile, and prints a structured JSON summary.',
    keyParameters: [
      { name: '--in', explanation: 'Input weighted profile JSON. If the Bot Lab leaves this blank, it generates a starter profile for you.' },
      { name: '--out', explanation: 'Where the trained profile JSON will be written.' },
      { name: '--games', explanation: 'How many self-improvement games to play before evaluation.' },
      { name: '--opponent', explanation: 'Which built-in bot this run should learn against.' },
      { name: '--eval-games', explanation: 'How many games to use for the final report card.' },
    ],
    annotations: [
      { title: 'Load and normalize the profile', note: 'The script parses one weighted bot JSON file and rejects arrays so the training run stays focused on a single bot.' },
      { title: 'Apply CLI overrides', note: 'This is where temporary experiment settings are layered onto the saved training defaults without mutating the original file first.' },
      { title: 'Train, then evaluate', note: 'The shared training engine returns both the updated profile and a summary of how the run performed.' },
      { title: 'Write a plain JSON artifact', note: 'The output stays transparent: another weighted profile JSON you can inspect or import directly into the hosted game.' },
    ],
  },
  'generate-minimax-dataset': {
    whenToUse: 'Use this when you want labeled training data for later policy/value model training.',
    beginnerExplanation: 'This script asks a stronger teacher, minimax, what good moves look like in many positions. The result is a dataset that another model can learn from.',
    technicalNote: 'The script reads only CLI options, generates data through js/training/minimaxDataset.js, writes a dataset JSON, and prints a compact completion line.',
    keyParameters: [
      { name: '--out', explanation: 'Where the generated dataset JSON will be saved.' },
      { name: '--games', explanation: 'How many full teacher games to simulate.' },
      { name: '--teacher-depth', explanation: 'How far the minimax teacher looks ahead.' },
      { name: '--sample-rate', explanation: 'What fraction of positions to keep in the dataset.' },
    ],
    annotations: [
      { title: 'Teacher-driven examples', note: 'This script does not train a bot directly. It creates examples that future model training can use.' },
      { title: 'Deterministic seeds', note: 'A seed lets learners rerun the same generation recipe and compare changes without guessing.' },
      { title: 'Simple output contract', note: 'The artifact is a plain JSON dataset, which makes it easy to inspect or reuse later.' },
    ],
  },
  'train-policy-value-model': {
    whenToUse: 'Use this after you already have a dataset and want to train a more advanced model bundle.',
    beginnerExplanation: 'This script teaches a policy/value model from examples in a dataset. It is the step where the app moves from transparent weighted profiles into compact learned models.',
    technicalNote: 'The script reads a dataset JSON, optionally resumes from an existing model bundle, trains through js/training/policyValueTrainer.js, writes a model bundle JSON, and prints structured metrics.',
    keyParameters: [
      { name: '--dataset', explanation: 'Required path to the dataset JSON the model should learn from.' },
      { name: '--in', explanation: 'Optional existing model bundle if you want to continue training instead of starting fresh.' },
      { name: '--epochs', explanation: 'How many full passes to make over the dataset.' },
      { name: '--batch-size', explanation: 'How many examples to process together during each training step.' },
      { name: '--learning-rate', explanation: 'How aggressively the model updates each step.' },
    ],
    annotations: [
      { title: 'Fresh model or continued training', note: 'If you skip --in, the script creates a new model bundle with a derived name from the dataset.' },
      { title: 'Dataset metadata matters', note: 'The dataset carries input-shape information forward so the model bundle lines up with the game encoding.' },
      { title: 'History stays visible', note: 'The printed JSON summary includes training history so the Bot Lab can explain what happened after the run.' },
    ],
  },
  'train-policy-league': {
    whenToUse: 'Use this when you already have a policy/value model and want to improve it through longer self-play style runs.',
    beginnerExplanation: 'League training is the advanced path. The model plays in a mix of opponents, saves useful experience, and tries to become a stronger champion over time.',
    technicalNote: 'The script optionally loads an input bundle, runs league training through js/training/policyValueLeagueTrainer.js, writes the champion bundle, and prints evaluation history.',
    keyParameters: [
      { name: '--in', explanation: 'Optional existing model bundle to keep improving.' },
      { name: '--iterations', explanation: 'How many league rounds to run.' },
      { name: '--games-per-iteration', explanation: 'How much new play data to generate in each round.' },
      { name: '--opponents', explanation: 'Comma-separated league schedule across built-ins, self-play, and previous champions.' },
      { name: '--eval-games', explanation: 'How many games to use when deciding whether a candidate deserves to stay champion.' },
    ],
    annotations: [
      { title: 'A longer-running mode', note: 'This path is designed for bigger local runs, which is why the Bot Lab keeps logs and cancellation controls visible.' },
      { title: 'Champion handoff', note: 'The final output is the current champion bundle, not every intermediate checkpoint.' },
      { title: 'Search depth still matters', note: 'Even a learned model can be wrapped in search, so search-depth settings shape how strong the final bot feels in-game.' },
    ],
  },
  'eval-bot': {
    whenToUse: 'Use this when you already have a weighted bot and want a quick scorecard before deciding whether it deserves another training round.',
    beginnerExplanation: 'This script is the simplest way to ask, “How did my bot do?” It does not create a new artifact; it prints a clear performance summary.',
    technicalNote: 'The script loads one weighted profile, builds the selected opponent, runs alternating-seat evaluation matches, and prints structured results for the Bot Lab to summarize.',
    keyParameters: [
      { name: '--in', explanation: 'Required weighted bot JSON to evaluate.' },
      { name: '--opponent', explanation: 'Built-in opponent used for the scorecard.' },
      { name: '--games', explanation: 'How many evaluation games to play.' },
      { name: '--seed', explanation: 'Deterministic seed for repeatable comparisons.' },
    ],
    annotations: [
      { title: 'Alternating seats', note: 'Seat order can matter in Mancala, so the evaluator alternates who starts to keep the result fairer.' },
      { title: 'Summary-first output', note: 'The Bot Lab can turn the printed JSON into a plain-language report card without guessing.' },
    ],
  },
};

export const artifactGuideCatalog = {
  'weighted-profile': {
    label: 'Weighted Bot JSON',
    importable: true,
    whatItIs: 'A plain JSON bot profile with readable weights and training settings.',
    nextStep: 'Import this file into the hosted Mancala game through Bot Lab > Profiles > Import JSON, then select it in Player 1 or Player 2.',
    hostedGameSteps: [
      'Open the hosted Mancala game and switch to the Bot Lab workspace.',
      'In the Profiles card, click Import JSON.',
      'Choose this weighted bot JSON from disk.',
      'Pick the imported bot in the Player 1 or Player 2 selectors and start a match.',
    ],
    localPrivacyNote: 'The hosted game reads this file locally in your browser during normal play. It does not upload the bot to the server, and the imported bot stays in that browser library unless you choose to share it later.',
  },
  dataset: {
    label: 'Training Dataset JSON',
    importable: false,
    whatItIs: 'A dataset of labeled Mancala positions, usually produced by a minimax teacher.',
    nextStep: 'Use this as the input for policy/value model training inside the Bot Lab.',
    hostedGameSteps: [],
    localPrivacyNote: 'Datasets stay local unless you explicitly share them later. They are not used by the hosted game directly.',
  },
  'policy-model': {
    label: 'Policy/Value Model JSON',
    importable: true,
    whatItIs: 'A learned model bundle that the Mancala app can wrap in search for stronger play.',
    nextStep: 'Import this JSON into the hosted game through Bot Lab > Profiles > Import JSON if that build supports policy/value custom bots, or keep refining it with league training.',
    hostedGameSteps: [
      'Open the hosted Mancala game and switch to the Bot Lab workspace.',
      'In the Profiles card, click Import JSON.',
      'Choose this model bundle JSON.',
      'Select the imported bot in Player 1 or Player 2 and start a match.',
    ],
    localPrivacyNote: 'The browser keeps the imported model local during normal play, just like weighted profiles. It is not sent to the hosted server during standard import-and-play use.',
  },
  'league-model': {
    label: 'League-Trained Model JSON',
    importable: true,
    whatItIs: 'A policy/value model bundle that has already been pushed through additional league-style self-play training.',
    nextStep: 'Import this into the hosted game to try your strongest local model or compare it against your previous bundles.',
    hostedGameSteps: [
      'Open the hosted Mancala game and switch to the Bot Lab workspace.',
      'In the Profiles card, import the model bundle locally through Import JSON.',
      'Test it against built-in bots or your earlier custom models by selecting it in Player 1 or Player 2.',
    ],
    localPrivacyNote: 'The file still stays on the user machine during standard hosted-game play, and the browser only uses the local imported copy for your matches.',
  },
  artifact: {
    label: 'Local Artifact',
    importable: false,
    whatItIs: 'A local output file created by the Bot Lab.',
    nextStep: 'Inspect the file path and decide whether it is a training input, a result artifact, or a debug output.',
    hostedGameSteps: [],
    localPrivacyNote: 'Local Bot Lab files remain on disk unless you explicitly move or share them yourself.',
  },
};

export const factoryBotGuideCatalog = {
  random: {
    shortLabel: 'Builtin',
    summary: 'Chooses any legal move at random.',
    style: 'Unpredictable and simple. It does not plan ahead or try to preserve good positions.',
    whyItMatters: 'This is the easiest comparison bot and a useful reminder that even a small amount of strategy should beat pure randomness over time.',
  },
  greedy: {
    shortLabel: 'Builtin',
    summary: 'Prefers moves that look immediately rewarding.',
    style: 'Short-term and tactical. It likes obvious gains, but it can miss deeper traps and longer combinations.',
    whyItMatters: 'Greedy Bot is a great first benchmark because it is stronger than random while still being easy to reason about.',
  },
  minimax: {
    shortLabel: 'Builtin',
    summary: 'Searches ahead with classic game-tree lookahead.',
    style: 'Deliberate and calculation-heavy. It evaluates future replies instead of only the current board.',
    whyItMatters: 'Minimax Bot shows what deeper search can do, which makes it a good teacher and a more demanding opponent.',
  },
  'elite-rules': {
    shortLabel: 'Builtin',
    summary: 'Uses a curated rule-based style tuned for strong practical play.',
    style: 'Structured and opinionated. It follows hand-built priorities rather than learning from data.',
    whyItMatters: 'Elite Rules Bot helps users compare learned bots against a strong handcrafted strategy baseline.',
  },
  'champion-20k-v1': {
    shortLabel: 'Promoted',
    summary: 'A promoted policy/value search bot from the Bot Lab pipeline.',
    style: 'Learned and search-assisted. It combines model guidance with search to play more like a polished late-stage contender.',
    whyItMatters: 'Champ20kv1 is the clearest example of where the training facility can lead: a promoted bot that came out of a 20,000-game league fine-tuning effort and earned a place in the hosted roster.',
  },
};
