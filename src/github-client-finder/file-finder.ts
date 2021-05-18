import * as ghCore from "@actions/core";
import * as semver from "semver";

import { ClientFile, InstallableClient } from "../util/types";
import { getOS, getArch, getGitHubReleaseAssetPath } from "../util/utils";
import { findClientVersionFromGithub, getReleaseAssets } from "./repository-finder";
import {
    filterByOS, filterByZipped, filterByArch, filterClients, filterByExecutable,
} from "../util/filters";

type ClientFilterFunc = ((filename: string) => boolean);

/**
 * Finds the latest version of client that satisifies the desiredVersionRange.
 * This is done by:
 *  - looking up the github releases for the client on the respective github repositories
 *  - reading the available versions (releases)
 *  - finding the max version that satisfies
 *  - navigating into that version/release
 *  - finding the filename/asset for the client, operating system, and architecture for the current machine.
 *
 * @returns All the required information about the client file, once it's been located.
 */
export async function findMatchingClientFromGithub(client: InstallableClient, desiredVersionRange: semver.Range):
    Promise<ClientFile> {
    const clientVersion = await findClientVersionFromGithub(client, desiredVersionRange);
    const clientFiles = await getReleaseAssets(client, clientVersion);

    ghCore.debug(`${client} ${clientVersion} files: ${clientFiles.join(", ")}`);

    let filters: ClientFilterFunc[];
    // operator-sdk only has execuatables in the release assets
    if (client === "operator-sdk") {
        filters = [ filterByOS, filterByArch, filterByExecutable.bind(client) ];
    }
    else {
        // these filters are used for all the other clients.
        filters = [ filterByOS, filterByArch, filterByZipped ];
    }

    const filteredClientFiles = filterClients(clientFiles, filters);

    if (filteredClientFiles.length > 1) {
        ghCore.warning(`Multiple files were found for ${client} that matched the current OS and architecture: `
            + `${filteredClientFiles.join(", ")}. Selecting the first one.`);
    }
    else if (filteredClientFiles.length === 0) {
        throw new Error(`No ${client} file was found for ${getArch()} ${getOS()}`);
    }

    const archiveFilename = filteredClientFiles[0];
    ghCore.info(`Selecting ${archiveFilename}`);

    const archiveUrl = getGitHubReleaseAssetPath(client, clientVersion, archiveFilename);
    return {
        archiveFilename,
        archiveFileUrl: archiveUrl,
        clientName: client,
        version: clientVersion,
        versionRange: desiredVersionRange,
    };
}
