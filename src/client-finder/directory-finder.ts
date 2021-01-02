import * as ghCore from "@actions/core";
import fetch from "node-fetch";
import * as cheerio from "cheerio";
import * as semver from "semver";

import { InstallableClient } from "../util/types";

export async function findClientDir(client: InstallableClient, desiredVersion: semver.Range): Promise<string> {
    const clientBaseDir = resolveBaseDownloadDir(client);
    const clientMatchedVersion = await findMatchingVersion(clientBaseDir, client, desiredVersion);
    const clientVersionedDir = clientBaseDir + clientMatchedVersion;
    return clientVersionedDir;
}

export async function fetchDirContents(dirUrl: string): Promise<string[]> {
    // ghCore.debug(`GET ${dirUrl}`);

    const directoryPageText = await (await fetch(dirUrl)).text();
    const $ = cheerio.load(directoryPageText);

    const linkedFiles = $("td a").toArray().map((e) => {

        // We have to use the href because the text sometimes gets cut off and suffixed with '...' - not sure what causes this.
        let filename = $(e).attr("href");
        if (!filename) {
            const text = $(e).text();
            console.error(`No href for element with text "${text}"`);
            filename = text;
        }
        if (filename.endsWith("/")) {
            filename = filename.substring(0, filename.length - 1);
        }
        return filename;
    });

    if (linkedFiles[0] === "Parent Directory" || linkedFiles[0].startsWith("/pub")) {
        // remove link to parent directory
        linkedFiles.shift();
    }

    return linkedFiles;
}

async function findMatchingVersion(clientBaseDir: string, client: InstallableClient, versionRange: semver.Range): Promise<string> {
    const availableVersions = await fetchDirContents(clientBaseDir);

    ghCore.info(`Searching for version of ${client} matching "${versionRange.toString() || "latest"}"`);

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

    if (versionRange.raw === "*") {
        ghCore.info(`Latest available version is ${maxSatisifying}`);
    }
    else {
        ghCore.info(`Max version satisfying ${versionRange} provided as "${versionRange.raw}" is ${maxSatisifying}`);
    }

    if (maxSatisifying == null) {
        throw new Error(`No ${client} version satisfying the range ${versionRange} is available. Available versions are: ${semanticAvailableVersions.join(", ")}`);
    }

    // make sure to use the raw here - otherwise if the directory is 'v2.0.3' it will be trimmed to '2.0.3' and be a 404
    return maxSatisifying.raw;
}

const BASE_URL = "https://mirror.openshift.com/pub/openshift-v4/x86_64/clients/";

const RENAMED_DIRS: { [key in InstallableClient]?: string } = {
    tkn: "pipeline",
    kn: "serverless",
    oc: "ocp",
};

function resolveBaseDownloadDir(client: InstallableClient): string {
    const clientDir = Object.keys(RENAMED_DIRS).includes(client) ? RENAMED_DIRS[client] : client;
    const clientDirUrl = BASE_URL + clientDir + "/";

    // ghCore.info(`Resolved base download dir for ${client} to ${clientDirUrl}`);

    return clientDirUrl;
}
