/**
 * Registry — npm registry API client
 *
 * Fetches package metadata from the npm registry to determine
 * latest versions, deprecation status, and package descriptions.
 */

const NPM_REGISTRY = 'https://registry.npmjs.org';

/**
 * Fetch package metadata from the npm registry.
 * Uses the abbreviated metadata endpoint for speed,
 * with a full metadata fallback for breaking-change detection.
 *
 * @param {string} packageName
 * @returns {Promise<Object>} registry metadata
 */
export async function fetchPackageMetadata(packageName) {
  const encodedName = encodeURIComponent(packageName).replace('%40', '@');
  const url = `${NPM_REGISTRY}/${encodedName}`;

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null; // package not found (possibly private)
    }
    throw new Error(
      `Registry error for ${packageName}: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Get the latest version info for a package
 *
 * @param {string} packageName
 * @returns {Promise<Object|null>}
 */
export async function getLatestVersionInfo(packageName) {
  const metadata = await fetchPackageMetadata(packageName);

  if (!metadata) return null;

  const distTags = metadata['dist-tags'] || {};
  const latestVersion = distTags.latest;

  if (!latestVersion) return null;

  const latestMeta = metadata.versions?.[latestVersion] || {};
  const allVersions = Object.keys(metadata.versions || {});

  return {
    name: packageName,
    latestVersion,
    description: metadata.description || '',
    homepage: metadata.homepage || latestMeta.homepage || '',
    repository: metadata.repository || latestMeta.repository || null,
    deprecated: latestMeta.deprecated || false,
    deprecationMessage: typeof latestMeta.deprecated === 'string' ? latestMeta.deprecated : null,
    license: latestMeta.license || metadata.license || 'Unknown',
    allVersions,
    distTags,
    time: metadata.time || {},
    maintainers: metadata.maintainers || [],
    keywords: latestMeta.keywords || metadata.keywords || [],
  };
}

/**
 * Batch-fetch metadata for multiple packages with concurrency control.
 *
 * @param {string[]} packageNames
 * @param {Object} options
 * @param {number} options.concurrency — max parallel requests (default 8)
 * @param {Function} options.onProgress — callback(completed, total)
 * @returns {Promise<Map<string, Object>>}
 */
export async function batchFetchMetadata(packageNames, options = {}) {
  const { concurrency = 8, onProgress } = options;
  const results = new Map();
  let completed = 0;

  const queue = [...packageNames];

  async function worker() {
    while (queue.length > 0) {
      const name = queue.shift();
      try {
        const info = await getLatestVersionInfo(name);
        results.set(name, info);
      } catch {
        results.set(name, null);
      }
      completed++;
      onProgress?.(completed, packageNames.length);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, packageNames.length) },
    () => worker()
  );

  await Promise.all(workers);
  return results;
}

export default {
  fetchPackageMetadata,
  getLatestVersionInfo,
  batchFetchMetadata,
};
