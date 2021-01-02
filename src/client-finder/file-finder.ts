import * as ghCore from "@actions/core";
import * as semver from "semver";
import * as path from "path";

import { InstallableClient } from "../util/types";
import { getOS, getArch } from "../util/utils";
import { fetchDirContents, findClientDir } from "./directory-finder";

export async function findClientFile(client: InstallableClient, desiredVersion: semver.Range): Promise<string> {
    const dir = await findClientDir(client, desiredVersion);

    const clientFiles = await fetchDirContents(dir);

    ghCore.info(`${client} downloadables: ${clientFiles.join(", ")}`);

    let filteredClientFiles = filterByOS(clientFiles);
    ghCore.debug(`After OS filter ${filteredClientFiles.length} files remain: ${filteredClientFiles.join(", ")}`);

    if (filteredClientFiles.length > 1) {
        filteredClientFiles = filterByArch(filteredClientFiles);
        ghCore.debug(`After Arch filter ${filteredClientFiles.length} files remain: ${filteredClientFiles.join(", ")}`);
    }

    if (filteredClientFiles.length > 1) {
        filteredClientFiles = filterByZipped(filteredClientFiles);
        ghCore.debug(`After Zipped filter ${filteredClientFiles.length} files remain: ${filteredClientFiles.join(", ")}`);
    }

    if (filteredClientFiles.length > 1) {
        ghCore.warning(`Multiple files were found that matched the current OS and architecture for ${client}: ${filteredClientFiles.join(", ")}. Selecting the first one.`);
    }
    else if (filteredClientFiles.length === 0) {
        ghCore.error(`No files were found that match the current OS and architecture for ${client}.`);
    }

    return `${dir}/${filteredClientFiles[0]}`;
}

function filterByOS(clientFiles: string[]): string[] {
    const os = getOS();

    const filtered = clientFiles.filter((filename) => {
        if (os === "macos") {
            return filename.includes("mac") || filename.includes("darwin");
        }
        else if (os === "windows") {
            return filename.includes("win");
        }
        return filename.includes("linux");
    });

    if (filtered.length === 0) {
        throw new Error(`No downloadable was found for the current operating system ${os}.`);
    }

    return filtered;
}

function filterByArch(clientFiles: string[]): string[] {
    const arch = getArch();

    const filtered = clientFiles.filter((filename) => {
        return filename.includes(arch);
    });

    if (filtered.length === 0) {
        throw new Error(`No downloadable was found for the current architecture ${arch}.`);
    }

    return filtered;
}

function filterByZipped(clientFiles: string[]): string[] {
    return clientFiles.filter((filename) => [ ".zip", ".gz" ].includes(path.extname(filename)));
}
