/**
 * Tests for updater module
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { writeFile, readFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildNewRange, applyUpdates, detectPackageManager } from '../src/updater.js';

describe('buildNewRange', () => {
  it('should preserve caret prefix', () => {
    assert.equal(buildNewRange('^1.2.3', '2.0.0'), '^2.0.0');
  });

  it('should preserve tilde prefix', () => {
    assert.equal(buildNewRange('~1.2.3', '1.3.0'), '~1.3.0');
  });

  it('should handle exact versions', () => {
    assert.equal(buildNewRange('1.2.3', '1.2.4'), '1.2.4');
  });

  it('should handle empty prefix', () => {
    assert.equal(buildNewRange('1.0.0', '2.0.0'), '2.0.0');
  });
});

describe('applyUpdates', () => {
  let testDir;

  async function setupTestDir(packageJson) {
    testDir = join(tmpdir(), `updeps-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(testDir, { recursive: true });
    await writeFile(
      join(testDir, 'package.json'),
      JSON.stringify(packageJson, null, 2) + '\n',
      'utf-8'
    );
    return testDir;
  }

  async function cleanupTestDir() {
    if (testDir) {
      await rm(testDir, { recursive: true, force: true });
    }
  }

  it('should update dependency versions', async () => {
    const dir = await setupTestDir({
      name: 'test-project',
      dependencies: {
        express: '^4.18.0',
        lodash: '^4.17.21',
      },
    });

    try {
      const { updated, changes } = await applyUpdates(dir, [
        {
          name: 'express',
          latestVersion: '5.0.0',
          depType: 'dependencies',
          currentRange: '^4.18.0',
        },
      ]);

      assert.equal(updated, 1);
      assert.equal(changes[0].to, '^5.0.0');

      const content = JSON.parse(await readFile(join(dir, 'package.json'), 'utf-8'));
      assert.equal(content.dependencies.express, '^5.0.0');
      assert.equal(content.dependencies.lodash, '^4.17.21'); // unchanged
    } finally {
      await cleanupTestDir();
    }
  });

  it('should update devDependencies', async () => {
    const dir = await setupTestDir({
      name: 'test-project',
      devDependencies: {
        jest: '~29.0.0',
      },
    });

    try {
      const { updated } = await applyUpdates(dir, [
        {
          name: 'jest',
          latestVersion: '30.0.0',
          depType: 'devDependencies',
          currentRange: '~29.0.0',
        },
      ]);

      assert.equal(updated, 1);

      const content = JSON.parse(await readFile(join(dir, 'package.json'), 'utf-8'));
      assert.equal(content.devDependencies.jest, '~30.0.0');
    } finally {
      await cleanupTestDir();
    }
  });

  it('should handle multiple updates at once', async () => {
    const dir = await setupTestDir({
      name: 'test-project',
      dependencies: {
        a: '^1.0.0',
        b: '~2.0.0',
        c: '3.0.0',
      },
    });

    try {
      const { updated } = await applyUpdates(dir, [
        { name: 'a', latestVersion: '2.0.0', depType: 'dependencies', currentRange: '^1.0.0' },
        { name: 'b', latestVersion: '2.1.0', depType: 'dependencies', currentRange: '~2.0.0' },
        { name: 'c', latestVersion: '4.0.0', depType: 'dependencies', currentRange: '3.0.0' },
      ]);

      assert.equal(updated, 3);

      const content = JSON.parse(await readFile(join(dir, 'package.json'), 'utf-8'));
      assert.equal(content.dependencies.a, '^2.0.0');
      assert.equal(content.dependencies.b, '~2.1.0');
      assert.equal(content.dependencies.c, '4.0.0');
    } finally {
      await cleanupTestDir();
    }
  });
});

describe('detectPackageManager', () => {
  let testDir;

  async function setupDetectDir(lockfile) {
    testDir = join(tmpdir(), `updeps-detect-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(testDir, { recursive: true });
    if (lockfile) {
      await writeFile(join(testDir, lockfile), '', 'utf-8');
    }
    return testDir;
  }

  async function cleanupDir() {
    if (testDir) {
      await rm(testDir, { recursive: true, force: true });
    }
  }

  it('should detect npm', async () => {
    const dir = await setupDetectDir('package-lock.json');
    try {
      const result = await detectPackageManager(dir);
      assert.equal(result, 'npm');
    } finally {
      await cleanupDir();
    }
  });

  it('should detect pnpm', async () => {
    const dir = await setupDetectDir('pnpm-lock.yaml');
    try {
      const result = await detectPackageManager(dir);
      assert.equal(result, 'pnpm');
    } finally {
      await cleanupDir();
    }
  });

  it('should detect yarn', async () => {
    const dir = await setupDetectDir('yarn.lock');
    try {
      const result = await detectPackageManager(dir);
      assert.equal(result, 'yarn');
    } finally {
      await cleanupDir();
    }
  });

  it('should detect bun', async () => {
    const dir = await setupDetectDir('bun.lockb');
    try {
      const result = await detectPackageManager(dir);
      assert.equal(result, 'bun');
    } finally {
      await cleanupDir();
    }
  });

  it('should default to npm when no lockfile found', async () => {
    const dir = await setupDetectDir(null);
    try {
      const result = await detectPackageManager(dir);
      assert.equal(result, 'npm');
    } finally {
      await cleanupDir();
    }
  });
});
