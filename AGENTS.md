# AGENTS.md

Instructions for AI coding agents working on this repository.

## Project overview

A GitHub Action that downloads and installs OpenShift CLI tools (oc, oc-mirror, opm, helm, tkn, etc.) from the OpenShift mirror or GitHub releases.

- **Language:** TypeScript (strict mode, ES2024 target, Node 22)
- **Bundler:** webpack — the action runs from a single `dist/index.js` bundle
- **License:** MIT

## Development workflow

Always use `npm ci` (not `npm install`) to install dependencies. CI uses `npm ci`, and the two commands can produce different dependency trees, which causes the bundle verification check to fail.

### Build and verify

```sh
npm ci                    # install exact lockfile deps
npm run lint              # eslint, must pass with zero warnings
npm run compile           # tsc type-check
npm test                  # unit tests (src/test/unit.test.mjs)
npm run bundle            # webpack production build → dist/index.js
```

### CI checks that must pass

1. **ESLint** — zero warnings enforced (`--max-warnings=0`)
2. **Unit tests** — `npm test`
3. **Check Distribution** — CI runs `npm ci && npm run bundle` and compares the output against the committed `dist/index.js`. If they differ, the check fails. Always rebuild dist after any source change.
4. **Check Input and Output enums** — `src/generated/inputs-outputs.ts` must match `action.yml`. Regenerate with `npm run generate-ios` if you modify action inputs/outputs.

### Before committing

1. Run `npm ci` (not `npm install`)
2. Run `npm run lint` and `npm test`
3. Run `npm run bundle`
4. Commit `dist/index.js` and `dist/index.js.map` alongside source changes

## Project structure

- `src/index.ts` — action entry point, version parsing, input handling
- `src/util/types.ts` — client definitions and mirror/GitHub configuration overrides
- `src/util/file-finder.ts` — locates the correct binary for a client/version/OS/arch
- `src/util/version-utils.ts` — semver matching with coercion fallback for two-component versions
- `src/mirror-client-finder/` — scrapes the OpenShift mirror directory listings
- `src/github-client-finder/` — queries GitHub releases
- `src/generated/inputs-outputs.ts` — auto-generated from `action.yml`, do not edit manually
- `dist/index.js` — committed webpack bundle, must be kept in sync with source

## Key conventions

- Mirror base URLs and directory name overrides live in `ClientDetailOverrides` in `src/util/types.ts`
- Version inputs accept semver ranges, `"latest"`, `"stable"`, and channel names like `"stable-4.22"`
- The `npm audit` CI job may fail due to upstream vulnerabilities — this is a known, separate concern
