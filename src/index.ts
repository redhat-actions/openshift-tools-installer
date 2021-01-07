
import * as ghCore from "@actions/core";
import * as ghExec from "@actions/exec";
import * as semver from "semver";

import { Inputs, Outputs } from "./generated/inputs-outputs";
import { InstallableClient } from "./util/types";
import { findMatchingClient } from "./client-finder/file-finder";
import { retreiveFromCache, downloadAndCache } from "./installer/cache";
import { joinList } from "./util/utils";

export type ClientsToInstall = { [key in InstallableClient]?: semver.Range };
type InstallSuccessResult = {
    fromCache: boolean;
    installedPath: string;
    url: string;
    version: string;
};

export async function run(clientsToInstall: ClientsToInstall): Promise<void> {
    // ghCore.info(`The clients to install are: ${JSON.stringify(clientsToInstall, undefined, 2)}`);

    if (Object.keys(clientsToInstall).length === 0) {
        throw new Error("No clients specified to be installed.");
    }

    const successes: { [key in InstallableClient]?: InstallSuccessResult } = {};
    const failures: InstallableClient[] = [];

    for (const [ client_, versionRange ] of Object.entries(clientsToInstall)) {
        const client = client_ as InstallableClient;
        if (versionRange == null) {
            ghCore.info(`Not installing ${client_}`);
            continue;
        }

        try {
            successes[client] = await install(client, versionRange);
        }
        catch (err) {
            failures.push(client);
            if (failures.length === 1) {
                // first failure
                ghCore.setFailed(err);
            }
            else {
                ghCore.error(err);
            }
            continue;
        }
    }

    const noInstalled = Object.keys(successes).length;
    const noCached = Object.values(successes).filter((result => result && result.fromCache)).length;
    const noFailed = failures.length;

    if (noInstalled > 0) {
        const cachedMsg = noCached > 0 ? `, ${noCached}/${noInstalled} from the cache` : "";
        ghCore.info(`\n✅ Successfully installed ${noInstalled}/${noInstalled + failures.length} client${noInstalled === 1 ? "" : "s"}${cachedMsg}.`);
    }

    if (noFailed > 0) {
        const errMsg = `❌ Failed to install ${joinList(failures, "and")}.`;
        // We already echoed the error above so just use info here.
        ghCore.info(errMsg);
    }

    ghCore.setOutput(Outputs.INSTALLED, JSON.stringify(successes, undefined, 2));
}

async function install(client: InstallableClient, versionRange: semver.Range): Promise<InstallSuccessResult> {
    if (versionRange.raw === "*") {
        ghCore.info(`\n🔎 Searching for the latest version of ${client}`);
    }
    else {
        ghCore.info(`\n🔎 Searching for a version of ${client} satisfying the range "${versionRange.range}" that was input as "${versionRange.raw}"`);
    }

    const clientFileInfo = await findMatchingClient(client, versionRange);
    ghCore.debug(`File info for ${client} ${versionRange || "*"} resolved successfully to ${JSON.stringify(clientFileInfo)}`);

    let executablePath: string;
    const executablePathFromCache = await retreiveFromCache(clientFileInfo);
    if (executablePathFromCache) {
        executablePath = executablePathFromCache;
    }
    else {
        executablePath = await downloadAndCache(clientFileInfo);
    }

    ghCore.info(`${client} installed into ${executablePath}`);

    const TEST_ARG = "version";
    ghCore.startGroup(`Run "${client} ${TEST_ARG}"`);

    await ghExec.exec(clientFileInfo.clientName, [ TEST_ARG ], {});
    ghCore.endGroup();

    const wasCached = !!executablePathFromCache;
    ghCore.info(`✅ Successfully installed ${client} ${clientFileInfo.version}${wasCached ? " from the cache" : ""}.`);

    return {
        fromCache: wasCached,
        version: clientFileInfo.version,
        installedPath: executablePath,
        url: clientFileInfo.archiveFileUrl
    };
}

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
