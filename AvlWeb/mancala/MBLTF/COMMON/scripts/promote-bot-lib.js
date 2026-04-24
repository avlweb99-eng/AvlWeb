import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import {
  BOT_TYPE_POLICY_VALUE_SEARCH,
  normalizeCustomBot,
  parseCustomBotJson,
  serializeCustomBot,
} from '../js/bots/botProfiles.js';
import { getPromotedBotEntries, serializePromotedBotManifest } from '../js/bots/promotedRegistry.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const DEFAULT_PROMOTED_DIR = path.join(repoRoot, 'js', 'bots', 'promoted');
export const DEFAULT_MANIFEST_PATH = path.join(repoRoot, 'js', 'bots', 'promotedBotsManifest.js');
const RESERVED_IDS = new Set(['random', 'greedy', 'minimax']);

export async function promoteBot({
  inputPath,
  manifestPath = DEFAULT_MANIFEST_PATH,
  promotedDir = DEFAULT_PROMOTED_DIR,
  id = null,
  name = null,
  notes = '',
  searchDepth = null,
  overwrite = false,
  isChampion = false,
} = {}) {
  if (!inputPath) {
    throw new Error('An input bot JSON path is required.');
  }

  const resolvedManifestPath = manifestPath ? path.resolve(manifestPath) : DEFAULT_MANIFEST_PATH;
  const resolvedPromotedDir = promotedDir ? path.resolve(promotedDir) : DEFAULT_PROMOTED_DIR;

  const resolvedInputPath = path.resolve(inputPath);
  if (!fs.existsSync(resolvedInputPath)) {
    throw new Error(`Input file not found: ${resolvedInputPath}`);
  }

  const parsedInput = parseCustomBotJson(fs.readFileSync(resolvedInputPath, 'utf8'));
  if (Array.isArray(parsedInput)) {
    throw new Error('Promotion expects a single bot JSON file, not an array.');
  }

  const normalizedBot = normalizeCustomBot(parsedInput);
  const promotedId = derivePromotedBotId(id ?? normalizedBot.id ?? resolvedInputPath, normalizedBot.name);
  validatePromotedBotId(promotedId);

  const promotedName = sanitizeName(name ?? normalizedBot.name);
  const existingEntries = await loadPromotedManifestEntries(resolvedManifestPath);
  const existingIndex = existingEntries.findIndex((entry) => entry.id === promotedId);
  if (existingIndex >= 0 && !overwrite) {
    throw new Error(`A promoted bot with id "${promotedId}" already exists. Use --overwrite to replace it.`);
  }

  const archivedBot = normalizePromotedBotPayload(normalizedBot, {
    id: promotedId,
    name: promotedName,
  });
  const promotedAt = new Date().toISOString();
  const sourceFileName = `${promotedId}.json`;
  const sourceFilePath = path.join(resolvedPromotedDir, sourceFileName);
  const manifestEntry = {
    id: promotedId,
    name: promotedName,
    botType: archivedBot.botType,
    sourceFile: `./promoted/${sourceFileName}`,
    promotedAt,
    notes: String(notes ?? '').trim(),
    isChampion: Boolean(isChampion),
    originalBotId: normalizedBot.id ?? promotedId,
    searchDepth: archivedBot.botType === BOT_TYPE_POLICY_VALUE_SEARCH
      ? normalizeSearchDepth(searchDepth, archivedBot)
      : null,
    bot: archivedBot,
  };

  const nextEntries = [...existingEntries];
  if (existingIndex >= 0) nextEntries.splice(existingIndex, 1, manifestEntry);
  else nextEntries.push(manifestEntry);
  nextEntries.sort((left, right) => left.name.localeCompare(right.name));

  fs.mkdirSync(resolvedPromotedDir, { recursive: true });
  fs.writeFileSync(sourceFilePath, serializeCustomBot(archivedBot));
  fs.writeFileSync(resolvedManifestPath, serializePromotedBotManifest(nextEntries));

  return {
    id: promotedId,
    name: promotedName,
    botType: archivedBot.botType,
    sourceFilePath,
    manifestPath: resolvedManifestPath,
    searchDepth: manifestEntry.searchDepth,
    overwritten: existingIndex >= 0,
  };
}

export function derivePromotedBotId(candidate, fallbackName = 'promoted-bot') {
  const raw = String(candidate ?? fallbackName)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return raw || String(fallbackName).trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-');
}

export async function loadPromotedManifestEntries(manifestPath = DEFAULT_MANIFEST_PATH) {
  const resolvedManifestPath = manifestPath ? path.resolve(manifestPath) : DEFAULT_MANIFEST_PATH;
  if (!fs.existsSync(resolvedManifestPath)) {
    return [];
  }

  const manifestUrl = pathToFileURL(resolvedManifestPath);
  manifestUrl.searchParams.set('ts', String(Date.now()));
  const module = await import(manifestUrl.href);
  return getPromotedBotEntries(module.PROMOTED_BOTS ?? []);
}

function normalizePromotedBotPayload(bot, { id, name }) {
  const renamed = normalizeCustomBot({
    ...bot,
    id,
    name,
  });

  if (renamed.botType === BOT_TYPE_POLICY_VALUE_SEARCH) {
    return {
      ...renamed,
      trainingMetadata: {
        ...renamed.trainingMetadata,
      },
    };
  }

  return renamed;
}

function validatePromotedBotId(id) {
  if (!id) {
    throw new Error('Promoted bot id cannot be empty.');
  }
  if (id.startsWith('custom:')) {
    throw new Error('Promoted bot ids cannot start with "custom:".');
  }
  if (RESERVED_IDS.has(id)) {
    throw new Error(`Promoted bot id "${id}" conflicts with a built-in bot id.`);
  }
}

function sanitizeName(value) {
  const trimmed = String(value ?? '').trim();
  return trimmed.slice(0, 64) || 'Promoted Bot';
}

function normalizeSearchDepth(candidate, bot) {
  const fallback = Number(
    bot?.trainingMetadata?.lastLeagueTrainingRun?.searchDepth
      ?? bot?.trainingMetadata?.searchDepth
      ?? 2,
  );
  const numeric = Number(candidate);
  const resolved = Number.isFinite(numeric) ? numeric : fallback;
  return Math.max(1, Math.floor(resolved || 2));
}

