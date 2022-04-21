import * as ghCore from "@actions/core";
import * as semver from "semver";

import { Inputs } from "../generated/inputs-outputs";
import { findClientVersionFromGithub, getReleaseAssets } from "../github-client-finder/repository-finder";
import { findClientDir, getDirContents } from "../mirror-client-finder/directory-finder";
import { isOCV3, getOCV3File } from "../mirror-client-finder/oc-3-finder";

import {
    ClientDetailOverrides, ClientDirectory, ClientFile, GITHUB, InstallableClient, MIRROR,
} from "../util/types";
import {
    getArch, getGitHubReleaseAssetPath, getOS,
} from "../util/utils";
import {
    filterByOS, filterByZipped, filterByExecutable, filterByVersioned, filterByArch, filterClients, filterByNotZipped,
} from "./filters";

type ClientFilterFunc = ((filename: string) => boolean);

/**
 * Finds the latest version of client that satisifies the desiredVersionRange.
 * This is done by:
 *  - If source is 'mirror', looking up the directory for the client on mirror.openshift.com
 *  - If source is 'github', looking up the GitHub releases for the client on the respective GitHub repositories
 *  - reading the available versions (directory names / releases)
 *  - finding the max version that satisfies
 *  - navigating into that versioned directory / release
 *  - finding the filename/asset for the client, operating system, and architecture for the current machine.
 *
 * @returns All the required information about the client file, once it's been located.
 */
export async function findMatchingClient(source: string, client: InstallableClient, desiredVersionRange: semver.Range):
    Promise<ClientFile> {
    let clientDir: ClientDirectory;
    let clientFiles: string[];
    let clientVersion: string;
    let ClientDirectoryUrl = "";

    if (source === MIRROR) {
        clientDir = await findClientDir(client, desiredVersionRange);
        ClientDirectoryUrl = clientDir.url;
        clientFiles = await getDirContents(ClientDirectoryUrl);
        clientVersion = clientDir.version;

        ghCore.debug(`${client} ${clientVersion} files: ${clientFiles.join(", ")}`);

        if (isOCV3(client, desiredVersionRange)) {
            return getOCV3File(clientDir, desiredVersionRange);
        }
    }
    else {
        clientVersion = await findClientVersionFromGithub(client, desiredVersionRange);
        clientFiles = await getReleaseAssets(client, clientVersion);
        ghCore.debug(`${client} ${clientVersion} files: ${clientFiles.join(", ")}`);
    }

    // select a 'filter pipeline'
    // in the case of 'mirror' as the source the ocp directory and camel-k
    // have different naming / organization than the others
    let filters: ClientFilterFunc[];
    if (client === Inputs.KAMEL && source === MIRROR) {
        // these filters are used for camel-k / kamel, which is amd64 only.
        filters = [ filterByOS, filterByZipped ];
    }
    // Since directory name for opm is ocp (in case of mirror)
    // but this filter pipeline is not valid for opm when source is github
    else if (ClientDetailOverrides[client]?.mirror?.directoryName === "ocp" && source !== GITHUB) {
        // the ocp directory is amd64 only,
        // and we have to filter out the other client we're not interested in
        // - ie remove 'oc' if we're installing 'openshift-install'.
        filters = [
            filterByOS,
            filterByExecutable.bind(client),
            filterByVersioned.bind(clientVersion),
            filterByZipped,
        ];
    }
    // in case of 'github' as the source operator-sdk only has execuatables in the release assets
    else if (client === Inputs.OPERATOR_SDK && source === GITHUB) {
        filters = [ filterByOS, filterByArch, filterByExecutable.bind(client) ];
    }
    // In case of client being 'yq', executable and zip files both are present
    // this will give warning to the users as multiple files will be found after
    // filteration. So removing all the zipped files.
    else if (client === Inputs.YQ && source === GITHUB) {
        filters = [ filterByOS, filterByArch, filterByNotZipped ];
    }
    else {
        // these filters are used for all the other clients.
        filters = [ filterByOS, filterByArch, filterByZipped ];
    }

    const filteredClientFiles = filterClients(clientFiles, filters);

    let archiveFilename = filteredClientFiles[0];

    // Since tkn-pac binary is also present in the same directory
    if (filteredClientFiles.length > 1 && client === "tkn" && filteredClientFiles[0].includes("pac")) {
        archiveFilename = filteredClientFiles[1];
    }
    else if (filteredClientFiles.length > 1) {
        ghCore.warning(`Multiple files were found for ${client} that matched the current OS and architecture: `
            + `${filteredClientFiles.join(", ")}. Selecting the first one.`);
    }
    else if (filteredClientFiles.length === 0) {
        throw new Error(`No ${client} file was found for ${getArch()} ${getOS()}`
        + ` ${ClientDirectoryUrl ? `under ${ClientDirectoryUrl}` : ""}.`);
    }

    ghCore.info(`Selecting ${archiveFilename}`);
    let archiveUrl;
    if (source === MIRROR) {
        archiveUrl = `${ClientDirectoryUrl}${archiveFilename}`;
    }
    else {
        archiveUrl = getGitHubReleaseAssetPath(client, clientVersion, archiveFilename);
    }

    const clientFile: ClientFile = {
        archiveFilename,
        archiveFileUrl: archiveUrl,
        clientName: client,
        version: clientVersion,
        versionRange: desiredVersionRange,
    };

    if (ClientDirectoryUrl !== "") {
        clientFile.mirrorDirectoryUrl = ClientDirectoryUrl;
    }

    return clientFile;
}
