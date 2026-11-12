import * as ghCore from "@actions/core";
import * as semver from "semver";
import { Inputs } from "../generated/inputs-outputs";

import { InstallableClient } from "../util/types";
import { joinList } from "../util/utils";

// Tools whose mirror versions use RPM-style build suffixes (e.g. 'v0.24.0-1')
// that semver treats as prereleases. Without includePrerelease, these would
// never match ranges like "*" or ">=0.24.0".
const INCLUDE_PRERELEASE_CLIENTS: InstallableClient[] = [ Inputs.BUTANE ];

export async function findMatchingVersion(
    client: InstallableClient, availableVersions: string[], versionRange: semver.Range, mirrorClientBaseDir?: string
): Promise<string> {
    const semanticAvailableVersions: semver.SemVer[] = [];
    const originalNames = new Map<string, string>();

    for (const version of availableVersions) {
        try {
            const sv = new semver.SemVer(version);
            originalNames.set(sv.version, version);
            semanticAvailableVersions.push(sv);
        }
        catch {
            // ignore invalid
        }
    }

    // Fallback: coerce partial versions (e.g. "2.0" → "2.0.0") for mirrors
    // that use two-component version directories. Only coerce bare numeric
    // strings to avoid pulling in namespaced tags like "scorecard-kuttl/v2.0.0".
    // Exact matches always win.
    for (const version of availableVersions) {
        if (!/^v?\d+(\.\d+)*$/.test(version)) continue;
        const coerced = semver.coerce(version);
        if (coerced && !originalNames.has(coerced.version)) {
            originalNames.set(coerced.version, version);
            semanticAvailableVersions.push(coerced);
        }
    }

    ghCore.debug(`Semantic versions of ${client} are ${semanticAvailableVersions.join(", ")}`);
    ghCore.debug(`${availableVersions.length - semanticAvailableVersions.length} non-semantic versions were discarded`);

    const includePrerelease = INCLUDE_PRERELEASE_CLIENTS.includes(client);
    const maxSatisifying = semver.maxSatisfying(semanticAvailableVersions, versionRange, { includePrerelease });

    if (maxSatisifying == null) {
        throw new Error(`No ${client} version satisfying ${versionRange} is available `
            + `${mirrorClientBaseDir ? `under ${mirrorClientBaseDir}` : ""}.\n`
            + `Available versions are: ${joinList(semanticAvailableVersions.map((v) => v.version))}.`);
    }

    if (versionRange.raw === "*") {
        ghCore.info(`Latest release of ${client} is ${maxSatisifying}`);
    }
    else {
        ghCore.info(`Max ${client} version satisfying ${versionRange} is ${maxSatisifying}`);
    }

    const originalName = originalNames.get(maxSatisifying.version) ?? maxSatisifying.raw;

    // since we trimmed the prefix 'kustomize/' earlier
    if (client === Inputs.KUSTOMIZE) {
        return `${Inputs.KUSTOMIZE}/${originalName}`;
    }
    return originalName;
}
