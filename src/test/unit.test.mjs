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

// oc-mirror is only published for linux amd64 and its file names carry no OS/arch,
// so the finder must refuse other platforms (and the rhel9 variant) instead of
// installing the wrong binary.
const fileFinderSource = readFileSync(join(__dirname, "../util/file-finder.ts"), "utf8");
const ocMirrorBranch = fileFinderSource.match(/client === Inputs\.OC_MIRROR[\s\S]*?\n    }\n/);
assert.ok(ocMirrorBranch, "file-finder must special-case Inputs.OC_MIRROR");
assert.match(
    ocMirrorBranch[0],
    /getOS\(\) === "linux" && getArch\(\) === "amd64"/,
    "oc-mirror must be restricted to linux amd64"
);
assert.match(
    ocMirrorBranch[0],
    /!filename\.includes\("rhel9"\)/,
    "oc-mirror must skip the rhel9 variant"
);

console.log("✅ oc-mirror linux amd64 restriction verified");
