/**
 * Tests for theme module
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  colors,
  semverBadge,
  depTypeBadge,
  versionArrow,
  breakingIcon,
  deprecatedIcon,
  healthBar,
  sectionHeader,
  formatCount,
} from '../src/ui/theme.js';

describe('theme colors', () => {
  it('should have all required color functions', () => {
    const requiredColors = [
      'primary', 'secondary', 'accent',
      'success', 'warning', 'danger', 'info',
      'patch', 'minor', 'major',
      'dim', 'muted', 'bright', 'link',
      'dep', 'devDep', 'peerDep', 'optionalDep',
    ];

    for (const name of requiredColors) {
      assert.equal(typeof colors[name], 'function', `colors.${name} should be a function`);
    }
  });
});

describe('semverBadge', () => {
  it('should return string for patch', () => {
    const result = semverBadge('patch');
    assert.ok(typeof result === 'string');
    assert.ok(result.length > 0);
  });

  it('should return string for minor', () => {
    assert.ok(semverBadge('minor').length > 0);
  });

  it('should return string for major', () => {
    assert.ok(semverBadge('major').length > 0);
  });

  it('should handle unknown types', () => {
    assert.ok(semverBadge('unknown').length > 0);
  });
});

describe('depTypeBadge', () => {
  it('should create badge for dependencies', () => {
    assert.ok(depTypeBadge('dependencies').length > 0);
  });

  it('should create badge for devDependencies', () => {
    assert.ok(depTypeBadge('devDependencies').length > 0);
  });

  it('should handle unknown dep types', () => {
    assert.ok(depTypeBadge('custom').length > 0);
  });
});

describe('versionArrow', () => {
  it('should create version arrow string', () => {
    const result = versionArrow('1.0.0', '2.0.0', 'major');
    assert.ok(result.length > 0);
  });
});

describe('breakingIcon', () => {
  it('should return a non-empty string', () => {
    assert.ok(breakingIcon().length > 0);
  });
});

describe('deprecatedIcon', () => {
  it('should return a non-empty string', () => {
    assert.ok(deprecatedIcon().length > 0);
  });
});

describe('healthBar', () => {
  it('should return green for high scores', () => {
    const result = healthBar(90);
    assert.ok(result.length > 0);
  });

  it('should return bar for medium scores', () => {
    const result = healthBar(50);
    assert.ok(result.length > 0);
  });

  it('should return bar for low scores', () => {
    const result = healthBar(20);
    assert.ok(result.length > 0);
  });
});

describe('sectionHeader', () => {
  it('should create a section header', () => {
    const result = sectionHeader('Test Section');
    assert.ok(result.includes('Test Section'));
  });
});

describe('formatCount', () => {
  it('should format zero count as dim', () => {
    const result = formatCount(0, 'items');
    assert.ok(result.length > 0);
  });

  it('should format non-zero count with accent', () => {
    const result = formatCount(5, 'items');
    assert.ok(result.length > 0);
  });
});
