#!/usr/bin/env node

/**
 * updeps CLI — The ultimate interactive npm dependency updater
 *
 * Usage:
 *   npx updeps              Interactive mode (default)
 *   npx updeps --check      Check only, no updates
 *   npx updeps --all        Update all dependencies without prompting
 *   npx updeps --major      Include major (breaking) updates
 *   npx updeps --minor      Only minor and patch updates
 *   npx updeps --patch      Only patch updates
 *   npx updeps --dev        Only devDependencies
 *   npx updeps --prod       Only production dependencies
 *   npx updeps --json       Output results as JSON
 *   npx updeps --help       Show help
 *   npx updeps --version    Show version
 */

import { run } from '../src/cli.js';

run(process.argv.slice(2)).catch((err) => {
  console.error(err);
  process.exit(1);
});
