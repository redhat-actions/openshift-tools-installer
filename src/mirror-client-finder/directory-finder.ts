import * as ghCore from "@actions/core";
import * as cheerio from "cheerio";
import * as semver from "semver";
import { Inputs } from "../generated/inputs-outputs";

import { ClientDetailOverrides, ClientDirectory, InstallableClient } from "../util/types";
import { assertOkStatus, getOS, HttpClient } from "../util/utils";
import { findMatchingVersion } from "../util/version-utils";
import { isOCV3 } from "./oc-3-finder";

/**
 * @returns The client directory for the maximum version of client that satisfies the desiredVersionRange range.
 */
export async function findClientDir(client: InstallableClient, desiredVersionRange: semver.Range):
    Promise<ClientDirectory> {
    const clientBaseDir = resolveBaseDownloadDir(client, desiredVersionRange);
    ghCore.info(`Download directory for ${client} is ${clientBaseDir}`);
    const availableVersions = await getDirContents(clientBaseDir);
    const clientMatchedVersion = await findMatchingVersion(
        client, availableVersions, desiredVersionRange, clientBaseDir
    );
    const clientVersionedDir = clientBaseDir + clientMatchedVersion + "/";

    if (client === Inputs.CRC && getOS() === "macos" && semver.gte(clientMatchedVersion, "1.28.0")) {
        throw new Error(`❌ ${Inputs.CRC} ${clientMatchedVersion} cannot be installed on macOS. `
        + `For details see https://github.com/redhat-actions/openshift-tools-installer/issues/39`);
    }

    return {
        client,
        version: clientMatchedVersion,
        url: clientVersionedDir,
    };
}

const BASE_URL_V3 = "https://mirror.openshift.com/pub/openshift-v3/clients/";
const BASE_URL_V4 = "https://mirror.openshift.com/pub/openshift-v4/clients/";
const DEVELOPERS_BASE_URL = "https://developers.redhat.com/content-gateway/rest/mirror/pub/openshift-v4/clients/";

function resolveBaseDownloadDir(client: InstallableClient, desiredVersionRange: semver.Range): string {
    if (isOCV3(client, desiredVersionRange)) {
        return BASE_URL_V3;
    }

    // the default directoryName is client, unless there's a matching entry in the overrides.
    const clientDirOverride = ClientDetailOverrides[client]?.mirror?.directoryName;
    const clientDir = clientDirOverride || client;

    let clientDirUrl = `${BASE_URL_V4 + clientDir}/`;

    // odo moved to the new location, more details here https://github.com/redhat-actions/openshift-tools-installer/issues/66
    if (client === "odo") {
        clientDirUrl = `${DEVELOPERS_BASE_URL + clientDir}/`;
    }
    // ghCore.info(`Resolved base download dir for ${client} to ${clientDirUrl}`);

    return clientDirUrl;
}

export async function getDirContents(dirUrl: string): Promise<string[]> {
    ghCore.debug(`GET ${dirUrl}`);

    const directoryPageRes = await HttpClient.get(dirUrl, { Accept: "text/html" });
    await assertOkStatus(directoryPageRes);
    const directoryPage = await directoryPageRes.readBody();

    const $ = cheerio.load(directoryPage);

    const linkedFiles = $("td a").toArray().map((e) => {
        // We have to use the href because the text sometimes gets cut off and suffixed with '...'
        // not sure what causes this, since there's no screen size
        let filename = $(e).attr("href");
        if (!filename) {
            const text = $(e).text();
            ghCore.debug(`No href for element with text "${text}"`);
            filename = text;
        }
        // in case of "crc" href is "https://mirror.openshift.com/pub/openshift-v4/clients/crc/1.25.0/"
        // whereas in other cases it is only version i.e. "1.25.0"
        // therefore handling this case separately
        const filenameSplitted = filename.split("/");
        if (filename.endsWith("/")) {
            filename = filenameSplitted[filenameSplitted.length - 2];
        }
        else {
            filename = filenameSplitted[filenameSplitted.length - 1];
        }
        return filename;
    });

    if (linkedFiles[0] === "Parent Directory" || linkedFiles[0].startsWith("/pub")) {
        // remove link to parent directory
        linkedFiles.shift();
    }

    return linkedFiles;
}
