#!/usr/bin/env node
/**
 * Prompt Experiment Registry
 *
 * Lightweight A/B framework for prompt evolution.
 * Controls which prompt variant is active for daily runs.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_DIR = path.resolve(__dirname, '../..');
const EXPERIMENT_STATE_FILE = path.join(REPO_DIR, '.automation', '.local', 'state', 'prompt-experiments.jsonl');
const ACTIVE_VARIANT_FILE = path.join(REPO_DIR, '.automation', '.local', 'state', 'prompt-variant-active.txt');

const VARIANTS = {
  control: '',
  variant: '\n额外要求：请尝试使用更具体、更有争议性的对比角度来设计投票选项，以提升用户参与度和点击率。',
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function getActiveVariant() {
  if (fs.existsSync(ACTIVE_VARIANT_FILE)) {
    return fs.readFileSync(ACTIVE_VARIANT_FILE, 'utf-8').trim();
  }
  return 'control';
}

function setActiveVariant(variant) {
  ensureDir(path.dirname(ACTIVE_VARIANT_FILE));
  fs.writeFileSync(ACTIVE_VARIANT_FILE, variant, 'utf-8');
}

function logExperiment(date, profileId, variant) {
  ensureDir(path.dirname(EXPERIMENT_STATE_FILE));
  const line = JSON.stringify({ date, profileId, variant, timestamp: new Date().toISOString() }) + '\n';
  fs.appendFileSync(EXPERIMENT_STATE_FILE, line, 'utf-8');
}

function shouldUseVariant() {
  // Simple 20% rollout
  return Math.random() < 0.2;
}

export function getPromptSuffix(profileId) {
  const killSwitch = path.join(REPO_DIR, '.automation', '.local', 'state', 'SELF_EVOLUTION_DISABLED');
  if (fs.existsSync(killSwitch)) {
    return VARIANTS.control;
  }

  const today = new Date().toISOString().split('T')[0];
  const variant = shouldUseVariant() ? 'variant' : 'control';
  setActiveVariant(variant);
  logExperiment(today, profileId, variant);
  return VARIANTS[variant] || VARIANTS.control;
}

export function forcePromptVariant(variant) {
  if (!VARIANTS[variant]) throw new Error(`Unknown variant: ${variant}`);
  setActiveVariant(variant);
  return VARIANTS[variant];
}

export function listVariants() {
  return Object.keys(VARIANTS);
}

// CLI usage: node prompt-experiment-registry.js [control|variant|status]
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const cmd = process.argv[2] || 'status';
  if (cmd === 'status') {
    console.log('Active variant:', getActiveVariant());
    console.log('Available:', listVariants().join(', '));
  } else {
    forcePromptVariant(cmd);
    console.log('Set active variant to:', cmd);
  }
}
