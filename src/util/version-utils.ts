import * as ghCore from "@actions/core";
import * as semver from "semver";
import { Inputs } from "../generated/inputs-outputs";

import { InstallableClient } from "../util/types";
import { joinList } from "../util/utils";

export async function findMatchingVersion(
    client: InstallableClient, availableVersions: string[], versionRange: semver.Range, mirrorClientBaseDir?: string
): Promise<string> {
    const semanticAvailableVersions: semver.SemVer[] = availableVersions.reduce((semvers, version) => {
        try {
            semvers.push(new semver.SemVer(version));
        }
        catch (err) {
            // ignore invalid
        }
        return semvers;
    }, new Array<semver.SemVer>());

    ghCore.debug(`Semantic versions of ${client} are ${semanticAvailableVersions.join(", ")}`);
    ghCore.debug(`${availableVersions.length - semanticAvailableVersions.length} non-semantic versions were discarded`);

    const maxSatisifying = semver.maxSatisfying(semanticAvailableVersions, versionRange);

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

    // since we trimmed the prefix 'kustomize/' earlier
    if (client === Inputs.KUSTOMIZE) {
        return `${Inputs.KUSTOMIZE}/${maxSatisifying.raw}`;
    }
    // make sure to use the raw here - otherwise if the directory is 'v2.0.3' it will be trimmed to '2.0.3' and be a 404
    return maxSatisifying.raw;
}
