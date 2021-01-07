import * as ghCore from "@actions/core";
import * as semver from "semver";

import { ClientDirectory, ClientFile, InstallableClient } from "../util/types";
import { getOS, getArch } from "../util/utils";

const OC_V3_FILENAME = "oc.tar.gz";
const OC_V3_FILENAME_WINDOWS = "oc.zip";

export function isOCV3(client: InstallableClient, desiredVersion: semver.Range): boolean {
    return client === "oc" && semver.gtr("4.0.0", desiredVersion);
}

/**
 * The v3 download site, which contains only 'oc' 3, has a different structure.
 */
export async function getOCV3File(baseDir: ClientDirectory, desiredRange: semver.Range): Promise<ClientFile> {
    // We take /clients/<version> (as given already) and have to append the operating system and architecture to it.
    // Each of these subdirectory has exactly one file.

    const subdir = getOCV3Subdir();
    ghCore.debug(`oc v3 subdirectory is ${subdir}`);
    const directoryUrl = `${baseDir.url}/${subdir}`;

    const filename = getOS() === "windows" ? OC_V3_FILENAME_WINDOWS : OC_V3_FILENAME;
    const fileUrl = `${directoryUrl}/${filename}`;

    return {
        archiveFilename: OC_V3_FILENAME,
        archiveFileUrl: fileUrl,
        clientName: "oc",
        directoryUrl,
        version: baseDir.version,
        versionRange: desiredRange,
    };
}

function getOCV3Subdir(): string {
    const os = getOS();
    const arch = getArch();

    // refer to eg https://mirror.openshift.com/pub/openshift-v3/clients/3.11.346/
    if (arch === "amd64") {
        if (os === "windows") {
            return "windows";
        }
        else if (os === "macos") {
            return "macosx";
        }
        return "linux";
    }

    if (os === "linux") {
        if (arch === "arm64") {
            return "linux-aarch64";
        }
        else if (arch === "ppc64le") {
            return "linux-ppc64le";
        }
        else if (arch === "s390x") {
            return "linux-s390x";
        }
        throw new Error(`Unsupported architecture "${arch}".`);
    }

    throw new Error("Only AMD64 binaries are available for non-linux platforms.");
}
