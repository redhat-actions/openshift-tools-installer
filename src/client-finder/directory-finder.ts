import * as ghCore from "@actions/core";
import * as cheerio from "cheerio";
import * as semver from "semver";

import { ClientDetailOverrides, ClientDirectory, InstallableClient } from "../util/types";
import { assertOkStatus, HttpClient, joinList } from "../util/utils";
import { isOCV3 } from "./oc-3-finder";

export async function findClientDir(client: InstallableClient, desiredVersion: semver.Range): Promise<ClientDirectory> {
    const clientBaseDir = resolveBaseDownloadDir(client, desiredVersion);
    ghCore.info(`📁 Download directory for ${client} is ${clientBaseDir}`);
    const clientMatchedVersion = await findMatchingVersion(clientBaseDir, client, desiredVersion);
    const clientVersionedDir = clientBaseDir + clientMatchedVersion;

    return {
        client,
        version: clientMatchedVersion,
        url: clientVersionedDir
    };
}

export async function getDirContents(dirUrl: string): Promise<string[]> {
    ghCore.debug(`GET ${dirUrl}`);

    const directoryPageRes = await HttpClient.get(dirUrl, { "Content-Type": "text/html" });
    await assertOkStatus(directoryPageRes);
    const directoryPage = await directoryPageRes.readBody();

    const $ = cheerio.load(directoryPage);

    const linkedFiles = $("td a").toArray().map((e) => {

        // We have to use the href because the text sometimes gets cut off and suffixed with '...'
        // not sure what causes this, since there's no screen size
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
    const availableVersions = await getDirContents(clientBaseDir);

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
        throw new Error(`No ${client} version satisfying ${versionRange}, input as "${versionRange.raw}", is available. ` +
            `Available versions are: ${joinList(semanticAvailableVersions.map((v) => v.version), "and")}.`);
    }

    if (versionRange.raw === "*") {
        ghCore.info(`🌟 Latest release of ${client} is ${maxSatisifying}`);
    }
    else {
        ghCore.info(`🌟 Max ${client} version satisfying ${versionRange} is ${maxSatisifying}`);
    }

    // make sure to use the raw here - otherwise if the directory is 'v2.0.3' it will be trimmed to '2.0.3' and be a 404
    return maxSatisifying.raw;
}

const BASE_URL_V3 = "https://mirror.openshift.com/pub/openshift-v3/clients/";
const BASE_URL_V4 = "https://mirror.openshift.com/pub/openshift-v4/clients/";

function resolveBaseDownloadDir(client: InstallableClient, desiredVersion: semver.Range): string {
    if (isOCV3(client, desiredVersion)) {
        return BASE_URL_V3;
    }

    const clientDirOverride = ClientDetailOverrides[client]?.directoryName;
    const clientDir = clientDirOverride ? clientDirOverride : client;

    const clientDirUrl = BASE_URL_V4 + clientDir + "/";

    // ghCore.info(`Resolved base download dir for ${client} to ${clientDirUrl}`);

    return clientDirUrl;
}
