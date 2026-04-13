/**
 * Tests for analyzer module
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseCurrentVersion,
  getUpdateType,
  detectBreakingChanges,
  computeHealthScore,
  extractDependencies,
  analyzeOutdated,
  computeStats,
} from '../src/analyzer.js';

describe('parseCurrentVersion', () => {
  it('should parse caret ranges', () => {
    assert.equal(parseCurrentVersion('^1.2.3'), '1.2.3');
  });

  it('should parse tilde ranges', () => {
    assert.equal(parseCurrentVersion('~1.2.3'), '1.2.3');
  });

  it('should parse exact versions', () => {
    assert.equal(parseCurrentVersion('1.2.3'), '1.2.3');
  });

  it('should parse gte ranges', () => {
    assert.equal(parseCurrentVersion('>=1.2.3'), '1.2.3');
  });

  it('should return null for workspace protocol', () => {
    assert.equal(parseCurrentVersion('workspace:*'), null);
  });

  it('should return null for file protocol', () => {
    assert.equal(parseCurrentVersion('file:../local-pkg'), null);
  });

  it('should return null for git protocol', () => {
    assert.equal(parseCurrentVersion('git+https://github.com/user/repo.git'), null);
  });

  it('should return null for link protocol', () => {
    assert.equal(parseCurrentVersion('link:../local-pkg'), null);
  });

  it('should return null for https protocol', () => {
    assert.equal(parseCurrentVersion('https://github.com/user/repo/tarball/main'), null);
  });

  it('should handle versions with prerelease tags', () => {
    const result = parseCurrentVersion('^2.0.0-beta.1');
    assert.equal(result, '2.0.0');
  });
});

describe('getUpdateType', () => {
  it('should return "major" for major version bumps', () => {
    assert.equal(getUpdateType('1.2.3', '2.0.0'), 'major');
  });

  it('should return "minor" for minor version bumps', () => {
    assert.equal(getUpdateType('1.2.3', '1.3.0'), 'minor');
  });

  it('should return "patch" for patch version bumps', () => {
    assert.equal(getUpdateType('1.2.3', '1.2.4'), 'patch');
  });

  it('should return null when versions are equal', () => {
    assert.equal(getUpdateType('1.2.3', '1.2.3'), null);
  });

  it('should return null when current is newer', () => {
    assert.equal(getUpdateType('2.0.0', '1.0.0'), null);
  });

  it('should return null for invalid versions', () => {
    assert.equal(getUpdateType(null, '1.0.0'), null);
    assert.equal(getUpdateType('1.0.0', null), null);
  });

  it('should handle multi-major jumps', () => {
    assert.equal(getUpdateType('1.0.0', '5.0.0'), 'major');
  });
});

describe('detectBreakingChanges', () => {
  it('should detect breaking changes on major updates', () => {
    const result = detectBreakingChanges('1.0.0', '2.0.0', {});
    assert.equal(result.breaking, true);
    assert.ok(result.details.includes('1 → 2'));
  });

  it('should not flag breaking changes for minor updates', () => {
    const result = detectBreakingChanges('1.0.0', '1.1.0', {});
    assert.equal(result.breaking, false);
  });

  it('should note multi-major jumps', () => {
    const result = detectBreakingChanges('1.0.0', '4.0.0', {});
    assert.equal(result.breaking, true);
    assert.ok(result.details.includes('3 major versions behind'));
  });

  it('should note migration keywords', () => {
    const result = detectBreakingChanges('1.0.0', '2.0.0', {
      keywords: ['breaking', 'migration'],
    });
    assert.ok(result.details.includes('migration'));
  });
});

describe('computeHealthScore', () => {
  it('should return 0 for null data', () => {
    assert.equal(computeHealthScore(null), 0);
  });

  it('should return baseline 50 for minimal data', () => {
    assert.equal(computeHealthScore({}), 50);
  });

  it('should increase score for good signals', () => {
    const score = computeHealthScore({
      description: 'A great package',
      homepage: 'https://example.com',
      repository: { url: 'https://github.com/test/test' },
      license: 'MIT',
      maintainers: [{ name: 'a' }, { name: 'b' }],
      latestVersion: '1.0.0',
      time: { '1.0.0': new Date().toISOString() },
      allVersions: Array.from({ length: 20 }, (_, i) => `1.0.${i}`),
    });
    assert.ok(score > 80, `Expected score > 80, got ${score}`);
  });

  it('should decrease score for deprecated packages', () => {
    const score = computeHealthScore({ deprecated: true });
    assert.ok(score < 50, `Expected score < 50, got ${score}`);
  });

  it('should cap at 100', () => {
    const score = computeHealthScore({
      description: 'A package',
      homepage: 'https://example.com',
      repository: { url: 'https://github.com/test/test' },
      license: 'MIT',
      maintainers: [{ name: 'a' }, { name: 'b' }, { name: 'c' }],
      latestVersion: '1.0.0',
      time: { '1.0.0': new Date().toISOString() },
      allVersions: Array.from({ length: 100 }, (_, i) => `1.0.${i}`),
    });
    assert.ok(score <= 100, `Expected score <= 100, got ${score}`);
  });
});

describe('extractDependencies', () => {
  const mockPkg = {
    dependencies: { express: '^4.18.0', lodash: '^4.17.21' },
    devDependencies: { jest: '^29.0.0' },
    peerDependencies: { react: '>=17.0.0' },
  };

  it('should extract all dependency types', () => {
    const deps = extractDependencies(mockPkg);
    assert.equal(deps.length, 4);
  });

  it('should filter to prod only', () => {
    const deps = extractDependencies(mockPkg, { prod: true });
    assert.equal(deps.length, 2);
    assert.ok(deps.every((d) => d.depType === 'dependencies'));
  });

  it('should filter to dev only', () => {
    const deps = extractDependencies(mockPkg, { dev: true });
    assert.equal(deps.length, 1);
    assert.equal(deps[0].name, 'jest');
  });

  it('should handle empty package.json', () => {
    const deps = extractDependencies({});
    assert.equal(deps.length, 0);
  });
});

describe('analyzeOutdated', () => {
  it('should identify outdated packages', () => {
    const deps = [
      { name: 'foo', currentRange: '^1.0.0', depType: 'dependencies' },
      { name: 'bar', currentRange: '^2.0.0', depType: 'devDependencies' },
    ];

    const registryMap = new Map([
      ['foo', {
        latestVersion: '2.0.0',
        description: 'Foo lib',
        homepage: '',
        deprecated: false,
        deprecationMessage: null,
        license: 'MIT',
        allVersions: ['1.0.0', '2.0.0'],
        keywords: [],
        maintainers: [],
        time: {},
      }],
      ['bar', {
        latestVersion: '2.0.0',
        description: 'Bar lib',
        homepage: '',
        deprecated: false,
        deprecationMessage: null,
        license: 'MIT',
        allVersions: ['2.0.0'],
        keywords: [],
        maintainers: [],
        time: {},
      }],
    ]);

    const outdated = analyzeOutdated(deps, registryMap);
    assert.equal(outdated.length, 1);
    assert.equal(outdated[0].name, 'foo');
    assert.equal(outdated[0].updateType, 'major');
  });

  it('should sort by update severity', () => {
    const deps = [
      { name: 'a-patch', currentRange: '^1.0.0', depType: 'dependencies' },
      { name: 'b-major', currentRange: '^1.0.0', depType: 'dependencies' },
      { name: 'c-minor', currentRange: '^1.0.0', depType: 'dependencies' },
    ];

    const registryMap = new Map([
      ['a-patch', { latestVersion: '1.0.1', description: '', homepage: '', deprecated: false, deprecationMessage: null, license: 'MIT', allVersions: ['1.0.0', '1.0.1'], keywords: [], maintainers: [], time: {} }],
      ['b-major', { latestVersion: '2.0.0', description: '', homepage: '', deprecated: false, deprecationMessage: null, license: 'MIT', allVersions: ['1.0.0', '2.0.0'], keywords: [], maintainers: [], time: {} }],
      ['c-minor', { latestVersion: '1.1.0', description: '', homepage: '', deprecated: false, deprecationMessage: null, license: 'MIT', allVersions: ['1.0.0', '1.1.0'], keywords: [], maintainers: [], time: {} }],
    ]);

    const outdated = analyzeOutdated(deps, registryMap);
    assert.equal(outdated[0].updateType, 'major');
    assert.equal(outdated[1].updateType, 'minor');
    assert.equal(outdated[2].updateType, 'patch');
  });

  it('should handle missing registry data', () => {
    const deps = [
      { name: 'missing', currentRange: '^1.0.0', depType: 'dependencies' },
    ];
    const registryMap = new Map([['missing', null]]);
    const outdated = analyzeOutdated(deps, registryMap);
    assert.equal(outdated.length, 0);
  });
});

describe('computeStats', () => {
  it('should compute correct statistics', () => {
    const allDeps = [
      { name: 'a' },
      { name: 'b' },
      { name: 'c' },
      { name: 'd' },
    ];
    const outdated = [
      { updateType: 'patch', deprecated: false, breaking: false },
      { updateType: 'minor', deprecated: false, breaking: false },
      { updateType: 'major', deprecated: true, breaking: true },
    ];

    const stats = computeStats(allDeps, outdated);
    assert.equal(stats.total, 4);
    assert.equal(stats.outdated, 3);
    assert.equal(stats.patch, 1);
    assert.equal(stats.minor, 1);
    assert.equal(stats.major, 1);
    assert.equal(stats.deprecated, 1);
    assert.equal(stats.breaking, 1);
  });
});
