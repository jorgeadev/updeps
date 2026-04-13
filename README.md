# updeps 🚀

> The ultimate interactive npm dependency updater — auto-detect outdated packages, view breaking changes, and update with a vibrant CLI experience.

![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)
![License](https://img.shields.io/badge/license-CC--BY--NC--4.0-blue)

---

## ✨ Features

- 📦 **Smart Detection** — Scans `dependencies`, `devDependencies`, `peerDependencies`, and `optionalDependencies`
- 🔍 **Registry Lookup** — Fetches latest versions from the npm registry with concurrent requests
- 🏷️ **Semver Classification** — Color-coded badges for `PATCH`, `MINOR`, and `MAJOR` updates
- ⚠️ **Breaking Change Warnings** — Detects major version jumps and warns about potential breaking changes
- ⊘ **Deprecation Alerts** — Flags deprecated packages with clear warnings
- 🏥 **Health Score** — Rates each package's health based on maintainers, recency, docs, and more
- 🎨 **Vibrant Colors** — Rich, colorful output with gradients, badges, and themed styling
- ✅ **Interactive Selection** — Choose packages one-by-one, select all safe updates, or update everything
- 📋 **Multiple Strategies** — Safe-only, interactive, or update-all modes
- 🔧 **Package Manager Support** — Detects and supports `npm`, `pnpm`, `yarn`, and `bun`
- 📊 **JSON Output** — Machine-readable output for CI/CD pipelines
- 🎯 **Filters** — Filter by update type (`--major`, `--minor`, `--patch`) or dependency type (`--dev`, `--prod`)

---

## 📦 Installation

```bash
# Global install
pnpm add -g updeps

# Or use with npx (no install needed)
npx updeps
```

---

## 🚀 Usage

### Interactive Mode (default)

```bash
updeps
```

This will:
1. Scan your `package.json` for all dependencies
2. Fetch the latest versions from the npm registry
3. Display a colorful table of outdated packages
4. Let you choose an update strategy (safe, interactive, or all)
5. Apply updates and optionally install

### Check Mode (CI/CD)

```bash
updeps --check
```

Exits with code `1` if outdated packages are found — perfect for CI pipelines.

### Update All

```bash
updeps --all
```

Updates all packages without prompting.

### JSON Output

```bash
updeps --json
```

Outputs results as JSON for programmatic consumption.

---

## ⚙️ Options

| Flag             | Short | Description                                    |
|------------------|-------|------------------------------------------------|
| `--check`        | `-c`  | Check only, don't update (exit 1 if outdated)  |
| `--all`          | `-a`  | Update all packages without prompting           |
| `--major`        |       | Show only major updates                         |
| `--minor`        |       | Show only minor + patch updates                 |
| `--patch`        |       | Show only patch updates                         |
| `--dev`          | `-D`  | Only devDependencies                            |
| `--prod`         | `-P`  | Only production dependencies                    |
| `--json`         |       | Output as JSON                                  |
| `--cwd <dir>`    |       | Set working directory                           |
| `--help`         | `-h`  | Show help                                       |
| `--version`      | `-v`  | Show version                                    |

---

## 🎨 Color Legend

| Color     | Meaning                                 |
|-----------|-----------------------------------------|
| 🟢 Green  | Patch update — safe, bug fixes only     |
| 🔵 Blue   | Minor update — new features, backward-compatible |
| 🔴 Red    | Major update — may include breaking changes |
| 🟠 Orange | Warning — deprecated package            |
| 🟣 Purple | Brand accent, UI elements               |

---

## 📊 Health Score

Each package receives a health score (0–100) based on:

- ✅ Has description and homepage
- ✅ Has a linked repository
- ✅ Multiple maintainers
- ✅ Recent releases (within 6 months)
- ✅ Valid license
- ✅ Mature package (many versions)
- ❌ Deprecation status (penalty)

---

## 🔧 Programmatic API

```javascript
import {
  readPackageJson,
  extractDependencies,
  analyzeOutdated,
  batchFetchMetadata,
  applyUpdates,
} from 'updeps';

// Read and analyze
const pkg = await readPackageJson(process.cwd());
const deps = extractDependencies(pkg);
const registry = await batchFetchMetadata(deps.map(d => d.name));
const outdated = analyzeOutdated(deps, registry);

// Apply updates
await applyUpdates(process.cwd(), outdated);
```

---

## 🧪 Testing

```bash
pnpm test
```

---

## 📝 License

CC BY-NC 4.0 — [Creative Commons Attribution-NonCommercial 4.0 International](https://creativecommons.org/licenses/by-nc/4.0/)
