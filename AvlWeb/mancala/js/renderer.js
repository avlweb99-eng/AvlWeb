import { getLegalMoves, getPlayerLabel, PLAYER_ONE, PLAYER_TWO } from './engine.js';

const topRowIndices = [12, 11, 10, 9, 8, 7];
const bottomRowIndices = [0, 1, 2, 3, 4, 5];

export function renderBoard({
  boardElement,
  state,
  playerConfigs,
  onPitClick,
  highlightedPit = null,
  pickedPit = null,
  animating = false,
}) {
  boardElement.innerHTML = '';

  const leftStore = createStore({
    label: playerConfigs[PLAYER_TWO]?.label ?? getPlayerLabel(PLAYER_TWO),
    count: state.board[13],
    className: 'left-store',
    isHighlighted: highlightedPit === 13,
    seedClass: 'player-two-seed',
    holeIndex: 13,
    moveNumber: state.moveNumber,
  });
  boardElement.appendChild(leftStore);

  topRowIndices.forEach((index, position) => {
    boardElement.appendChild(createPit({
      index,
      position,
      row: 'top',
      state,
      onPitClick,
      highlightedPit,
      pickedPit,
      animating,
    }));
  });

  bottomRowIndices.forEach((index, position) => {
    boardElement.appendChild(createPit({
      index,
      position,
      row: 'bottom',
      state,
      onPitClick,
      highlightedPit,
      pickedPit,
      animating,
    }));
  });

  const rightStore = createStore({
    label: playerConfigs[PLAYER_ONE]?.label ?? getPlayerLabel(PLAYER_ONE),
    count: state.board[6],
    className: 'right-store',
    isHighlighted: highlightedPit === 6,
    seedClass: 'player-one-seed',
    holeIndex: 6,
    moveNumber: state.moveNumber,
  });
  boardElement.appendChild(rightStore);
}

function createStore({ label, count, className, isHighlighted, seedClass, holeIndex, moveNumber }) {
  const el = document.createElement('div');
  el.className = `store ${className} ${isHighlighted ? 'seed-highlight' : ''}`.trim();
  el.dataset.holeIndex = String(holeIndex);
  el.innerHTML = `
    <div class="store-grain"></div>
    <div class="store-label">${escapeHtml(label)}</div>
    <div class="store-count">${count}</div>
    <div class="stone-dots store-dots">${renderDots({
      count: Math.min(count, 12),
      seedClass,
      layout: 'store',
      seedKey: `store-${holeIndex}-${moveNumber}-${count}`,
    })}</div>
  `;
  return el;
}

function createPit({ index, position, row, state, onPitClick, highlightedPit, pickedPit, animating }) {
  const legalMoves = getLegalMoves(state, state.currentPlayer);
  const isLegal = legalMoves.includes(index);
  const isDisabled = animating || !isLegal || state.gameOver;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = [
    'pit',
    isLegal ? 'legal active-turn' : '',
    highlightedPit === index ? 'seed-highlight' : '',
    pickedPit === index ? 'pit-picked' : '',
  ].filter(Boolean).join(' ');
  btn.disabled = isDisabled;
  btn.dataset.pitIndex = String(index);
  btn.dataset.holeIndex = String(index);
  btn.style.gridColumn = String(position + 2);
  btn.style.gridRow = row === 'top' ? '1' : '2';

  const displayNumber = row === 'bottom' ? index + 1 : index - 6;
  const stones = state.board[index];
  const seedClass = row === 'bottom' ? 'player-one-seed' : 'player-two-seed';

  btn.innerHTML = `
    <div class="pit-rim"></div>
    <div class="pit-shine"></div>
    <div class="pit-label">P${displayNumber}</div>
    <div class="pit-count">${stones}</div>
    <div class="stone-dots">${renderDots({
      count: Math.min(stones, 10),
      seedClass,
      layout: 'pit',
      seedKey: `pit-${index}-${state.moveNumber}-${stones}`,
    })}</div>
  `;

  btn.addEventListener('click', () => onPitClick(index));
  return btn;
}

function renderDots({ count, seedClass, layout, seedKey }) {
  const limit = Math.min(count, layout === 'store' ? 12 : 10);
  const positions = generateStonePositions({ count: limit, layout, seedKey });
  let html = '';
  for (let i = 0; i < positions.length; i += 1) {
    const { x, y, scale, rotate } = positions[i];
    html += `<span class="stone-dot ${seedClass}" style="left:${x}%; top:${y}%; --stone-scale:${scale}; --stone-rotate:${rotate}deg;"></span>`;
  }
  if (count > limit) {
    html += `<span class="pit-label extra-count">+${count - limit}</span>`;
  }
  return html;
}

function generateStonePositions({ count, layout, seedKey }) {
  const rng = createSeededRng(seedKey);
  const positions = [];
  const config = layout === 'store'
    ? { width: 74, height: 132, stone: 16, minDistance: 13 }
    : { width: 74, height: 62, stone: 16, minDistance: 13 };

  const maxAttempts = count * 60;
  let attempts = 0;

  while (positions.length < count && attempts < maxAttempts) {
    attempts += 1;
    const point = layout === 'store'
      ? randomPointInRoundedRect(rng, config.width, config.height, config.stone / 2 + 2, 0)
      : randomPointInCircle(rng, config.width / 2, config.height / 2 - 16, 20);

    if (!point) continue;
    const tooClose = positions.some((existing) => {
      const dx = existing.px - point.x;
      const dy = existing.py - point.y;
      return Math.hypot(dx, dy) < config.minDistance;
    });
    if (tooClose) continue;

    positions.push({
      px: point.x,
      py: point.y,
      x: Number(((point.x / config.width) * 100).toFixed(2)),
      y: Number(((point.y / config.height) * 100).toFixed(2)),
      scale: Number((0.92 + rng() * 0.12).toFixed(3)),
      rotate: Math.round((rng() - 0.5) * 20),
    });
  }

  if (positions.length < count) {
    return fallbackStonePositions(count, layout);
  }

  return positions;
}

function randomPointInCircle(rng, centerX, centerY, radius) {
  const angle = rng() * Math.PI * 2;
  const distance = Math.sqrt(rng()) * radius;
  return {
    x: centerX + Math.cos(angle) * distance,
    y: centerY + Math.sin(angle) * distance,
  };
}

function randomPointInRoundedRect(rng, width, height, padding) {
  return {
    x: padding + rng() * (width - padding * 2),
    y: padding + rng() * (height - padding * 2),
  };
}

function fallbackStonePositions(count, layout) {
  const pitFallback = [
    { x: 50, y: 34 }, { x: 35, y: 40 }, { x: 65, y: 40 }, { x: 50, y: 48 },
    { x: 28, y: 30 }, { x: 72, y: 30 }, { x: 42, y: 24 }, { x: 58, y: 24 },
    { x: 34, y: 18 }, { x: 66, y: 18 },
  ];
  const storeFallback = [
    { x: 36, y: 78 }, { x: 60, y: 78 }, { x: 48, y: 96 }, { x: 34, y: 60 },
    { x: 62, y: 58 }, { x: 48, y: 42 }, { x: 34, y: 32 }, { x: 62, y: 30 },
    { x: 48, y: 114 }, { x: 34, y: 114 }, { x: 62, y: 112 }, { x: 48, y: 22 },
  ];
  const source = layout === 'store' ? storeFallback : pitFallback;
  return source.slice(0, count).map((entry, index) => ({
    ...entry,
    scale: 0.96 + (index % 3) * 0.03,
    rotate: (index % 5) * 4 - 8,
  }));
}

function createSeededRng(seedKey) {
  let seed = 2166136261;
  const text = String(seedKey);
  for (let i = 0; i < text.length; i += 1) {
    seed ^= text.charCodeAt(i);
    seed = Math.imul(seed, 16777619);
  }
  return () => {
    seed += 0x6D2B79F5;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
