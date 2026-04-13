/**
 * Table — colorful table rendering for outdated dependencies
 */

import Table from 'cli-table3';
import chalk from 'chalk';
import {
  colors,
  semverBadge,
  depTypeBadge,
  versionArrow,
  breakingIcon,
  deprecatedIcon,
  healthBar,
  sectionHeader,
} from './theme.js';

/**
 * Render the main outdated-dependencies table
 * @param {Array} packages — analyzed package objects
 */
export function renderOutdatedTable(packages) {
  if (packages.length === 0) return;

  console.log(sectionHeader('Outdated Dependencies'));

  const table = new Table({
    head: [
      colors.bright('#'),
      colors.bright('Package'),
      colors.bright('Type'),
      colors.bright('Update'),
      colors.bright('Version'),
      colors.bright('Health'),
      colors.bright('Notes'),
    ],
    style: {
      head: [],
      border: ['gray'],
    },
    colWidths: [5, 28, 8, 9, 22, 14, 30],
    wordWrap: true,
  });

  packages.forEach((pkg, idx) => {
    const notes = [];
    if (pkg.breaking) notes.push(breakingIcon());
    if (pkg.deprecated) notes.push(deprecatedIcon());
    if (pkg.description) {
      const desc = pkg.description.length > 24
        ? pkg.description.slice(0, 24) + '…'
        : pkg.description;
      notes.push(colors.dim(desc));
    }

    table.push([
      colors.dim(String(idx + 1)),
      colors.bright(pkg.name),
      depTypeBadge(pkg.depType),
      semverBadge(pkg.updateType),
      versionArrow(pkg.currentVersion, pkg.latestVersion, pkg.updateType),
      healthBar(pkg.healthScore),
      notes.join(' ') || colors.dim('—'),
    ]);
  });

  console.log(table.toString());
  console.log('');
}

/**
 * Render a compact summary line for --check mode
 */
export function renderCheckSummary(packages) {
  if (packages.length === 0) return;

  const majors = packages.filter((p) => p.updateType === 'major');
  const minors = packages.filter((p) => p.updateType === 'minor');
  const patches = packages.filter((p) => p.updateType === 'patch');

  const parts = [];
  if (patches.length) parts.push(colors.success(`${patches.length} patch`));
  if (minors.length) parts.push(colors.info(`${minors.length} minor`));
  if (majors.length) parts.push(colors.danger(`${majors.length} major`));

  console.log(`\n  ${colors.bright('Updates available:')} ${parts.join(colors.dim(' · '))}\n`);
}

/**
 * Render details panel for a single package (used in interactive mode)
 */
export function renderPackageDetail(pkg) {
  const divider = colors.dim('─'.repeat(50));

  console.log(`\n${divider}`);
  console.log(`  ${colors.bright(pkg.name)} ${semverBadge(pkg.updateType)}`);
  console.log(`  ${versionArrow(pkg.currentVersion, pkg.latestVersion, pkg.updateType)}`);
  console.log(`  ${depTypeBadge(pkg.depType)}`);
  console.log('');

  if (pkg.description) {
    console.log(`  ${colors.muted('Description:')} ${pkg.description}`);
  }

  if (pkg.homepage) {
    console.log(`  ${colors.muted('Homepage:')}    ${colors.link(pkg.homepage)}`);
  }

  if (pkg.breaking) {
    console.log(`\n  ${breakingIcon()}`);
    console.log(`  ${colors.danger('This update includes breaking changes.')}`);
    if (pkg.breakingDetails) {
      console.log(`  ${colors.warning(pkg.breakingDetails)}`);
    }
  }

  if (pkg.deprecated) {
    console.log(`\n  ${deprecatedIcon()}`);
    console.log(`  ${colors.warning(pkg.deprecationMessage || 'This package is deprecated.')}`);
  }

  console.log(`  ${colors.muted('Health:')} ${healthBar(pkg.healthScore)}`);
  console.log(divider);
}

/**
 * Render a JSON output for --json mode
 */
export function renderJSON(packages) {
  const output = packages.map((pkg) => ({
    name: pkg.name,
    currentVersion: pkg.currentVersion,
    latestVersion: pkg.latestVersion,
    updateType: pkg.updateType,
    depType: pkg.depType,
    breaking: pkg.breaking,
    deprecated: pkg.deprecated,
    description: pkg.description || null,
    healthScore: pkg.healthScore,
  }));
  console.log(JSON.stringify(output, null, 2));
}

export default {
  renderOutdatedTable,
  renderCheckSummary,
  renderPackageDetail,
  renderJSON,
};
