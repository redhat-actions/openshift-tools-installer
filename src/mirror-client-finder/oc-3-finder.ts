import * as ghCore from "@actions/core";
import * as semver from "semver";

import { ClientDirectory, ClientFile, InstallableClient } from "../util/types";
import { getOS, getArch } from "../util/utils";

const OC_V3_FILENAME = "oc.tar.gz";
const OC_V3_FILENAME_WINDOWS = "oc.zip";

export function isOCV3(client: InstallableClient, desiredVersionRange: semver.Range): boolean {
    return client === "oc" && semver.gtr("4.0.0", desiredVersionRange);
}

/**
 * The v3 download site, which contains only 'oc' 3, has a different structure.
 * So, once the directory is located, we follow this unique code path to locate the archive file.
 */
export async function getOCV3File(baseDir: ClientDirectory, desiredRange: semver.Range): Promise<ClientFile> {
    // We take /clients/<version> (as given already) and have to append the operating system and architecture to it.
    // Each of these subdirectory has exactly one file.

    const subdir = getOCV3Subdir();
    ghCore.debug(`oc v3 subdirectory is ${subdir}`);
    const directoryUrl = `${baseDir.url}${subdir}/`;

    const filename = getOS() === "windows" ? OC_V3_FILENAME_WINDOWS : OC_V3_FILENAME;
    const fileUrl = `${directoryUrl}${filename}`;

    return {
        archiveFilename: OC_V3_FILENAME,
        archiveFileUrl: fileUrl,
        clientName: "oc",
        mirrorDirectoryUrl: directoryUrl,
        version: baseDir.version,
        versionRange: desiredRange,
    };
}

function getOCV3Subdir(): string {
    const os = getOS();
    const arch = getArch();

    // refer to eg https://mirror.openshift.com/pub/openshift-v3/clients/3.11.346/ for the structure that's mimiced here.
    if (arch === "amd64") {
        if (os === "windows") {
            return "windows";
        }
        if (os === "macos") {
            return "macosx";
        }
        return "linux";
    }

    if (os === "linux") {
        if (arch === "arm64") {
            return "linux-aarch64";
        }
        if (arch === "ppc64le") {
            return "linux-ppc64le";
        }
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (arch === "s390x") {
            return "linux-s390x";
        }
        throw new Error(`Unsupported architecture "${arch}".`);
    }

    throw new Error("Only AMD64 binaries are available for non-linux platforms.");
}
