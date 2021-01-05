
import * as ghCore from "@actions/core";
import * as semver from "semver";

import { Inputs, Outputs } from "./generated/inputs-outputs";
import { InstallableClient } from "./util/types";
import { findMatchingClient } from "./client-finder/file-finder";
import { uncache, downloadIntoCache } from "./cache/cache";

export type ClientsToInstall = { [key in InstallableClient]?: semver.Range };

export async function run(clientsToInstall: ClientsToInstall): Promise<void> {
    // ghCore.info(`The clients to install are: ${JSON.stringify(clientsToInstall, undefined, 2)}`);

    if (Object.keys(clientsToInstall).length === 0) {
        throw new Error("No clients specified to be installed.");
    }

    const installed: { [key in InstallableClient]?: { version: string, url: string } } = {};
    const failed: InstallableClient[] = [];

    for (const [client_, versionRange] of Object.entries(clientsToInstall)) {
        const client = client_ as InstallableClient;
        if (versionRange == null) {
            ghCore.info(`Not installing ${client_}`);
            continue;
        }

        let clientFileInfo;
        try {
            clientFileInfo = await findMatchingClient(client, versionRange);
            ghCore.debug(`File info for ${client} ${versionRange || "*"} resolved successfully to ${JSON.stringify(clientFileInfo)}`);
        }
        catch (err) {
            ghCore.error(`❌ Failed to find a matching file for ${client} ${versionRange.raw} for this system: ${err}`);
            continue;
        }

        try {
            let executablePath = await uncache(clientFileInfo);
            if (!executablePath) {
                executablePath = await downloadIntoCache(clientFileInfo);
            }
            ghCore.addPath(executablePath);
        }
        catch (err) {
            ghCore.error(`❌ Failed to install ${client} ${clientFileInfo.version}: ${err}`);
            continue;
        }

        ghCore.info(`✅ Successfully installed ${client} ${clientFileInfo.version}.`);
        installed[client] = { version: clientFileInfo.version, url: clientFileInfo.archiveFileUrl };
    }

    const noInstalled = Object.keys(installed).length;
    if (noInstalled > 0) {
        ghCore.info(`✅ Successfully installed ${noInstalled} client${noInstalled === 1 ? "" : "s"}.`);
    }

    const noFailed = failed.length;
    if (noFailed > 0) {
        // We already echoed the error above so just use info here.
        ghCore.info(`❌ Failed to install ${noFailed} client${noFailed === 1 ? "" : "s"}.`);
    }

    ghCore.setOutput(Outputs.INSTALLED, JSON.stringify(installed, undefined, 2));
}

export function parseVersion(client: string, rawVersionRange: string): semver.Range {
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
    .catch(ghCore.setFailed);
}
