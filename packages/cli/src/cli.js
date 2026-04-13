/**
 * CLI — main command-line interface for updeps
 */

import { resolve } from 'node:path';
import { readPackageJson, extractDependencies, analyzeOutdated, computeStats } from './analyzer.js';
import { batchFetchMetadata } from './registry.js';
import { applyUpdates, detectPackageManager, runInstall } from './updater.js';
import { showBanner, showSummaryBox, showCompletionBox, showNothingToUpdate, showErrorBox } from './ui/banner.js';
import { renderOutdatedTable, renderCheckSummary, renderJSON } from './ui/table.js';
import { promptUpdateStrategy, promptPackageSelection, confirmUpdate, promptPackageManager } from './ui/prompt.js';
import { createSpinner } from './ui/spinner.js';
import { colors } from './ui/theme.js';

/**
 * Parse CLI arguments into an options object
 */
function parseArgs(argv) {
  const opts = {
    cwd: process.cwd(),
    check: false,
    all: false,
    major: false,
    minor: false,
    patch: false,
    dev: false,
    prod: false,
    json: false,
    help: false,
    version: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--check': case '-c': opts.check = true; break;
      case '--all': case '-a': opts.all = true; break;
      case '--major': opts.major = true; break;
      case '--minor': opts.minor = true; break;
      case '--patch': opts.patch = true; break;
      case '--dev': case '-D': opts.dev = true; break;
      case '--prod': case '-P': opts.prod = true; break;
      case '--json': opts.json = true; break;
      case '--help': case '-h': opts.help = true; break;
      case '--version': case '-v': opts.version = true; break;
      case '--cwd':
        if (argv[i + 1]) {
          opts.cwd = resolve(argv[++i]);
        }
        break;
      default:
        break;
    }
  }

  return opts;
}

function showHelp() {
  showBanner();
  console.log(`
${colors.bright('Usage:')}
  ${colors.primary('updeps')} ${colors.dim('[options]')}

${colors.bright('Options:')}
  ${colors.success('-c, --check')}     Check only, don't update (exit code 1 if outdated)
  ${colors.success('-a, --all')}       Update all packages without prompting
  ${colors.success('--major')}         Include only major updates
  ${colors.success('--minor')}         Include only minor + patch updates
  ${colors.success('--patch')}         Include only patch updates
  ${colors.success('-D, --dev')}       Only devDependencies
  ${colors.success('-P, --prod')}      Only production dependencies
  ${colors.success('--json')}          Output results as JSON
  ${colors.success('--cwd <dir>')}     Set working directory
  ${colors.success('-h, --help')}      Show this help
  ${colors.success('-v, --version')}   Show version

${colors.bright('Examples:')}
  ${colors.dim('$')} updeps                     ${colors.muted('# Interactive mode')}
  ${colors.dim('$')} updeps --check              ${colors.muted('# CI/CD check')}
  ${colors.dim('$')} updeps --all                ${colors.muted('# Update everything')}
  ${colors.dim('$')} updeps --minor --prod       ${colors.muted('# Minor updates for prod deps only')}
  ${colors.dim('$')} updeps --json               ${colors.muted('# Machine-readable output')}
`);
}

function showVersion() {
  console.log('updeps v1.0.0');
}

/**
 * Main CLI entry point
 */
export async function run(argv) {
  const opts = parseArgs(argv);

  if (opts.help) {
    showHelp();
    return;
  }

  if (opts.version) {
    showVersion();
    return;
  }

  if (!opts.json) {
    showBanner();
  }

  // 1. Read package.json
  const scanSpinner = createSpinner('Reading package.json...');
  if (!opts.json) scanSpinner.start();

  let packageJson;
  try {
    packageJson = await readPackageJson(opts.cwd);
  } catch (err) {
    scanSpinner?.stop();
    showErrorBox(`Could not read package.json in ${opts.cwd}\n  ${err.message}`);
    process.exit(1);
  }

  // 2. Extract dependencies
  const depFilter = { dev: opts.dev, prod: opts.prod };
  const deps = extractDependencies(packageJson, depFilter);

  if (deps.length === 0) {
    scanSpinner?.stop();
    showErrorBox('No dependencies found in package.json');
    process.exit(0);
  }

  if (!opts.json) {
    scanSpinner.succeed(colors.success(`Found ${deps.length} dependencies`));
  }

  // 3. Fetch registry data
  const fetchSpinner = createSpinner(`Fetching registry data for ${deps.length} packages...`);
  if (!opts.json) fetchSpinner.start();

  const packageNames = deps.map((d) => d.name);
  const registryMap = await batchFetchMetadata(packageNames, {
    onProgress: (done, total) => {
      if (!opts.json) {
        fetchSpinner.text = colors.secondary(
          `Fetching registry data... ${done}/${total}`
        );
      }
    },
  });

  if (!opts.json) {
    fetchSpinner.succeed(colors.success('Registry data fetched'));
  }

  // 4. Analyze outdated packages
  let outdated = analyzeOutdated(deps, registryMap);

  // Apply type filters
  if (opts.major) {
    outdated = outdated.filter((p) => p.updateType === 'major');
  } else if (opts.minor) {
    outdated = outdated.filter((p) => p.updateType === 'minor' || p.updateType === 'patch');
  } else if (opts.patch) {
    outdated = outdated.filter((p) => p.updateType === 'patch');
  }

  const stats = computeStats(deps, outdated);

  // 5. Display results
  if (opts.json) {
    renderJSON(outdated);
    process.exit(outdated.length > 0 ? 1 : 0);
  }

  if (outdated.length === 0) {
    showNothingToUpdate();
    return;
  }

  showSummaryBox(stats);
  renderOutdatedTable(outdated);

  // 6. Check-only mode
  if (opts.check) {
    renderCheckSummary(outdated);
    process.exit(outdated.length > 0 ? 1 : 0);
  }

  // 7. Update mode
  let selectedPackages;

  if (opts.all) {
    selectedPackages = outdated;
  } else {
    // Interactive mode
    const strategy = await promptUpdateStrategy();

    switch (strategy) {
      case 'safe':
        selectedPackages = outdated.filter((p) => p.updateType !== 'major');
        if (selectedPackages.length === 0) {
          console.log(colors.warning('\n  No safe updates available. Use interactive mode to select major updates.\n'));
          return;
        }
        break;

      case 'interactive':
        const selectedNames = await promptPackageSelection(outdated);
        selectedPackages = outdated.filter((p) => selectedNames.includes(p.name));
        break;

      case 'all':
        selectedPackages = outdated;
        break;

      case 'cancel':
        console.log(colors.dim('\n  Cancelled. No changes made.\n'));
        return;

      default:
        return;
    }
  }

  if (selectedPackages.length === 0) {
    console.log(colors.dim('\n  No packages selected. No changes made.\n'));
    return;
  }

  // Warn about breaking changes
  const breakingPackages = selectedPackages.filter((p) => p.breaking);
  if (breakingPackages.length > 0 && !opts.all) {
    console.log(colors.danger(`\n  ⚠  ${breakingPackages.length} selected package(s) have breaking changes:\n`));
    for (const pkg of breakingPackages) {
      console.log(`    ${colors.danger('•')} ${colors.bright(pkg.name)} ${colors.dim(pkg.breakingDetails || '')}`);
    }
    console.log('');
  }

  // Confirm
  if (!opts.all) {
    const confirmed = await confirmUpdate(selectedPackages.length);
    if (!confirmed) {
      console.log(colors.dim('\n  Cancelled. No changes made.\n'));
      return;
    }
  }

  // 8. Apply updates
  const updateSpinner = createSpinner('Applying updates to package.json...');
  updateSpinner.start();

  const { updated, changes } = await applyUpdates(opts.cwd, selectedPackages);

  updateSpinner.succeed(
    colors.success(`Updated ${updated} package${updated !== 1 ? 's' : ''} in package.json`)
  );

  // Show changes
  for (const change of changes) {
    console.log(
      `  ${colors.success('✔')} ${colors.bright(change.name)} ${colors.dim(change.from)} → ${colors.success(change.to)}`
    );
  }

  // 9. Install
  let manager;
  if (opts.all) {
    manager = await detectPackageManager(opts.cwd);
  } else {
    manager = await promptPackageManager();
  }

  if (manager !== 'skip') {
    const installSpinner = createSpinner(`Installing with ${manager}...`);
    installSpinner.start();

    const result = await runInstall(opts.cwd, manager);

    if (result.success) {
      installSpinner.succeed(colors.success(`Dependencies installed with ${manager}`));
    } else {
      installSpinner.fail(colors.danger(`Install failed: ${result.output}`));
    }
  }

  // 10. Summary
  const skipped = outdated.length - selectedPackages.length;
  showCompletionBox(updated, skipped);
}

export default { run };
