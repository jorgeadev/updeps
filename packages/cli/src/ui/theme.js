/**
 * Theme — vibrant color palette and styling utilities for the CLI
 */

import chalk from 'chalk';

// ── Color Palette ──────────────────────────────────────────────
export const colors = {
  // Brand
  primary: chalk.hex('#7C3AED'),       // vivid purple
  secondary: chalk.hex('#06B6D4'),     // cyan
  accent: chalk.hex('#F59E0B'),        // amber

  // Status
  success: chalk.hex('#10B981'),       // emerald green
  warning: chalk.hex('#F97316'),       // orange
  danger: chalk.hex('#EF4444'),        // red
  info: chalk.hex('#3B82F6'),          // blue

  // Semver badges
  patch: chalk.bgHex('#10B981').hex('#FFFFFF').bold,
  minor: chalk.bgHex('#3B82F6').hex('#FFFFFF').bold,
  major: chalk.bgHex('#EF4444').hex('#FFFFFF').bold,
  prerelease: chalk.bgHex('#8B5CF6').hex('#FFFFFF').bold,

  // Text
  dim: chalk.gray,
  muted: chalk.hex('#9CA3AF'),
  bright: chalk.whiteBright.bold,
  link: chalk.hex('#60A5FA').underline,

  // Dep type badges
  dep: chalk.bgHex('#1E40AF').hex('#FFFFFF').bold,
  devDep: chalk.bgHex('#7C3AED').hex('#FFFFFF').bold,
  peerDep: chalk.bgHex('#0891B2').hex('#FFFFFF').bold,
  optionalDep: chalk.bgHex('#CA8A04').hex('#FFFFFF').bold,
};

// ── Semantic Helpers ───────────────────────────────────────────

export function semverBadge(type) {
  const labels = {
    patch: ' PATCH ',
    minor: ' MINOR ',
    major: ' MAJOR ',
    prerelease: ' PRE ',
  };
  const colorFn = colors[type] || colors.info;
  return colorFn(labels[type] || ` ${type.toUpperCase()} `);
}

export function depTypeBadge(type) {
  const map = {
    dependencies: { label: ' PROD ', color: colors.dep },
    devDependencies: { label: ' DEV ', color: colors.devDep },
    peerDependencies: { label: ' PEER ', color: colors.peerDep },
    optionalDependencies: { label: ' OPT ', color: colors.optionalDep },
  };
  const entry = map[type] || { label: ` ${type} `, color: colors.info };
  return entry.color(entry.label);
}

export function versionArrow(current, latest, type) {
  const arrow = colors.dim(' → ');
  const colorFn =
    type === 'major' ? colors.danger :
    type === 'minor' ? colors.info :
    colors.success;

  return `${colors.muted(current)}${arrow}${colorFn(latest)}`;
}

export function breakingIcon() {
  return colors.danger('⚠ BREAKING');
}

export function deprecatedIcon() {
  return colors.warning('⊘ DEPRECATED');
}

export function healthBar(score) {
  const filled = Math.round(score / 10);
  const empty = 10 - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  if (score >= 70) return colors.success(bar);
  if (score >= 40) return colors.warning(bar);
  return colors.danger(bar);
}

export function sectionHeader(title) {
  const line = '─'.repeat(60);
  return `\n${colors.primary(line)}\n${colors.bright(`  ${title}`)}\n${colors.primary(line)}`;
}

export function formatCount(count, label) {
  if (count === 0) return colors.dim(`${count} ${label}`);
  return colors.accent(`${count} ${label}`);
}

export default {
  colors,
  semverBadge,
  depTypeBadge,
  versionArrow,
  breakingIcon,
  deprecatedIcon,
  healthBar,
  sectionHeader,
  formatCount,
};
