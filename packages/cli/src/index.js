/**
 * updeps — The ultimate interactive npm dependency updater
 *
 * Main module export for programmatic use.
 */

export { readPackageJson, extractDependencies, analyzeOutdated, computeStats } from './analyzer.js';
export { fetchPackageMetadata, getLatestVersionInfo, batchFetchMetadata } from './registry.js';
export { applyUpdates, detectPackageManager, runInstall, buildNewRange } from './updater.js';
export { run } from './cli.js';
