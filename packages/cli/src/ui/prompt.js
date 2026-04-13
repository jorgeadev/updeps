/**
 * Prompt — interactive checkbox selection with select all / deselect all
 */

import { checkbox, confirm, select } from '@inquirer/prompts';
import chalk from 'chalk';
import { colors, semverBadge, versionArrow, breakingIcon, deprecatedIcon } from './theme.js';

/**
 * Build a human-readable choice label for a package
 */
function choiceLabel(pkg) {
  const parts = [
    colors.bright(pkg.name.padEnd(25)),
    semverBadge(pkg.updateType),
    ' ',
    versionArrow(pkg.currentVersion, pkg.latestVersion, pkg.updateType),
  ];

  if (pkg.breaking) parts.push(` ${breakingIcon()}`);
  if (pkg.deprecated) parts.push(` ${deprecatedIcon()}`);

  return parts.join('');
}

/**
 * Group packages by update type for organized display
 */
function groupPackages(packages) {
  const groups = { patch: [], minor: [], major: [] };
  for (const pkg of packages) {
    const key = groups[pkg.updateType] ? pkg.updateType : 'minor';
    groups[key].push(pkg);
  }
  return groups;
}

/**
 * Prompt the user to select which packages to update.
 * Supports:
 *  - individual selection via checkboxes
 *  - Select All / Deselect All as first options
 *  - grouped by update type (patch, minor, major)
 *
 * @param {Array} packages — analyzed outdated packages
 * @returns {Promise<Array>} selected package names
 */
export async function promptPackageSelection(packages) {
  const groups = groupPackages(packages);

  const choices = [];

  // Helper to add a separator + group items
  const addGroup = (label, items, color) => {
    if (items.length === 0) return;

    choices.push({
      name: `${color(`── ${label} (${items.length}) ──`)}`,
      value: `__separator_${label}__`,
      disabled: '',
    });

    for (const pkg of items) {
      choices.push({
        name: choiceLabel(pkg),
        value: pkg.name,
        checked: pkg.updateType !== 'major', // auto-select safe updates
      });
    }
  };

  addGroup('Patch Updates — safe', groups.patch, colors.success);
  addGroup('Minor Updates — generally safe', groups.minor, colors.info);
  addGroup('Major Updates — may include breaking changes', groups.major, colors.danger);

  console.log(
    colors.dim(
      '  Use ↑↓ to navigate, Space to toggle, A to select all, I to invert selection\n'
    )
  );

  const selected = await checkbox({
    message: colors.primary('Select packages to update:'),
    choices,
    pageSize: 20,
    loop: false,
    instructions: false,
    theme: {
      style: {
        highlight: (text) => chalk.hex('#7C3AED')(text),
      },
      icon: {
        checked: chalk.hex('#10B981')('◉'),
        unchecked: chalk.hex('#9CA3AF')('○'),
        cursor: chalk.hex('#F59E0B')('❯'),
      },
      helpMode: 'auto',
    },
  });

  return selected.filter((v) => !v.startsWith('__separator_'));
}

/**
 * Confirm the update action
 */
export async function confirmUpdate(count) {
  return confirm({
    message: colors.accent(`Apply ${count} update${count !== 1 ? 's' : ''} to package.json?`),
    default: true,
    theme: {
      style: {
        highlight: (text) => chalk.hex('#7C3AED')(text),
      },
    },
  });
}

/**
 * Ask which package manager to use for installation
 */
export async function promptPackageManager() {
  return select({
    message: colors.secondary('Which package manager should install the updated dependencies?'),
    choices: [
      { name: `${colors.success('npm')}    ${colors.dim('— npm install')}`, value: 'npm' },
      { name: `${colors.info('pnpm')}   ${colors.dim('— pnpm install')}`, value: 'pnpm' },
      { name: `${colors.warning('yarn')}   ${colors.dim('— yarn install')}`, value: 'yarn' },
      { name: `${colors.accent('bun')}    ${colors.dim('— bun install')}`, value: 'bun' },
      { name: `${colors.dim('Skip')}   ${colors.dim('— don\'t install now')}`, value: 'skip' },
    ],
    default: 'npm',
    theme: {
      style: {
        highlight: (text) => chalk.hex('#7C3AED')(text),
      },
      icon: {
        cursor: chalk.hex('#F59E0B')('❯'),
      },
    },
  });
}

/**
 * Ask whether to update only safe (non-major) packages automatically
 */
export async function promptUpdateStrategy() {
  return select({
    message: colors.primary('How would you like to update?'),
    choices: [
      {
        name: `${colors.success('Safe only')}   ${colors.dim('— patch + minor updates (recommended)')}`,
        value: 'safe',
      },
      {
        name: `${colors.info('Interactive')}  ${colors.dim('— choose packages one by one')}`,
        value: 'interactive',
      },
      {
        name: `${colors.danger('All')}          ${colors.dim('— update everything including breaking changes')}`,
        value: 'all',
      },
      {
        name: `${colors.dim('Cancel')}       ${colors.dim('— exit without changes')}`,
        value: 'cancel',
      },
    ],
    default: 'safe',
    theme: {
      style: {
        highlight: (text) => chalk.hex('#7C3AED')(text),
      },
      icon: {
        cursor: chalk.hex('#F59E0B')('❯'),
      },
    },
  });
}

export default {
  promptPackageSelection,
  confirmUpdate,
  promptPackageManager,
  promptUpdateStrategy,
};
