const canvas = document.getElementById("boardCanvas");
const ctx = canvas.getContext("2d");
const $ = (id) => document.getElementById(id);

const ROWS = 7;
const COLS = 7;
const DT = 1000 / 60;
const STORE = "pocket-garden-rescue-v1";
const WEED = "weed";
const TYPES = ["bloom", "leaf", "water", "sun", "seed", "ladybug"];
const META = {
  bloom: { label: "Bloom", short: "B", color: "#ee7f8f", glow: "rgba(238,127,143,.32)" },
  leaf: { label: "Leaf", short: "L", color: "#78b86f", glow: "rgba(120,184,111,.32)" },
  water: { label: "Water", short: "W", color: "#64add8", glow: "rgba(100,173,216,.32)" },
  sun: { label: "Sun", short: "S", color: "#f2bd52", glow: "rgba(242,189,82,.32)" },
  seed: { label: "Seed", short: "D", color: "#c88b47", glow: "rgba(200,139,71,.32)" },
  ladybug: { label: "Ladybug", short: "G", color: "#f25c49", glow: "rgba(242,92,73,.32)" }
};
const STAGES = [
  { title: "Sprout Roof", body: "A soft green comeback with fresh boxes, loose soil, and the first bright planters.", unlocks: ["Mint basil", "Sunbeam marigold", "Tin rain barrel"], threshold: 60 },
  { title: "Butterfly Deck", body: "A painted bench and wildflower corners invite bees, butterflies, and a cozy coffee break.", unlocks: ["Butterfly fern", "Stripe awning", "Pollinator arch"], threshold: 130 },
  { title: "Lantern Nook", body: "String lights and moon jars turn the roof into a warm evening hangout.", unlocks: ["Moon vine", "Lantern trio", "Glow path stones"], threshold: 210 },
  { title: "Tea Terrace", body: "Tiny pastries and herb shelves make the roof feel like a daily ritual.", unlocks: ["Chamomile set", "Tea trolley", "Porcelain bird bath"], threshold: 300 },
  { title: "Skyline Conservatory", body: "Glass panels and vertical gardens make the skyline feel alive.", unlocks: ["Glass fern", "Rose ladder", "Sun petal mural"], threshold: 400 }
];
const EVENTS = [
  { title: "Lantern Path", body: "Reach 60 points to unlock a moonlit stepping-stone skin." },
  { title: "Three-Day Return", body: "Come back after a break and the game serves a soft reset chest, not a punishment." },
  { title: "Weekend Bloom Pass", body: "Win three levels for a guaranteed rare decoration card." }
];
const CLUBS = [
  { title: "Skyline Sprouts", body: "12 cozy gardeners, one weekly chest, and a no-pressure contribution loop." },
  { title: "Bouquet Relay", body: "Every win adds bouquet badges to a group goal with shared rewards." },
  { title: "Kindness Bonus", body: "Miss a day and clubmates keep your streak warm once per week." }
];
const DEFAULT_PROGRESS = {
  level: 1,
  petals: 0,
  restorationPoints: 0,
  stageIndex: 0,
  collection: [],
  streak: 1,
  streakShield: 1,
  lastPlayedDay: "",
  eventPoints: 0,
  clubPoints: 0,
  boosters: { trowel: 2, bloom: 1, shuffle: 2 },
  soundOn: true,
  returnGiftClaimedFor: ""
};
const TUTORIAL = [
  ["bloom", "leaf", "water", "ladybug", "seed", "sun", "bloom"],
  ["ladybug", "seed", "sun", "water", "leaf", "bloom", "water"],
  ["water", "bloom", "water", "sun", "ladybug", "seed", "leaf"],
  ["sun", "ladybug", "seed", "water", "bloom", "leaf", "sun"],
  ["leaf", "water", "ladybug", "seed", "sun", "water", "ladybug"],
  ["seed", "sun", "bloom", "leaf", "water", "ladybug", "seed"],
  ["bloom", "leaf", "water", "ladybug", "seed", "sun", "bloom"]
];

const ui = {
  overlay: $("overlay"),
  overlayKicker: $("overlayKicker"),
  overlayTitle: $("overlayTitle"),
  overlayBody: $("overlayBody"),
  overlayRewards: $("overlayRewards"),
  overlayButton: $("overlayButton"),
  levelTitle: $("levelTitle"),
  moves: $("movesValue"),
  combo: $("comboValue"),
  reward: $("rewardValue"),
  streak: $("streakValue"),
  stage: $("stageValue"),
  petals: $("petalValue"),
  goals: $("goalStrip"),
  gardenTitle: $("gardenStageTitle"),
  gardenBody: $("gardenStageBody"),
  gardenPct: $("gardenCompletion"),
  gardenText: $("gardenProgressText"),
  gardenFill: $("gardenProgressFill"),
  collection: $("collectionGrid"),
  eventText: $("eventProgressText"),
  eventFill: $("eventProgressFill"),
  eventCards: $("eventCards"),
  clubText: $("clubProgressText"),
  clubFill: $("clubProgressFill"),
  clubCards: $("clubCards"),
  hint: $("hintButton"),
  mute: $("muteButton"),
  boosterTrowel: $("boosterTrowel"),
  boosterBloom: $("boosterBloom"),
  boosterShuffle: $("boosterShuffle")
};

const audio = {
  ctx: null,
  ping(a, b, d) {
    if (!state.progress.soundOn) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    this.ctx = this.ctx || new AudioContext();
    if (this.ctx.state === "suspended") this.ctx.resume();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(a, now);
    osc.frequency.exponentialRampToValueAtTime(b, now + d);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + d);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + d + 0.02);
  }
};

const state = {
  tab: "garden",
  mode: "loading",
  board: [],
  selected: null,
  cursor: { row: 2, col: 2 },
  movesLeft: 0,
  combo: 1,
  levelConfig: null,
  message: "Swap neighboring garden pieces to make matches.",
  rewardMessage: "Daily bloom bundle ready",
  particles: [],
  petalsBg: [],
  pulse: 0,
  boardRect: { x: 24, y: 180, size: 0, tile: 0 },
  progress: structuredClone(DEFAULT_PROGRESS),
  pendingWelcome: null,
  overlayAction: null,
  deterministic: false,
  lastFrame: 0,
  lastInput: null
};

const clone = (value) => JSON.parse(JSON.stringify(value));
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const rand = (n) => Math.floor(Math.random() * n);
const inBounds = (row, col) => row >= 0 && row < ROWS && col >= 0 && col < COLS;
const todayKey = () => new Date().toISOString().slice(0, 10);
const dayNum = (key) => key ? Math.floor(new Date(`${key}T00:00:00`).getTime() / 86400000) : 0;
const stageInfo = () => STAGES[state.progress.stageIndex] || STAGES.at(-1);
const cellKey = (row, col) => `${row},${col}`;
function tile(type, more = {}) { return { type, special: more.special || null, weed: !!more.weed }; }

function loadProgress() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORE) || "null");
    return parsed ? {
      ...clone(DEFAULT_PROGRESS),
      ...parsed,
      boosters: { ...DEFAULT_PROGRESS.boosters, ...(parsed.boosters || {}) },
      collection: parsed.collection || []
    } : clone(DEFAULT_PROGRESS);
  } catch {
    return clone(DEFAULT_PROGRESS);
  }
}

function saveProgress() {
  localStorage.setItem(STORE, JSON.stringify(state.progress));
}

function syncDaily() {
  const today = todayKey();
  const delta = state.progress.lastPlayedDay ? dayNum(today) - dayNum(state.progress.lastPlayedDay) : 0;
  let rewards = null;
  if (!state.progress.lastPlayedDay) {
    state.progress.petals += 20;
    state.progress.boosters.trowel += 1;
    rewards = ["+20 petals", "+1 trowel"];
  } else if (delta === 1) {
    state.progress.streak += 1;
    state.progress.petals += 15;
    rewards = [`Day ${state.progress.streak} streak`, "+15 petals"];
  } else if (delta === 2 && state.progress.streakShield > 0) {
    state.progress.streakShield -= 1;
    state.progress.petals += 10;
    rewards = ["Streak shield saved you", "+10 petals"];
  } else if (delta >= 3 && state.progress.returnGiftClaimedFor !== today) {
    state.progress.streak = 1;
    state.progress.returnGiftClaimedFor = today;
    state.progress.petals += 25;
    state.progress.boosters.bloom += 1;
    rewards = ["Welcome-back bloom burst", "+1 Bloom Burst", "+25 petals"];
  }
  state.progress.lastPlayedDay = today;
  state.pendingWelcome = rewards;
  if (rewards) state.rewardMessage = rewards[0];
  saveProgress();
}

function createsMatch(board, row, col, type) {
  return (col >= 2 && board[row][col - 1] && board[row][col - 2] &&
      board[row][col - 1].type === type && board[row][col - 2].type === type) ||
    (row >= 2 && board[row - 1][col] && board[row - 2][col] &&
      board[row - 1][col].type === type && board[row - 2][col].type === type);
}

function boardFromLayout(layout, weeds = []) {
  return layout.map((row, rowIndex) => row.map((typeName, colIndex) => tile(typeName, {
    weed: weeds.some((cell) => cell.row === rowIndex && cell.col === colIndex)
  })));
}

function weedCells(level) {
  const cells = [];
  while (cells.length < Math.min(10, Math.floor(level / 3))) {
    const row = 1 + rand(ROWS - 2);
    const col = rand(COLS);
    if (!cells.some((cell) => cell.row === row && cell.col === col)) cells.push({ row, col });
  }
  return cells;
}

function generateBoard(weeds) {
  const board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      let typeName = TYPES[rand(TYPES.length)];
      let tries = 0;
      while (createsMatch(board, row, col, typeName) && tries < 12) {
        typeName = TYPES[rand(TYPES.length)];
        tries += 1;
      }
      board[row][col] = tile(typeName, {
        weed: weeds.some((cell) => cell.row === row && cell.col === col)
      });
    }
  }
  return findMove(board) ? board : generateBoard(weeds);
}

function levelGoals(level) {
  const primary = TYPES[(level + 1) % TYPES.length];
  const secondary = TYPES[(level + 3) % TYPES.length];
  const goals = [{ type: primary, target: Math.min(18, 6 + level * 2), collected: 0 }];
  if (level % 2 === 0 && level > 1) goals.push({ type: secondary, target: Math.min(16, 5 + level), collected: 0 });
  if (level % 3 === 0) goals.push({ type: WEED, target: Math.min(8, 2 + Math.floor(level / 2)), collected: 0 });
  return goals;
}

function buildLevel(level) {
  if (level === 1) {
    return {
      level,
      title: "Level 1 - Rooftop wake-up",
      moves: 12,
      board: boardFromLayout(TUTORIAL),
      goals: [{ type: "water", target: 3, collected: 0 }],
      narrative: "Match the rainwater drops to wake up the first planter boxes."
    };
  }
  const weeds = weedCells(level);
  return {
    level,
    title: `Level ${level} - ${level < 10 ? "Fresh terrace" : level < 20 ? "Bloom walk" : "Sky garden"} ${level}`,
    moves: clamp(18 - Math.floor(level / 5), 10, 18),
    board: generateBoard(weeds),
    goals: levelGoals(level),
    narrative: level % 2 === 0 ?
      "Collect themed pieces to fill the next restoration crate." :
      "Clear cozy blockers and keep the rooftop growing."
  };
}

function swap(board, a, b) {
  const temp = board[a.row][a.col];
  board[a.row][a.col] = board[b.row][b.col];
  board[b.row][b.col] = temp;
}

function findMatches(board) {
  const groups = [];
  const unique = new Map();

  for (let row = 0; row < ROWS; row += 1) {
    let runType = null;
    let start = 0;
    for (let col = 0; col <= COLS; col += 1) {
      const typeName = col < COLS && board[row][col] ? board[row][col].type : null;
      if (typeName !== runType) {
        if (runType && col - start >= 3) {
          const cells = [];
          for (let x = start; x < col; x += 1) {
            cells.push({ row, col: x });
            unique.set(cellKey(row, x), { row, col: x });
          }
          groups.push({ type: runType, cells, axis: "row" });
        }
        runType = typeName;
        start = col;
      }
    }
  }

  for (let col = 0; col < COLS; col += 1) {
    let runType = null;
    let start = 0;
    for (let row = 0; row <= ROWS; row += 1) {
      const typeName = row < ROWS && board[row][col] ? board[row][col].type : null;
      if (typeName !== runType) {
        if (runType && row - start >= 3) {
          const cells = [];
          for (let x = start; x < row; x += 1) {
            cells.push({ row: x, col });
            unique.set(cellKey(x, col), { row: x, col });
          }
          groups.push({ type: runType, cells, axis: "col" });
        }
        runType = typeName;
        start = row;
      }
    }
  }

  return { groups, cells: [...unique.values()] };
}

function findMove(board) {
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      for (const neighbor of [{ row, col: col + 1 }, { row: row + 1, col }]) {
        if (!inBounds(neighbor.row, neighbor.col)) continue;
        swap(board, { row, col }, neighbor);
        const hasMatch = findMatches(board).cells.length > 0;
        swap(board, { row, col }, neighbor);
        if (hasMatch) return [{ row, col }, neighbor];
      }
    }
  }
  return null;
}

function ensurePlayable() {
  if (!findMove(state.board)) shuffleBoard(false);
}

function startLevel(level) {
  state.levelConfig = buildLevel(level);
  state.board = clone(state.levelConfig.board);
  state.movesLeft = state.levelConfig.moves;
  state.combo = 1;
  state.selected = null;
  state.cursor = { row: 2, col: 2 };
  state.mode = "play";
  state.message = state.levelConfig.narrative;
  ensurePlayable();
  renderHud();
}

function goalAdd(typeName, count) {
  state.levelConfig.goals.forEach((goal) => {
    if (goal.type === typeName) goal.collected = clamp(goal.collected + count, 0, goal.target);
  });
}

function goalsDone() {
  return state.levelConfig.goals.every((goal) => goal.collected >= goal.target);
}

function center(row, col) {
  return {
    x: state.boardRect.x + (col + 0.5) * state.boardRect.tile,
    y: state.boardRect.y + (row + 0.5) * state.boardRect.tile
  };
}

function burst(cells, color) {
  cells.forEach((cell) => {
    const point = center(cell.row, cell.col);
    for (let index = 0; index < 5; index += 1) {
      state.particles.push({
        x: point.x,
        y: point.y,
        vx: (Math.random() - 0.5) * 2,
        vy: -Math.random() * 2 - 0.2,
        life: 0.7 + Math.random() * 0.3,
        color
      });
    }
  });
}

function specialSpawn(groups, pair, cascade) {
  if (!pair || cascade > 1) return null;
  const big = groups.find((group) => group.cells.length >= 4);
  if (!big) return null;
  const anchor = big.cells.some((cell) => cell.row === pair[1].row && cell.col === pair[1].col) ? pair[1] : pair[0];
  return { row: anchor.row, col: anchor.col, type: big.type, special: big.cells.length >= 5 ? "bomb" : "row" };
}

function expandSpecials(cells) {
  const queue = [...cells];
  const seen = new Set(cells.map((cell) => cellKey(cell.row, cell.col)));
  while (queue.length) {
    const cell = queue.shift();
    const current = state.board[cell.row][cell.col];
    if (!current || !current.special) continue;
    if (current.special === "row") {
      for (let col = 0; col < COLS; col += 1) {
        const key = cellKey(cell.row, col);
        if (!seen.has(key)) {
          seen.add(key);
          queue.push({ row: cell.row, col });
        }
      }
    }
    if (current.special === "bomb") {
      for (let row = cell.row - 1; row <= cell.row + 1; row += 1) {
        for (let col = cell.col - 1; col <= cell.col + 1; col += 1) {
          if (!inBounds(row, col)) continue;
          const key = cellKey(row, col);
          if (!seen.has(key)) {
            seen.add(key);
            queue.push({ row, col });
          }
        }
      }
    }
  }
  return [...seen].map((key) => {
    const [row, col] = key.split(",").map(Number);
    return { row, col };
  });
}

function dropAndFill() {
  for (let col = 0; col < COLS; col += 1) {
    let pointer = ROWS - 1;
    for (let row = ROWS - 1; row >= 0; row -= 1) {
      if (state.board[row][col]) {
        state.board[pointer][col] = state.board[row][col];
        if (pointer !== row) state.board[row][col] = null;
        pointer -= 1;
      }
    }
    for (let row = pointer; row >= 0; row -= 1) state.board[row][col] = null;
  }
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      if (!state.board[row][col]) state.board[row][col] = tile(TYPES[rand(TYPES.length)]);
    }
  }
  while (findMatches(state.board).cells.length) {
    findMatches(state.board).cells.forEach((cell) => {
      state.board[cell.row][cell.col] = tile(TYPES[rand(TYPES.length)]);
    });
  }
}

function resolve(pair = null) {
  let found = findMatches(state.board);
  let cascade = 0;
  if (!found.cells.length) return false;

  while (found.cells.length) {
    cascade += 1;
    const cells = expandSpecials(found.cells);
    const spawn = specialSpawn(found.groups, pair, cascade);
    const clear = new Set(cells.map((cell) => cellKey(cell.row, cell.col)));
    const counts = {};
    let weeds = 0;

    cells.forEach((cell) => {
      const current = state.board[cell.row][cell.col];
      if (!current) return;
      counts[current.type] = (counts[current.type] || 0) + 1;
      if (current.weed) weeds += 1;
      for (let row = cell.row - 1; row <= cell.row + 1; row += 1) {
        for (let col = cell.col - 1; col <= cell.col + 1; col += 1) {
          if (!inBounds(row, col)) continue;
          const near = state.board[row][col];
          if (near && near.weed && !clear.has(cellKey(row, col))) {
            near.weed = false;
            weeds += 1;
          }
        }
      }
    });

    Object.entries(counts).forEach(([typeName, count]) => goalAdd(typeName, count));
    if (weeds) goalAdd(WEED, weeds);
    burst(cells, META[found.groups[0]?.type || "bloom"].color);
    cells.forEach((cell) => { state.board[cell.row][cell.col] = null; });
    if (spawn) state.board[spawn.row][spawn.col] = tile(spawn.type, { special: spawn.special });
    dropAndFill();
    found = findMatches(state.board);
  }

  state.combo = Math.max(1, cascade);
  state.rewardMessage = cascade >= 2 ?
    `Cascade x${cascade}! Surprise petals tucked into your basket.` :
    "Fresh matches bloom into garden progress.";
  if (cascade >= 2) state.progress.petals += 5 * cascade;
  audio.ping(520, 260, 0.14);
  renderHud();

  if (goalsDone()) winLevel();
  else if (state.movesLeft <= 0) loseLevel();
  else ensurePlayable();
  return true;
}

function shuffleBoard(useBooster = true) {
  if (useBooster && state.progress.boosters.shuffle <= 0) {
    state.rewardMessage = "No shuffle boosters left. Win a level to earn more.";
    renderHud();
    return;
  }
  if (useBooster) state.progress.boosters.shuffle -= 1;
  const weeds = [];
  const bag = [];
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const current = state.board[row][col];
      bag.push(tile(current.type, { special: current.special }));
      if (current.weed) weeds.push({ row, col });
    }
  }
  bag.sort(() => Math.random() - 0.5);
  let index = 0;
  state.board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const current = bag[index];
      index += 1;
      state.board[row][col] = tile(current.type, {
        special: current.special,
        weed: weeds.some((cell) => cell.row === row && cell.col === col)
      });
    }
  }
  while (findMatches(state.board).cells.length || !findMove(state.board)) {
    state.board = generateBoard(weeds);
  }
  state.rewardMessage = useBooster ? "The gardeners reshuffled the tray for you." : "Fresh tray loaded.";
  saveProgress();
  renderHud();
}

function showOverlay(config) {
  ui.overlayKicker.textContent = config.kicker;
  ui.overlayTitle.textContent = config.title;
  ui.overlayBody.textContent = config.body;
  ui.overlayRewards.innerHTML = "";
  config.rewards.forEach((reward) => {
    const div = document.createElement("div");
    div.className = "reward-pill";
    div.textContent = reward;
    ui.overlayRewards.appendChild(div);
  });
  ui.overlayButton.textContent = config.button;
  state.overlayAction = config.action;
  ui.overlay.classList.remove("hidden");
}

function winLevel() {
  state.mode = "won";
  state.message = "Level cleared. The rooftop got brighter.";
  const petals = 25 + state.levelConfig.level * 4;
  const bloomPoints = 22 + Math.floor(state.levelConfig.level / 2) * 4;
  const lanterns = 10 + state.combo * 2;
  const badges = 8 + state.combo;
  state.progress.petals += petals;
  state.progress.restorationPoints += bloomPoints;
  state.progress.eventPoints += lanterns;
  state.progress.clubPoints += badges;
  const stage = stageInfo();
  if (state.progress.restorationPoints >= stage.threshold) {
    const unlock = stage.unlocks[state.progress.stageIndex % stage.unlocks.length];
    if (unlock && !state.progress.collection.includes(unlock)) state.progress.collection.push(unlock);
    if (state.progress.stageIndex < STAGES.length - 1) state.progress.stageIndex += 1;
  } else if (Math.random() < 0.5) {
    const unlock = stage.unlocks[rand(stage.unlocks.length)];
    if (!state.progress.collection.includes(unlock)) state.progress.collection.push(unlock);
  }
  state.progress.level = Math.min(30, state.progress.level + 1);
  state.rewardMessage = `Garden restored. +${petals} petals and a fresh rooftop reward.`;
  saveProgress();
  audio.ping(430, 860, 0.18);
  showOverlay({
    kicker: "Level cleared",
    title: "The rooftop got brighter",
    body: "You finished the level, nudged the garden forward, and banked rewards for the next cozy upgrade.",
    rewards: [`+${petals} petals`, `+${bloomPoints} bloom points`, `+${lanterns} lantern points`, `+${badges} bouquet badges`],
    button: "Next level",
    action: () => startLevel(state.progress.level)
  });
}

function loseLevel() {
  state.mode = "lost";
  state.message = "Out of moves. Try again with a fresh tray.";
  audio.ping(260, 110, 0.24);
  showOverlay({
    kicker: "Garden nap",
    title: "Out of moves, not out of momentum",
    body: "Friendly F2P means no hard fail wall. Keep your rewards and replay the level with a fresh board.",
    rewards: ["Try again instantly", "No lives lost", "Streak kept warm"],
    button: "Retry level",
    action: () => startLevel(state.levelConfig.level)
  });
}

function select(cell) {
  if (state.mode !== "play" || !ui.overlay.classList.contains("hidden")) return;
  if (!state.selected) {
    state.selected = cell;
    state.message = `${META[state.board[cell.row][cell.col].type].label} selected.`;
    renderHud();
    return;
  }
  if (state.selected.row === cell.row && state.selected.col === cell.col) {
    state.selected = null;
    state.message = "Selection cleared.";
    renderHud();
    return;
  }
  if (Math.abs(state.selected.row - cell.row) + Math.abs(state.selected.col - cell.col) !== 1) {
    state.selected = cell;
    state.message = "Pick a neighboring tile to swap.";
    renderHud();
    return;
  }
  if (state.movesLeft <= 0) return;
  const first = state.selected;
  swap(state.board, first, cell);
  if (!findMatches(state.board).cells.length) {
    swap(state.board, first, cell);
    state.selected = null;
    state.message = "That swap will not help this garden yet.";
    state.rewardMessage = "Try the hint if you want a low-pressure nudge.";
    renderHud();
    return;
  }
  state.selected = null;
  state.movesLeft -= 1;
  audio.ping(420, 620, 0.08);
  resolve([first, cell]);
}

function moveCursor(dx, dy) {
  state.cursor = {
    row: clamp(state.cursor.row + dy, 0, ROWS - 1),
    col: clamp(state.cursor.col + dx, 0, COLS - 1)
  };
  drawScene();
}

function useBooster(typeName) {
  if (!ui.overlay.classList.contains("hidden") || state.mode !== "play") return;
  if (typeName === "shuffle") {
    shuffleBoard(true);
    return;
  }
  if (state.progress.boosters[typeName] <= 0) {
    state.rewardMessage = "That booster tray is empty.";
    renderHud();
    return;
  }
  if (typeName === "trowel") {
    if (!state.selected) {
      state.message = "Tap a tile first, then use the trowel.";
      renderHud();
      return;
    }
    state.progress.boosters.trowel -= 1;
    const current = state.board[state.selected.row][state.selected.col];
    goalAdd(current.type, 1);
    if (current.weed) goalAdd(WEED, 1);
    burst([state.selected], META[current.type].color);
    state.board[state.selected.row][state.selected.col] = tile(TYPES[rand(TYPES.length)]);
    state.selected = null;
    dropAndFill();
    resolve();
    state.rewardMessage = "Trowel used. One stubborn tile gone.";
  }
  if (typeName === "bloom") {
    state.progress.boosters.bloom -= 1;
    const activeGoal = state.levelConfig.goals.find((goal) => goal.type !== WEED && goal.collected < goal.target);
    const target = activeGoal ? activeGoal.type : "bloom";
    const cells = [];
    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        if (state.board[row][col].type === target) cells.push({ row, col });
      }
    }
    goalAdd(target, cells.length);
    burst(cells, META[target].color);
    cells.forEach((cell) => { state.board[cell.row][cell.col] = null; });
    dropAndFill();
    resolve();
    state.rewardMessage = `Bloom Burst cleared every ${META[target].label.toLowerCase()} tile.`;
  }
  saveProgress();
  renderHud();
}

function renderHud() {
  const stage = stageInfo();
  ui.levelTitle.textContent = state.levelConfig.title;
  ui.moves.textContent = state.movesLeft;
  ui.combo.textContent = `x${state.combo}`;
  ui.reward.textContent = state.rewardMessage;
  ui.streak.textContent = `Day ${state.progress.streak}`;
  ui.stage.textContent = stage.title;
  ui.petals.textContent = state.progress.petals;
  ui.gardenTitle.textContent = stage.title;
  ui.gardenBody.textContent = stage.body;
  const percent = Math.round(clamp(state.progress.restorationPoints / stage.threshold * 100, 0, 100));
  ui.gardenPct.textContent = `${percent}%`;
  ui.gardenText.textContent = `${state.progress.restorationPoints} / ${stage.threshold} bloom points`;
  ui.gardenFill.style.width = `${percent}%`;
  ui.eventText.textContent = `${state.progress.eventPoints} / 120 lantern points`;
  ui.eventFill.style.width = `${clamp(state.progress.eventPoints / 120 * 100, 0, 100)}%`;
  ui.clubText.textContent = `${state.progress.clubPoints} / 180 bouquet badges`;
  ui.clubFill.style.width = `${clamp(state.progress.clubPoints / 180 * 100, 0, 100)}%`;
  ui.boosterTrowel.textContent = state.progress.boosters.trowel;
  ui.boosterBloom.textContent = state.progress.boosters.bloom;
  ui.boosterShuffle.textContent = state.progress.boosters.shuffle;
  ui.mute.textContent = state.progress.soundOn ? "Sound On" : "Sound Off";

  ui.goals.innerHTML = "";
  state.levelConfig.goals.forEach((goal) => {
    const div = document.createElement("div");
    div.className = "goal-chip";
    const label = goal.type === WEED ? "Clear weeds" : `Collect ${META[goal.type].label}`;
    div.innerHTML = `<span class="section-label">${label}</span><strong>${goal.collected} / ${goal.target}</strong>`;
    ui.goals.appendChild(div);
  });

  ui.collection.innerHTML = "";
  stage.unlocks.forEach((unlock) => {
    const div = document.createElement("div");
    div.className = "collection-item";
    const owned = state.progress.collection.includes(unlock);
    div.innerHTML = `<span class="section-label">${owned ? "Unlocked" : "Coming next"}</span><strong>${unlock}</strong><p>${owned ? "In your pocket garden album." : "Keep restoring to reveal this decor card."}</p>`;
    ui.collection.appendChild(div);
  });

  ui.eventCards.innerHTML = "";
  EVENTS.forEach((item) => {
    const div = document.createElement("div");
    div.className = "small-card";
    div.innerHTML = `<span class="section-label">Event</span><strong>${item.title}</strong><p>${item.body}</p>`;
    ui.eventCards.appendChild(div);
  });

  ui.clubCards.innerHTML = "";
  CLUBS.forEach((item) => {
    const div = document.createElement("div");
    div.className = "small-card";
    div.innerHTML = `<span class="section-label">Club</span><strong>${item.title}</strong><p>${item.body}</p>`;
    ui.clubCards.appendChild(div);
  });
}

function setTab(tab) {
  state.tab = tab;
  document.querySelectorAll(".tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tab);
  });
  document.querySelectorAll(".panel").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.panel === tab);
  });
}

function rounded(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function drawTile(current, x, y, radius, glow) {
  ctx.save();
  ctx.shadowColor = META[current.type].glow;
  ctx.shadowBlur = 14 + glow * 12;
  if (current.type === "bloom") {
    ctx.fillStyle = META.bloom.color;
    for (let index = 0; index < 5; index += 1) {
      const angle = Math.PI * 2 * index / 5;
      ctx.beginPath();
      ctx.ellipse(x + Math.cos(angle) * radius * 0.52, y + Math.sin(angle) * radius * 0.52, radius * 0.34, radius * 0.5, angle, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#fff6d9";
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.28, 0, Math.PI * 2);
    ctx.fill();
  }
  if (current.type === "leaf") {
    ctx.fillStyle = META.leaf.color;
    ctx.beginPath();
    ctx.ellipse(x, y, radius * 0.42, radius * 0.72, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - radius * 0.18, y + radius * 0.42);
    ctx.lineTo(x + radius * 0.18, y - radius * 0.42);
    ctx.stroke();
  }
  if (current.type === "water") {
    ctx.fillStyle = META.water.color;
    ctx.beginPath();
    ctx.moveTo(x, y - radius * 0.78);
    ctx.bezierCurveTo(x + radius * 0.66, y - radius * 0.2, x + radius * 0.56, y + radius * 0.58, x, y + radius * 0.78);
    ctx.bezierCurveTo(x - radius * 0.56, y + radius * 0.58, x - radius * 0.66, y - radius * 0.2, x, y - radius * 0.78);
    ctx.fill();
  }
  if (current.type === "sun") {
    ctx.strokeStyle = "rgba(242,189,82,.9)";
    ctx.lineWidth = 3;
    for (let index = 0; index < 8; index += 1) {
      const angle = Math.PI * 2 * index / 8;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(angle) * radius * 0.62, y + Math.sin(angle) * radius * 0.62);
      ctx.lineTo(x + Math.cos(angle) * radius * 0.9, y + Math.sin(angle) * radius * 0.9);
      ctx.stroke();
    }
    ctx.fillStyle = META.sun.color;
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.52, 0, Math.PI * 2);
    ctx.fill();
  }
  if (current.type === "seed") {
    ctx.fillStyle = META.seed.color;
    ctx.beginPath();
    ctx.ellipse(x, y, radius * 0.4, radius * 0.66, Math.PI / 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.2)";
    ctx.beginPath();
    ctx.ellipse(x + radius * 0.08, y - radius * 0.1, radius * 0.12, radius * 0.32, Math.PI / 8, 0, Math.PI * 2);
    ctx.fill();
  }
  if (current.type === "ladybug") {
    ctx.fillStyle = META.ladybug.color;
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.58, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#1f241f";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y - radius * 0.55);
    ctx.lineTo(x, y + radius * 0.58);
    ctx.stroke();
    ctx.fillStyle = "#1f241f";
    [[-0.18, -0.12], [0.18, -0.12], [-0.16, 0.24], [0.16, 0.24]].forEach(([dx, dy]) => {
      ctx.beginPath();
      ctx.arc(x + dx * radius * 2, y + dy * radius * 2, radius * 0.1, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  if (current.special) {
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255,252,236,.95)";
    if (current.special === "row") ctx.fillRect(x - radius * 0.68, y - 4, radius * 1.36, 8);
    else {
      for (let index = 0; index < 6; index += 1) {
        const angle = Math.PI * 2 * index / 6;
        ctx.beginPath();
        ctx.arc(x + Math.cos(angle) * radius * 0.32, y + Math.sin(angle) * radius * 0.32, radius * 0.13, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.restore();
}

function drawScene() {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const width = canvas.width / dpr;
  const height = canvas.height / dpr;
  ctx.clearRect(0, 0, width, height);

  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#eaf0d9");
  sky.addColorStop(0.3, "#b9d7a5");
  sky.addColorStop(1, "#3d6f57");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "rgba(255,255,255,.24)";
  ctx.beginPath();
  ctx.arc(width * 0.2, height * 0.12, 68, 0, Math.PI * 2);
  ctx.arc(width * 0.75, height * 0.16, 42, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#5c7f6a";
  for (let index = 0; index < 7; index += 1) {
    const x = index * width / 7;
    const buildingHeight = 80 + (index % 3) * 36;
    ctx.fillRect(x, height - 130 - buildingHeight, width / 8, buildingHeight + 90);
  }

  state.petalsBg.forEach((petal, index) => {
    const drift = Math.sin(state.pulse * 0.8 + petal.sway) * 10;
    ctx.fillStyle = index % 2 ? "rgba(255,255,255,.25)" : "rgba(255,240,210,.35)";
    ctx.beginPath();
    ctx.ellipse(petal.x + drift, petal.y, 4, 10, petal.sway, 0, Math.PI * 2);
    ctx.fill();
  });

  rounded(18, 20, width - 36, 132, 26);
  ctx.fillStyle = "rgba(255,250,242,.86)";
  ctx.fill();
  ctx.fillStyle = "#5f7562";
  ctx.font = "12px Verdana";
  ctx.fillText("Pocket Garden Rescue", 34, 46);
  ctx.fillStyle = "#284133";
  ctx.font = "700 27px Trebuchet MS";
  ctx.fillText("Match. Restore. Collect.", 34, 78);
  ctx.font = "14px Verdana";
  ctx.fillStyle = "#627a6a";
  ctx.fillText(stageInfo().body, 34, 104, width - 70);
  ctx.fillText(state.message, 34, 128, width - 70);

  const { x, y, size, tile: tileSize } = state.boardRect;
  const hint = findMove(state.board);
  rounded(x - 12, y - 12, size + 24, size + 24, 30);
  ctx.fillStyle = "rgba(19,51,38,.2)";
  ctx.fill();
  rounded(x, y, size, size, 26);
  const soil = ctx.createLinearGradient(0, y, 0, y + size);
  soil.addColorStop(0, "#f1dcb8");
  soil.addColorStop(1, "#d2b584");
  ctx.fillStyle = soil;
  ctx.fill();

  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const px = x + col * tileSize;
      const py = y + row * tileSize;
      const selected = state.selected && state.selected.row === row && state.selected.col === col;
      const cursor = state.cursor && state.cursor.row === row && state.cursor.col === col;
      const hinted = hint && ((hint[0].row === row && hint[0].col === col) || (hint[1].row === row && hint[1].col === col));
      const glow = selected ? 0.9 : cursor ? 0.5 : hinted ? 0.25 + Math.sin(state.pulse * 5) * 0.12 : 0;

      rounded(px + 3, py + 3, tileSize - 6, tileSize - 6, 16);
      ctx.fillStyle = `rgba(255,255,255,${0.13 + glow * 0.2})`;
      ctx.fill();

      const current = state.board[row][col];
      if (!current) continue;
      drawTile(current, px + tileSize * 0.5, py + tileSize * 0.5, tileSize * 0.36, glow);
      if (current.weed) {
        ctx.strokeStyle = "rgba(53,88,34,.88)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(px + tileSize * 0.5, py + tileSize * 0.5, tileSize * 0.33, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(px + tileSize * 0.26, py + tileSize * 0.64);
        ctx.quadraticCurveTo(px + tileSize * 0.5, py + tileSize * 0.2, px + tileSize * 0.74, py + tileSize * 0.64);
        ctx.stroke();
      }
      if (selected) {
        ctx.strokeStyle = "rgba(255,249,219,.96)";
        ctx.lineWidth = 4;
        rounded(px + 2, py + 2, tileSize - 4, tileSize - 4, 18);
        ctx.stroke();
      } else if (cursor) {
        ctx.strokeStyle = "rgba(80,98,66,.86)";
        ctx.lineWidth = 3;
        rounded(px + 8, py + 8, tileSize - 16, tileSize - 16, 14);
        ctx.stroke();
      }
    }
  }

  state.particles.forEach((particle) => {
    ctx.globalAlpha = clamp(particle.life, 0, 1);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  rounded(18, height - 118, width - 36, 96, 24);
  ctx.fillStyle = "rgba(255,251,244,.9)";
  ctx.fill();
  ctx.fillStyle = "#647c69";
  ctx.font = "12px Verdana";
  ctx.fillText("Engagement loop", 34, height - 88);
  ctx.fillStyle = "#294233";
  ctx.font = "700 19px Trebuchet MS";
  ctx.fillText("Quick win -> brighter garden", 34, height - 58);
  ctx.font = "14px Verdana";
  ctx.fillStyle = "#627a6a";
  ctx.fillText(state.rewardMessage, 34, height - 34, width - 70);
}

function step(ms) {
  const dt = ms / 1000;
  state.pulse += dt;
  state.petalsBg.forEach((petal) => {
    petal.y += petal.speed * dt;
    if (petal.y > canvas.clientHeight + 24) petal.y = -20;
  });
  state.particles = state.particles.filter((particle) => {
    particle.x += particle.vx * 60 * dt;
    particle.y += particle.vy * 60 * dt;
    particle.vy += 0.05;
    particle.life -= dt * 1.8;
    return particle.life > 0;
  });
}

function resize() {
  const width = canvas.clientWidth || 360;
  const height = Math.round(width * 1.92);
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  state.boardRect = { x: 24, y: 172, size: width - 48, tile: (width - 48) / COLS };
  if (!state.petalsBg.length) {
    state.petalsBg = Array.from({ length: 18 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      speed: 8 + Math.random() * 16,
      sway: Math.random() * Math.PI * 2
    }));
  }
  drawScene();
}

function pointToCell(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = (clientX - rect.left) * (canvas.clientWidth / rect.width);
  const y = (clientY - rect.top) * (canvas.clientHeight / rect.height);
  const col = Math.floor((x - state.boardRect.x) / state.boardRect.tile);
  const row = Math.floor((y - state.boardRect.y) / state.boardRect.tile);
  return inBounds(row, col) ? { row, col } : null;
}

function handleCanvasInput(clientX, clientY) {
  const now = performance.now();
  if (state.lastInput) {
    const sameSpot = Math.abs(state.lastInput.x - clientX) < 2 && Math.abs(state.lastInput.y - clientY) < 2;
    if (sameSpot && now - state.lastInput.time < 50) return;
  }
  state.lastInput = { x: clientX, y: clientY, time: now };
  const cell = pointToCell(clientX, clientY);
  if (cell) {
    select(cell);
    drawScene();
  }
}

canvas.addEventListener("pointerdown", (event) => {
  handleCanvasInput(event.clientX, event.clientY);
});

canvas.addEventListener("mousedown", (event) => {
  handleCanvasInput(event.clientX, event.clientY);
});

canvas.addEventListener("touchstart", (event) => {
  const touch = event.touches[0];
  if (!touch) return;
  handleCanvasInput(touch.clientX, touch.clientY);
});

ui.overlayButton.addEventListener("click", () => {
  ui.overlay.classList.add("hidden");
  const action = state.overlayAction;
  state.overlayAction = null;
  if (action) action();
  renderHud();
  drawScene();
});

ui.hint.addEventListener("click", () => {
  const hint = findMove(state.board);
  if (hint) {
    state.selected = hint[0];
    state.message = "A gentle hint: try the softly glowing tiles.";
    renderHud();
    drawScene();
  }
});

document.querySelectorAll(".booster").forEach((button) => {
  button.addEventListener("click", () => useBooster(button.dataset.booster));
});

document.querySelectorAll(".tab").forEach((button) => {
  button.addEventListener("click", () => setTab(button.dataset.tab));
});

ui.mute.addEventListener("click", () => {
  state.progress.soundOn = !state.progress.soundOn;
  saveProgress();
  renderHud();
});

window.addEventListener("resize", resize);
window.addEventListener("keydown", async (event) => {
  if (state.mode === "play" && ui.overlay.classList.contains("hidden")) {
    if (event.key === "ArrowLeft") { event.preventDefault(); moveCursor(-1, 0); return; }
    if (event.key === "ArrowRight") { event.preventDefault(); moveCursor(1, 0); return; }
    if (event.key === "ArrowUp") { event.preventDefault(); moveCursor(0, -1); return; }
    if (event.key === "ArrowDown") { event.preventDefault(); moveCursor(0, 1); return; }
    if (event.key === " " || event.code === "Space") {
      event.preventDefault();
      select({ row: state.cursor.row, col: state.cursor.col });
      drawScene();
      return;
    }
  }
  if (event.key.toLowerCase() === "f") {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    else await document.exitFullscreen();
  }
  if (event.key === "Escape" && document.fullscreenElement) await document.exitFullscreen();
});

window.render_game_to_text = () => JSON.stringify({
  note: "Board origin is top-left. Rows increase downward; columns increase to the right.",
  mode: state.mode,
  tab: state.tab,
  level: state.levelConfig.level,
  movesLeft: state.movesLeft,
  selected: state.selected,
  cursor: state.cursor,
  goals: state.levelConfig.goals,
  rewardMessage: state.rewardMessage,
  board: state.board.map((row) => row.map((current) => ({
    type: current.type,
    short: META[current.type].short,
    special: current.special || "",
    weed: current.weed
  })))
});

window.advanceTime = (ms) => {
  state.deterministic = true;
  const steps = Math.max(1, Math.round(ms / DT));
  for (let index = 0; index < steps; index += 1) step(DT);
  drawScene();
};

function loop(timestamp) {
  if (!state.lastFrame) state.lastFrame = timestamp;
  const delta = Math.min(32, timestamp - state.lastFrame);
  state.lastFrame = timestamp;
  if (!state.deterministic) {
    step(delta);
    drawScene();
  }
  requestAnimationFrame(loop);
}

function init() {
  const automated = navigator.webdriver;
  state.progress = loadProgress();
  syncDaily();
  setTab("garden");
  startLevel(clamp(state.progress.level, 1, 30));
  renderHud();
  resize();
  if (state.pendingWelcome && !automated) {
    showOverlay({
      kicker: "Welcome back",
      title: "Daily bloom bundle",
      body: "The game gives you a soft little spark to return: petals, a booster, and a reason to peek at the rooftop again.",
      rewards: state.pendingWelcome,
      button: "Collect",
      action: () => {
        state.pendingWelcome = null;
        saveProgress();
      }
    });
  } else if (automated) {
    state.pendingWelcome = null;
  }
  requestAnimationFrame(loop);
}

init();
