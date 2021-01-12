
import * as ghCore from "@actions/core";
import * as ghExec from "@actions/exec";
import * as semver from "semver";

import { Inputs, Outputs } from "./generated/inputs-outputs";
import { ClientFile, ClientsToInstall, InstallableClient, InstallSuccessOutput, InstallResult } from "./util/types";
import { findMatchingClient } from "./client-finder/file-finder";
import { retreiveFromCache, downloadAndInstall, saveIntoCache } from "./installer/install";
import { joinList } from "./util/utils";
import { isOCV3 } from "./client-finder/oc-3-finder";
import { checkIsInstalled, writeOutInstalledFile } from "./installer/installed-tracker";

export async function run(clientsToInstall: ClientsToInstall): Promise<void> {
    // ghCore.info(`The clients to install are: ${JSON.stringify(clientsToInstall, undefined, 2)}`);

    if (Object.keys(clientsToInstall).length === 0) {
        throw new Error("No clients specified to be installed.");
    }

    const installSuccesses: InstallSuccessOutput = {};
    const installFailures: InstallableClient[] = [];

    // install each client that was listed
    // if an install fails, fail the workflow but still continue to install the others
    for (const [ client_, versionRange ] of Object.entries(clientsToInstall)) {
        const client = client_ as InstallableClient;
        if (versionRange == null) {
            ghCore.info(`Not installing ${client_}`);
            continue;
        }

        try {
            installSuccesses[client] = await install(client, versionRange);
        }
        catch (err) {
            installFailures.push(client);
            if (installFailures.length === 1) {
                // first failure
                ghCore.setFailed(err);
            }
            else {
                ghCore.error(err);
            }
            continue;
        }
    }

    // Collect and print a summary of the action's successes and failures
    const noInstalled = Object.keys(installSuccesses).length;
    const noFailed = installFailures.length;

    if (noInstalled > 0) {
        let noDownloaded = 0;
        let noCached = 0;
        let noAlreadyInstalled = 0;

        Object.values(installSuccesses).forEach((i) => {
            if (i?.source === "download")   { noDownloaded++; }
            else if (i?.source === "cache") { noCached++; }
            else if (i?.source === "disk")  { noAlreadyInstalled++; }
        });

        ghCore.info(`\n✅ Successfully installed ${noInstalled}/${noInstalled + installFailures.length} clients.`);
        ghCore.info(`${noAlreadyInstalled} were already installed, ` +
            `${noDownloaded} were fetched from the download site, and ` +
            `${noCached} were downloaded from the cache.`);
    }

    if (noFailed > 0) {
        const errMsg = `❌ Failed to install ${joinList(installFailures)}.`;
        // We already echoed the error above so just use info here.
        ghCore.info(errMsg);
    }

    const successesStr = JSON.stringify(installSuccesses, undefined, 2);
    ghCore.setOutput(Outputs.INSTALLED, successesStr);
    await writeOutInstalledFile(successesStr);
}

/**
 * Finds, installs, and caches the given client matching the given versionRange.
 * @throws any errors.
 * @returns Info about the client executable that was installed.
 */
async function install(client: InstallableClient, versionRange: semver.Range): Promise<InstallResult> {
    if (versionRange.raw === "*") {
        ghCore.info(`\n🔎 Searching for the latest version of ${client}`);
    }
    else {
        ghCore.info(`\n🔎 Searching for a version of ${client} satisfying the range "${versionRange.range}" that was input as "${versionRange.raw}"`);
    }

    const clientInfo = await findMatchingClient(client, versionRange);
    ghCore.debug(`File info for ${client} ${versionRange || "*"} resolved successfully to ${JSON.stringify(clientInfo)}`);

    try {
        const alreadyInstalledObj = await checkIsInstalled(client, clientInfo.version);
        if (alreadyInstalledObj) {
            ghCore.info(`✅ ${client} ${clientInfo.version} was previously installed at ${alreadyInstalledObj.installedPath}`);
            return alreadyInstalledObj;
        }
    }
    catch (err) {
        ghCore.debug(`Error determining if ${client} is already installed: ${err}`);
    }

    let executablePath: string;
    const executablePathFromCache = await retreiveFromCache(clientInfo);
    const wasCached = !!executablePathFromCache;
    if (executablePathFromCache) {
        executablePath = executablePathFromCache;
    }
    else {
        executablePath = await downloadAndInstall(clientInfo);
    }

    ghCore.info(`${client} installed into ${executablePath}`);

    await testExec(clientInfo);

    if (!wasCached) {
        await saveIntoCache(executablePath, clientInfo);
    }

    ghCore.info(`✅ Successfully installed ${client} ${clientInfo.version}${wasCached ? " from the cache" : ""}.`);

    return {
        installedPath: executablePath,
        url: clientInfo.archiveFileUrl,
        source: wasCached ? "cache" : "download",
        version: clientInfo.version,
    };
}

async function testExec(client: ClientFile): Promise<void> {
    const TEST_ARGS = [ "version" ];
    if (client.clientName === "oc" && !isOCV3(client.clientName, client.versionRange)) {
        // oc 4 'version' will exit with failure if it can't contact the server and --client is not passed.
        TEST_ARGS.push("--client");
    }
    await ghExec.exec(client.clientName, TEST_ARGS);
}

/**
 * Parses the given rawVersionRange and returns it as a semver.Range.
 * Also maps "latest" to "*" which is semver for "the latest available version".
 */
export function parseVersion(client: InstallableClient, rawVersionRange: string): semver.Range {
    if (rawVersionRange === "latest") {
        return new semver.Range("*");
    }

    if (!rawVersionRange) {
        throw new Error(`Empty version range provided for ${client}`);
    }
    else if (semver.validRange(rawVersionRange) == null) {
        throw new Error(`Invalid range "${rawVersionRange}" provided for ${client}`);
    }

    return new semver.Range(rawVersionRange);
}

function getActionInputs(): ClientsToInstall {
    const clientsToInstall: ClientsToInstall = {};

    for (const client of Object.values(Inputs)) {
        const clientVersion = ghCore.getInput(client);

        if (clientVersion) {
            ghCore.info(`Installing ${client} matching version "${clientVersion}"`);
            clientsToInstall[client] = parseVersion(client, clientVersion);
        }
    }

    return clientsToInstall;
}

if (require.main === module) {
    // run() directly only if this file was invoked directly (ie "node dist/index.js").
    // this is so that was can also invoke run from the 'test' file.
    run(getActionInputs())
    .catch((err) => {
        let errMsg: string= err.message.toString() || err.toString();

        const ERROR_PREFIX = "Error:";
        if (errMsg.startsWith(ERROR_PREFIX)) {
            errMsg = errMsg.substring(ERROR_PREFIX.length);
        }
        ghCore.setFailed(errMsg);
    });
}
