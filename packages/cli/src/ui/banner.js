/**
 * Banner — ASCII art header, summary boxes, and farewell messages
 */

import chalk from 'chalk';
import boxen from 'boxen';
import gradientString from 'gradient-string';
import { colors, formatCount } from './theme.js';

const LOGO = `
 ██╗   ██╗██████╗ ██████╗ ███████╗██████╗ ███████╗
 ██║   ██║██╔══██╗██╔══██╗██╔════╝██╔══██╗██╔════╝
 ██║   ██║██████╔╝██║  ██║█████╗  ██████╔╝███████╗
 ██║   ██║██╔═══╝ ██║  ██║██╔══╝  ██╔═══╝ ╚════██║
 ╚██████╔╝██║     ██████╔╝███████╗██║     ███████║
  ╚═════╝ ╚═╝     ╚═════╝ ╚══════╝╚═╝     ╚══════╝`;

const gradient = gradientString(['#7C3AED', '#06B6D4', '#10B981']);

export function showBanner() {
  console.log(gradient(LOGO));
  console.log(
    chalk.gray('  The ultimate interactive dependency updater\n')
  );
}

export function showSummaryBox(stats) {
  const lines = [
    `${colors.bright('Scan Results')}`,
    '',
    `  📦  Total packages scanned:  ${colors.accent(String(stats.total))}`,
    `  🔄  Outdated packages:       ${formatCount(stats.outdated, '')}`,
    '',
  ];

  if (stats.outdated > 0) {
    lines.push(
      `  ${colors.success('●')} Patch updates:   ${formatCount(stats.patch, '')}`,
      `  ${colors.info('●')} Minor updates:   ${formatCount(stats.minor, '')}`,
      `  ${colors.danger('●')} Major updates:   ${formatCount(stats.major, '')}`,
    );

    if (stats.deprecated > 0) {
      lines.push(`  ${colors.warning('●')} Deprecated:      ${formatCount(stats.deprecated, '')}`);
    }
    if (stats.breaking > 0) {
      lines.push(`  ${colors.danger('⚠')} Breaking changes: ${formatCount(stats.breaking, '')}`);
    }
  }

  console.log(
    boxen(lines.join('\n'), {
      padding: 1,
      margin: { top: 0, bottom: 1, left: 2, right: 2 },
      borderColor: '#7C3AED',
      borderStyle: 'round',
    })
  );
}

export function showCompletionBox(updated, skipped) {
  const lines = [
    `${colors.success('✔')} ${colors.bright('Update Complete!')}`,
    '',
    `  Updated:  ${colors.success(String(updated))} packages`,
    `  Skipped:  ${colors.dim(String(skipped))} packages`,
    '',
    colors.dim('  Run your tests to ensure everything works.'),
    colors.dim('  Happy coding! 🎉'),
  ];

  console.log(
    boxen(lines.join('\n'), {
      padding: 1,
      margin: { top: 1, bottom: 1, left: 2, right: 2 },
      borderColor: '#10B981',
      borderStyle: 'round',
    })
  );
}

export function showNothingToUpdate() {
  const lines = [
    `${colors.success('✔')} ${colors.bright('All packages are up to date!')}`,
    '',
    colors.dim('  Your dependencies are fresh and healthy.'),
    colors.dim('  Nothing to update. 🎉'),
  ];

  console.log(
    boxen(lines.join('\n'), {
      padding: 1,
      margin: { top: 0, bottom: 1, left: 2, right: 2 },
      borderColor: '#10B981',
      borderStyle: 'round',
    })
  );
}

export function showErrorBox(message) {
  const lines = [
    `${colors.danger('✖')} ${colors.bright('Error')}`,
    '',
    `  ${colors.danger(message)}`,
  ];

  console.log(
    boxen(lines.join('\n'), {
      padding: 1,
      margin: { top: 0, bottom: 1, left: 2, right: 2 },
      borderColor: '#EF4444',
      borderStyle: 'round',
    })
  );
}

export default {
  showBanner,
  showSummaryBox,
  showCompletionBox,
  showNothingToUpdate,
  showErrorBox,
};
