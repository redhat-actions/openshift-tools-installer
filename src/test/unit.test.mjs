import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import assert from "assert";

const __dirname = dirname(fileURLToPath(import.meta.url));
const utilsSource = readFileSync(join(__dirname, "../util/utils.ts"), "utf8");

// Regression guard for https://github.com/redhat-actions/openshift-tools-installer/issues/173
// keepAlive: false must be set on the HttpClient to prevent a 3-minute process hang after
// action completion on Node 20+. https://github.com/nodejs/node/issues/47228
// This was previously fixed in #106 and accidentally dropped in a dependency upgrade.
assert.match(
    utilsSource,
    /\{\s*keepAlive:\s*false\s*\}/,
    "HttpClient must be created with { keepAlive: false } — "
    + "see https://github.com/nodejs/node/issues/47228"
);

console.log("✅ HttpClient keepAlive: false verified");

// parseVersion lives in index.ts, which imports ESM-only action deps that plain node can't load.
// Extract its source, strip the TS annotations, and run it for real against semver.
const { createRequire } = await import("module");
const semver = createRequire(import.meta.url)("semver");
const indexSource = readFileSync(join(__dirname, "../index.ts"), "utf8");
const fnMatch = indexSource.match(/export function parseVersion\(([\s\S]*?)\): semver\.Range \{([\s\S]*?)\n\}\n/);
assert.ok(fnMatch, "parseVersion not found in index.ts");
const parseVersion = new Function(
    "semver", "client", "rawVersionRange", fnMatch[2]
).bind(null, semver);

// "stable" and "latest" are mirror channel names; they must resolve to "any version" instead of
// failing as invalid semver (which crashed the whole action).
assert.strictEqual(parseVersion("oc", "stable").raw, "*");
assert.strictEqual(parseVersion("oc", "latest").raw, "*");

// "stable-4.15" / "latest-4.15" must pin the minor, so 4.15.z matches and 4.16.0 / 4.14.z do not.
for (const raw of [ "stable-4.15", "latest-4.15" ]) {
    const range = parseVersion("oc", raw);
    assert.ok(semver.satisfies("4.15.70", range), `${raw} should match 4.15.70`);
    assert.ok(!semver.satisfies("4.16.0", range), `${raw} should not match 4.16.0`);
    assert.ok(!semver.satisfies("4.14.9", range), `${raw} should not match 4.14.9`);
}

// plain semver ranges are untouched, garbage still fails loudly.
assert.ok(semver.satisfies("4.1.5", parseVersion("oc", "4.1")));
assert.throws(() => parseVersion("oc", "stable-4.x"), /Invalid range "stable-4\.x"/);
assert.throws(() => parseVersion("oc", ""), /Empty version range/);

console.log("✅ parseVersion channel names verified");
