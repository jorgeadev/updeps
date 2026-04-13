/**
 * Spinner — themed loading spinners for async operations
 */

import ora from 'ora';
import { colors } from './theme.js';

const SPINNER_STYLE = 'dots12';

export function createSpinner(text) {
  return ora({
    text: colors.secondary(text),
    spinner: SPINNER_STYLE,
    color: 'cyan',
  });
}

export function scanningSpinner() {
  return createSpinner('Scanning package.json for dependencies...');
}

export function fetchingSpinner(current, total) {
  return createSpinner(
    `Fetching registry data... (${current}/${total})`
  );
}

export function updatingSpinner() {
  return createSpinner('Applying updates to package.json...');
}

export function installingSpinner(manager) {
  return createSpinner(`Installing dependencies with ${manager}...`);
}

export default {
  createSpinner,
  scanningSpinner,
  fetchingSpinner,
  updatingSpinner,
  installingSpinner,
};
