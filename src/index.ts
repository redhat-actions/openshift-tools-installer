import * as ghCore from "@actions/core";
import * as ghExec from "@actions/exec";
import * as semver from "semver";

import { Inputs, Outputs } from "./generated/inputs-outputs";
import {
    ClientDetailOverrides,
    ClientFile, ClientsToInstall, InstallableClient, InstallSuccessResult, SourceAndClients, MIRROR, GITHUB,
} from "./util/types";
import { retreiveFromCache, downloadAndInstall, saveIntoCache } from "./installer/install";
import { joinList, writeOutInstalledFile } from "./util/utils";
import { isOCV3 } from "./mirror-client-finder/oc-3-finder";
import { findMatchingClient } from "./util/file-finder";

export async function run(sourceAndClients: SourceAndClients): Promise<void> {
    // ghCore.info(`The clients to install are: ${JSON.stringify(clientsToInstall, undefined, 2)}`);

    const source = sourceAndClients.source;
    const clientsToInstall = sourceAndClients.clientsToInstall;

    ghCore.info(`ℹ️ Tools will be installed from "${source}".`);

    checkIfProvidedClientSupported(source, clientsToInstall);

    if (Object.keys(clientsToInstall).length === 0) {
        throw new Error("No clients specified to be installed.");
    }

    const successes: { [key in InstallableClient]?: InstallSuccessResult } = {};
    const failures: InstallableClient[] = [];

    // install each client that was listed
    // if an install fails, fail the workflow but still continue to install the others
    for (const [ client_, versionRange ] of Object.entries(clientsToInstall)) {
        const client = client_ as InstallableClient;
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (versionRange == null) {
            ghCore.info(`Not installing ${client_}`);
            continue;
        }

        try {
            successes[client] = await install(source, client, versionRange);
        }
        catch (err) {
            failures.push(client);
            if (failures.length === 1) {
                // first failure
                ghCore.setFailed(`Error: ${err}`);
            }
            else {
                ghCore.error(`Error: ${err}`);
            }
            continue;
        }
    }

    // Collect and print a summary of the action's successes and failures
    const noInstalled = Object.keys(successes).length;
    const noCached = Object.values(successes).filter(((result) => result.fromCache)).length;
    const noFailed = failures.length;

    if (noInstalled > 0) {
        const cachedMsg = noCached > 0 ? `, ${noCached}/${noInstalled} from the cache` : "";
        ghCore.info(
            `\n✅ Successfully installed ${noInstalled}/${noInstalled + failures.length} `
            + `client${noInstalled === 1 ? "" : "s"}${cachedMsg}:`
        );

        const installedVersions: string[] = [];
        for (const installedClient_ of Object.keys(successes)) {
            const installedClient = installedClient_ as InstallableClient;
            const installedClientVersion = successes[installedClient]?.version;

            if (installedClientVersion != null) {
                installedVersions.push(`${installedClient} ${installedClientVersion}`);
                ghCore.info(`  - ${installedClient} ${installedClientVersion}`);
            }
        }
    }

    if (noFailed > 0) {
        const errMsg = `\n❌ Failed to install ${joinList(failures)}.`;
        // We already echoed the error above so just use info here.
        ghCore.info(errMsg);
    }

    const successesStr = JSON.stringify(successes, undefined, 2);
    ghCore.setOutput(Outputs.INSTALLED, successesStr);
    await writeOutInstalledFile(successesStr);
}

/**
 * Finds, installs, and caches the given client matching the given versionRange.
 * @throws any errors.
 * @returns Info about the client executable that was installed.
 */
async function install(source: string, client: InstallableClient, versionRange: semver.Range):
    Promise<InstallSuccessResult> {
    if (versionRange.raw === "*") {
        ghCore.info(`\n🔎 Searching for the latest version of ${client}`);
    }
    else {
        ghCore.info(`\n🔎 Searching for a version of ${client} satisfying the range `
            + `"${versionRange.range}" that was input as "${versionRange.raw}"`);
    }

    const clientInfo = await findMatchingClient(source, client, versionRange);

    ghCore.debug(`File info for ${client} ${versionRange} `
        + `resolved successfully to ${JSON.stringify(clientInfo)}`);

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
        fromCache: wasCached,
        installedPath: executablePath,
        url: clientInfo.archiveFileUrl,
        version: clientInfo.version,
    };
}

async function testExec(client: ClientFile): Promise<void> {
    const TEST_ARGS = [ "version" ];
    if (client.clientName === Inputs.OC && !isOCV3(client.clientName, client.versionRange)) {
        // oc 4 'version' will exit with failure if it can't contact the server and --client is not passed.
        TEST_ARGS.push("--client");
    }
    // since 'tkn version' fails if kubeConfiguration namespace is not set.
    if (client.clientName === Inputs.TKN || client.clientName === Inputs.CHART_VERIFIER) {
        await ghExec.exec(client.clientName, [ "--help" ]);
    }
    else if (client.clientName === Inputs.YQ) {
        await ghExec.exec(client.clientName, [ "--version" ]);
    }
    else {
        await ghExec.exec(client.clientName, TEST_ARGS);
    }
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
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    else if (semver.validRange(rawVersionRange) == null) {
        throw new Error(`Invalid range "${rawVersionRange}" provided for ${client}`);
    }

    return new semver.Range(rawVersionRange);
}

function getActionInputs(): SourceAndClients {
    const clientsToInstall: ClientsToInstall = {};
    let source = MIRROR;
    let pat = "";

    for (const input of Object.values(Inputs)) {
        if (input === Inputs.SOURCE) {
            source = ghCore.getInput(input);
            if (source !== MIRROR && source !== GITHUB) {
                throw new Error(`❌ "${source}" is not a valid input. `
                + `Valid inputs are "${MIRROR}" or "${GITHUB}"`);
            }
        }
        else if (input === Inputs.GITHUB_PAT) {
            pat = ghCore.getInput(input);
        }
        else if (input !== Inputs.SKIP_CACHE) {
            const clientVersion = ghCore.getInput(input);
            if (clientVersion) {
                ghCore.info(`Installing ${input} matching version "${clientVersion}"`);
                clientsToInstall[input] = parseVersion(input, clientVersion);
            }
        }
    }

    if (!pat && source === GITHUB) {
        throw new Error(`❌ Input "${Inputs.GITHUB_PAT}" must be provided to install the tools from GitHub.`);
    }

    return {
        source, clientsToInstall,
    };
}

/**
 * Check if the provided client is supported in the provided source
 *
 * @param source Provided source to install clients from
 * @param clientsToInstall List of clients the need to be installed
 */
function checkIfProvidedClientSupported(source: string, clientsToInstall: ClientsToInstall): void {
    const onlyGitHubSupportedClient: InstallableClient[] = [ Inputs.YQ, Inputs.S2I ];

    const githubUnSupportedClient: InstallableClient[] = [];
    const mirrorUnSupportedClient: InstallableClient[] = [];

    for (const client_ of Object.keys(clientsToInstall)) {
        const client = client_ as InstallableClient;
        if (source === GITHUB && !ClientDetailOverrides[client]?.github?.repoSlug) {
            githubUnSupportedClient.push(client);
        }
        else if (source === MIRROR && onlyGitHubSupportedClient.includes(client)) {
            mirrorUnSupportedClient.push(client);
        }
    }

    if (githubUnSupportedClient.length !== 0) {
        throw new Error(`❌ Client${githubUnSupportedClient.length !== 1 ? "s" : ""} `
        + `"${githubUnSupportedClient.join(", ")}" is not available to install `
        + `from the provided source "${source}". `
        + `Client${githubUnSupportedClient.length !== 1 ? "s" : ""} cannot be installed.`);
    }
    else if (mirrorUnSupportedClient.length !== 0) {
        throw new Error(`❌ Client${mirrorUnSupportedClient.length !== 1 ? "s" : ""} `
        + `"${mirrorUnSupportedClient.join(", ")}" is not available to install `
        + `from the provided source "${source}". `
        + `Client${mirrorUnSupportedClient.length !== 1 ? "s" : ""} cannot be installed.`);
    }
}

if (require.main === module) {
    // run() directly only if this file was invoked directly (ie "node dist/index.js").
    // this is so that was can also invoke run from the 'test' file.
    run(getActionInputs())
        .catch((err) => {
            let errMsg: string = err.message.toString() || err.toString();

            const ERROR_PREFIX = "Error:";
            if (errMsg.startsWith(ERROR_PREFIX)) {
                errMsg = errMsg.substring(ERROR_PREFIX.length);
            }
            ghCore.setFailed(errMsg);
        });
}
