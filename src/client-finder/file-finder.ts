import * as ghCore from "@actions/core";
import * as semver from "semver";

import { ClientDetailOverrides, ClientFile, InstallableClient } from "../util/types";
import { getOS, getArch } from "../util/utils";
import { getDirContents, findClientDir } from "./directory-finder";
import { getOCV3File, isOCV3 } from "./oc-3-finder";
import { canExtract } from "../util/unzip";

type ClientFilterFunc = ((filename: string) => boolean);

/**
 * Finds the latest version of client that satisifies the desiredVersionRange.
 * This is done by:
 *  - looking up the directory for the client on mirror.openshift.com
 *  - reading the available versions (directory names)
 *  - finding the max version that satisfies
 *  - navigating into that versioned directory
 *  - finding the filename for the client, operating system, and architecture for the current machine.
 *
 * @returns All the required information about the client file, once it's been located.
 */
export async function findMatchingClient(client: InstallableClient, desiredVersionRange: semver.Range): Promise<ClientFile> {

    const clientDir = await findClientDir(client, desiredVersionRange);
    const clientFiles = await getDirContents(clientDir.url);

    ghCore.debug(`${client} ${clientDir.version} files: ${clientFiles.join(", ")}`);

    if (isOCV3(client, desiredVersionRange)) {
        return getOCV3File(clientDir, desiredVersionRange);
    }

    // select a 'filter pipeline' - the ocp directory and camel-k have different naming / organization than the others
    let filters: ClientFilterFunc[];
    if (client === "kamel") {
        // these filters are used for camel-k / kamel, which is amd64 only.
        filters = [ filterByOS, filterByZipped ];
    }
    else if (ClientDetailOverrides[client]?.directoryName === "ocp") {
        // the ocp directory is amd64 only,
        // and we have to filter out the other client we're not interested in - ie remove 'oc' if we're installing 'openshift-install'.
        filters = [ filterByOS, filterByExecutable.bind(client), filterByVersioned.bind(clientDir.version), filterByZipped ];
    }
    else {
        // these filters are used for all the other clients.
        filters = [ filterByOS, filterByArch, filterByZipped ];
    }

    const filteredClientFiles = filterClients(clientFiles, filters);

    if (filteredClientFiles.length > 1) {
        ghCore.warning(`Multiple files were found for ${client} that matched the current OS and architecture: ${filteredClientFiles.join(", ")}. ` +
            " Selecting the first one.");
    }
    else if (filteredClientFiles.length === 0) {
        throw new Error(`No ${client} file was found for ${getArch()} ${getOS()} under ${clientDir.url}`);
    }

    const archiveFilename = filteredClientFiles[0];
    ghCore.info(`Selecting ${archiveFilename}`);
    const archiveUrl = `${clientDir.url}/${archiveFilename}`;

    return {
        archiveFilename: archiveFilename,
        archiveFileUrl: archiveUrl,
        clientName: client,
        directoryUrl: clientDir.url,
        version: clientDir.version,
        versionRange: desiredVersionRange,
    };
}

function filterClients(clientFiles: string[], filterFuncs: ClientFilterFunc[]): string[] {

    let filteredClientFiles = clientFiles;

    for (const filterFunc of filterFuncs) {
        if (filteredClientFiles.length <= 1) {
            ghCore.debug(`${filteredClientFiles.length} clients remaining; skipping ${filterFunc.name}.`);
            continue;   // remaining filters will also be skipped.
        }

        filteredClientFiles = filteredClientFiles.filter(filterFunc);
        ghCore.debug(`After ${filterFunc.name}, ${filteredClientFiles.length} files remain.`);
    }

    return filteredClientFiles;
}

/* eslint-disable no-invalid-this */

/**
 * For the ocp executables, the openshift client and installer executables are mixed into one directory.
 * @param this The name of the client executable.
 */
function filterByExecutable(this: InstallableClient, filename: string): boolean {
    if (this === "oc") {
        // oc is short for openshift-client, which is what the files are named.
        return filename.includes("openshift-client");
    }
    return filename.includes(this);
}

/**
 * For the ocp executables, there are two copies of each - one versioned, one not.
 * @param this The version of the client executable to do a substring match on.
 */
function filterByVersioned(this: string, filename: string): boolean {
    return filename.includes(this);
}

function filterByOS(filename: string): boolean {
    const os = getOS();

    if (os === "macos") {
        return filename.includes("mac") || filename.includes("darwin");
    }
    else if (os === "windows") {
        return filename.includes("win") && !filename.includes("darwin");
    }
    return filename.includes("linux");
}

function filterByArch(filename: string): boolean {
    const arch = getArch();
    if (arch === "arm64") {
        return filename.includes(arch) || filename.includes("aarch64");
    }
    return filename.includes(arch);
}

function filterByZipped(filename: string): boolean {
    return canExtract(filename);
}
