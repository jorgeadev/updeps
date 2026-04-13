/**
 * Analyzer — analyzes package.json dependencies and determines update info
 *
 * Reads the project's package.json, compares installed versions against the
 * npm registry, categorizes updates by semver level, and scores package health.
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import semver from 'semver';

const DEP_TYPES = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
];

/**
 * Read and parse the project's package.json
 *
 * @param {string} cwd — working directory
 * @returns {Promise<Object>}
 */
export async function readPackageJson(cwd) {
  const filePath = resolve(cwd, 'package.json');
  const content = await readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Extract all dependency entries from package.json
 *
 * @param {Object} packageJson
 * @param {Object} filter — { dev, prod, peer, optional }
 * @returns {Array<{name, currentRange, depType}>}
 */
export function extractDependencies(packageJson, filter = {}) {
  const entries = [];

  for (const depType of DEP_TYPES) {
    // Apply filters
    if (filter.prod && depType !== 'dependencies') continue;
    if (filter.dev && depType !== 'devDependencies') continue;

    const deps = packageJson[depType];
    if (!deps) continue;

    for (const [name, range] of Object.entries(deps)) {
      entries.push({ name, currentRange: range, depType });
    }
  }

  return entries;
}

/**
 * Parse a semver range to extract the pinned/minimum version
 */
export function parseCurrentVersion(range) {
  if (!range) return null;

  // Handle workspace, link, file, git protocols
  if (/^(workspace:|link:|file:|git[+:]|https?:)/.test(range)) {
    return null;
  }

  // Remove range operators to find base version
  const cleaned = range.replace(/^[\^~>=<|& ]+/, '').split(' ')[0];
  const parsed = semver.valid(semver.coerce(cleaned));
  return parsed;
}

/**
 * Determine the update type by comparing current and latest versions
 */
export function getUpdateType(currentVersion, latestVersion) {
  if (!currentVersion || !latestVersion) return null;

  const current = semver.parse(currentVersion);
  const latest = semver.parse(latestVersion);

  if (!current || !latest) return null;

  if (semver.eq(currentVersion, latestVersion)) return null; // up-to-date
  if (semver.gt(currentVersion, latestVersion)) return null; // newer than registry

  if (latest.major > current.major) return 'major';
  if (latest.minor > current.minor) return 'minor';
  if (latest.patch > current.patch) return 'patch';

  // Pre-release differences
  if (latest.prerelease.length > 0 || current.prerelease.length > 0) {
    return 'prerelease';
  }

  return 'patch';
}

/**
 * Detect if a major update likely has breaking changes.
 * Heuristic: any major version bump is assumed to have breaking changes.
 * We also check the registry data for deprecation.
 */
export function detectBreakingChanges(currentVersion, latestVersion, registryData) {
  const updateType = getUpdateType(currentVersion, latestVersion);

  if (updateType !== 'major') return { breaking: false, details: null };

  const currentMajor = semver.major(currentVersion);
  const latestMajor = semver.major(latestVersion);
  const majorJump = latestMajor - currentMajor;

  let details = `Major version jump: ${currentMajor} → ${latestMajor}`;

  if (majorJump > 1) {
    details += ` (${majorJump} major versions behind!)`;
  }

  // Check keywords or description for hints about migration
  const keywords = registryData?.keywords || [];
  if (keywords.some(k => /breaking|migration|rewrite/.test(k))) {
    details += ' — migration guide may be available';
  }

  return { breaking: true, details };
}

/**
 * Compute a "health score" for a package based on available signals.
 * Score from 0-100.
 */
export function computeHealthScore(registryData) {
  if (!registryData) return 0;

  let score = 50; // baseline

  // Has description
  if (registryData.description) score += 5;

  // Has homepage
  if (registryData.homepage) score += 5;

  // Has repository
  if (registryData.repository) score += 5;

  // Has multiple maintainers
  if (registryData.maintainers?.length > 1) score += 10;

  // Has recent release (within last 6 months)
  const latestTime = registryData.time?.[registryData.latestVersion];
  if (latestTime) {
    const age = Date.now() - new Date(latestTime).getTime();
    const sixMonths = 180 * 24 * 60 * 60 * 1000;
    if (age < sixMonths) score += 15;
    else if (age < sixMonths * 2) score += 10;
    else if (age < sixMonths * 4) score += 5;
  }

  // Has license
  if (registryData.license && registryData.license !== 'Unknown') score += 5;

  // Not deprecated
  if (registryData.deprecated) score -= 30;

  // Has multiple versions (mature package)
  if (registryData.allVersions?.length > 10) score += 5;

  return Math.max(0, Math.min(100, score));
}

/**
 * Analyze all dependencies and produce an array of outdated package info.
 *
 * @param {Array} deps — from extractDependencies
 * @param {Map} registryMap — from batchFetchMetadata
 * @param {Object} options — { includePrerelease }
 * @returns {Array<Object>} outdated packages
 */
export function analyzeOutdated(deps, registryMap, options = {}) {
  const outdated = [];

  for (const dep of deps) {
    const currentVersion = parseCurrentVersion(dep.currentRange);
    if (!currentVersion) continue; // skip non-semver ranges

    const registryData = registryMap.get(dep.name);
    if (!registryData) continue; // not found or private

    const { latestVersion } = registryData;
    const updateType = getUpdateType(currentVersion, latestVersion);

    if (!updateType) continue; // already up-to-date

    // Skip pre-releases unless opted in
    if (updateType === 'prerelease' && !options.includePrerelease) continue;

    const { breaking, details: breakingDetails } = detectBreakingChanges(
      currentVersion,
      latestVersion,
      registryData
    );

    const healthScore = computeHealthScore(registryData);

    outdated.push({
      name: dep.name,
      currentRange: dep.currentRange,
      currentVersion,
      latestVersion,
      updateType,
      depType: dep.depType,
      description: registryData.description,
      homepage: registryData.homepage,
      deprecated: !!registryData.deprecated,
      deprecationMessage: registryData.deprecationMessage,
      breaking,
      breakingDetails,
      healthScore,
      license: registryData.license,
    });
  }

  // Sort: major first (most attention needed), then minor, then patch
  const order = { major: 0, minor: 1, patch: 2, prerelease: 3 };
  outdated.sort((a, b) => {
    const typeOrder = (order[a.updateType] ?? 99) - (order[b.updateType] ?? 99);
    if (typeOrder !== 0) return typeOrder;
    return a.name.localeCompare(b.name);
  });

  return outdated;
}

/**
 * Compute summary statistics from the analyzed packages
 */
export function computeStats(allDeps, outdated) {
  return {
    total: allDeps.length,
    outdated: outdated.length,
    patch: outdated.filter((p) => p.updateType === 'patch').length,
    minor: outdated.filter((p) => p.updateType === 'minor').length,
    major: outdated.filter((p) => p.updateType === 'major').length,
    deprecated: outdated.filter((p) => p.deprecated).length,
    breaking: outdated.filter((p) => p.breaking).length,
  };
}

export default {
  readPackageJson,
  extractDependencies,
  parseCurrentVersion,
  getUpdateType,
  detectBreakingChanges,
  computeHealthScore,
  analyzeOutdated,
  computeStats,
};
