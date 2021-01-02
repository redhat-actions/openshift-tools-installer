
import * as ghCore from "@actions/core";
import * as semver from "semver";

import { Inputs } from "./generated/inputs-outputs";
import { InstallableClient } from "./util/types";
import { findClientFile } from "./client-finder/file-finder";

export type ClientsToInstall = { [key in InstallableClient]?: semver.Range };

export async function run(clientsToInstall: ClientsToInstall = {}): Promise<void> {
    ghCore.info(`The clients to install are: ${JSON.stringify(clientsToInstall, undefined, 2)}`);

    if (Object.keys(clientsToInstall).length === 0) {
        throw new Error("No clients specified to be installed.");
    }

    const clientDownloadableUrls: { [key in InstallableClient]?: string } = {};
    for (const [client_, version] of Object.entries(clientsToInstall)) {
        if (version == null) {
            ghCore.info(`Not installing ${client_}`);
            continue;
        }

        const client = client_ as InstallableClient;
        try {
            const clientUrl = await findClientFile(client, version);
            clientDownloadableUrls[client] = clientUrl;
        }
        catch (err) {
            ghCore.error(`Failed to install ${client}: ${err}`);
        }
    }

    Object.entries(clientDownloadableUrls).forEach(([client, url]) => {
        ghCore.info(`Resolved ${client} to ${url}`);
    });
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
        ghCore.info(`The raw version of ${client} to install is "${clientVersion}"`);

        if (clientVersion) {
            clientsToInstall[client] = parseVersion(client, clientVersion);
        }
    }

    return clientsToInstall;
}

if (require.main === module) {
    run(getActionInputs())
    .catch(ghCore.setFailed);
}
