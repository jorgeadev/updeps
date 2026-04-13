/**
 * Updater — applies selected updates to package.json and runs install
 */

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/**
 * Build the new version range preserving the original prefix style.
 *
 * Examples:
 *   "^1.2.3" + "2.0.0" → "^2.0.0"
 *   "~1.2.3" + "1.3.0" → "~1.3.0"
 *   "1.2.3"  + "1.2.4" → "1.2.4"
 */
export function buildNewRange(originalRange, newVersion) {
  const match = originalRange.match(/^([~^]?)/);
  const prefix = match ? match[1] : '';
  return `${prefix}${newVersion}`;
}

/**
 * Apply selected updates to the project's package.json
 *
 * @param {string} cwd — working directory
 * @param {Array} selectedPackages — packages to update (with name, latestVersion, depType, currentRange)
 * @returns {Promise<{updated: number, changes: Array}>}
 */
export async function applyUpdates(cwd, selectedPackages) {
  const filePath = resolve(cwd, 'package.json');
  const rawContent = await readFile(filePath, 'utf-8');

  // Detect indentation style
  const indentMatch = rawContent.match(/^(\s+)"/m);
  const indent = indentMatch ? indentMatch[1] : '  ';

  const packageJson = JSON.parse(rawContent);
  const changes = [];

  for (const pkg of selectedPackages) {
    const section = packageJson[pkg.depType];
    if (!section || !(pkg.name in section)) continue;

    const oldRange = section[pkg.name];
    const newRange = buildNewRange(oldRange, pkg.latestVersion);

    section[pkg.name] = newRange;

    changes.push({
      name: pkg.name,
      depType: pkg.depType,
      from: oldRange,
      to: newRange,
    });
  }

  // Detect trailing newline
  const trailingNewline = rawContent.endsWith('\n') ? '\n' : '';

  const newContent = JSON.stringify(packageJson, null, indent) + trailingNewline;
  await writeFile(filePath, newContent, 'utf-8');

  return { updated: changes.length, changes };
}

/**
 * Detect which package manager the project uses
 */
export async function detectPackageManager(cwd) {
  const checks = [
    { file: 'pnpm-lock.yaml', manager: 'pnpm' },
    { file: 'yarn.lock', manager: 'yarn' },
    { file: 'bun.lockb', manager: 'bun' },
    { file: 'bun.lock', manager: 'bun' },
    { file: 'package-lock.json', manager: 'npm' },
  ];

  for (const { file, manager } of checks) {
    try {
      await readFile(resolve(cwd, file));
      return manager;
    } catch {
      // file not found, try next
    }
  }

  return 'npm'; // default
}

/**
 * Run the package manager install command
 *
 * @param {string} cwd
 * @param {string} manager — npm | pnpm | yarn | bun
 * @returns {Promise<{success: boolean, output: string}>}
 */
export async function runInstall(cwd, manager) {
  const commands = {
    npm: ['npm', ['install']],
    pnpm: ['pnpm', ['install']],
    yarn: ['yarn', ['install']],
    bun: ['bun', ['install']],
  };

  const [cmd, args] = commands[manager] || commands.npm;

  try {
    const { stdout, stderr } = await execFileAsync(cmd, args, {
      cwd,
      timeout: 120_000,
    });
    return { success: true, output: stdout || stderr };
  } catch (err) {
    return { success: false, output: err.stderr || err.message };
  }
}

export default {
  buildNewRange,
  applyUpdates,
  detectPackageManager,
  runInstall,
};
