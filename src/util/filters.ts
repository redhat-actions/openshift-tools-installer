import * as ghCore from "@actions/core";
import { getOS, getArch } from "./utils";
import { InstallableClient } from "./types";
import { canExtract } from "./unzip";

type ClientFilterFunc = ((filename: string) => boolean);

export function filterClients(clientFiles: string[], filterFuncs: ClientFilterFunc[]): string[] {
    let filteredClientFiles = clientFiles;

    for (const filterFunc of filterFuncs) {
        if (filteredClientFiles.length <= 1) {
            ghCore.debug(`${filteredClientFiles.length} clients remaining; skipping ${filterFunc.name}.`);
            continue;   // remaining filters will also be skipped.
        }

        filteredClientFiles = filteredClientFiles.filter(filterFunc);
        ghCore.debug(`After ${filterFunc.name}, ${filteredClientFiles.length} files remain.`);
    }

    return filteredClientFiles;
}

/* eslint-disable no-invalid-this */

/**
 * For the ocp executables, the openshift client and installer executables are mixed into one directory.
 * @param this The name of the client executable.
 */
export function filterByExecutable(this: InstallableClient, filename: string): boolean {
    if (this === "oc") {
        // oc is short for openshift-client, which is what the files are named.
        return filename.includes("openshift-client");
    }
    return filename.includes(this);
}

/**
 * For the ocp executables, there are two copies of each - one versioned, one not.
 * @param this The version of the client executable to do a substring match on.
 */
export function filterByVersioned(this: string, filename: string): boolean {
    return filename.includes(this);
}

export function filterByOS(filename: string): boolean {
    // changing file name to lower case, as some files also have OS written in upper case letters
    const fileNameLowercase = filename.toLowerCase();
    const os = getOS();

    if (os === "macos") {
        return fileNameLowercase.includes("mac") || fileNameLowercase.includes("darwin");
    }
    if (os === "windows") {
        return fileNameLowercase.includes("win") && !fileNameLowercase.includes("darwin");
    }
    return fileNameLowercase.includes("linux");
}

export function filterByArch(filename: string): boolean {
    const fileNameLowercase = filename.toLowerCase();
    const arch = getArch();
    if (arch === "arm64") {
        return fileNameLowercase.includes(arch) || fileNameLowercase.includes("aarch64");
    }
    if (arch === "amd64") {
        // adding "64bit" as most of the binaries in GitHub release has "64bit" for "amd64"
        return fileNameLowercase.includes(arch) || fileNameLowercase.includes("64bit")
            || fileNameLowercase.includes("x86_64");
    }
    return fileNameLowercase.includes(arch);
}

export function filterByZipped(filename: string): boolean {
    return canExtract(filename);
}

export function filterByNotZipped(filename: string): boolean {
    return !canExtract(filename);
}
