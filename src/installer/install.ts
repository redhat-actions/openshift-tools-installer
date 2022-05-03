import * as ghCore from "@actions/core";
import * as ghCache from "@actions/cache";
import * as ghIO from "@actions/io";
import * as ghGlob from "@actions/glob";
import * as path from "path";
import * as fs from "fs";

import { ClientFile, GITHUB } from "../util/types";
import { canExtract, extract } from "../util/unzip";
import {
    getArch, getExecutablesTargetDir, getOS, joinList,
} from "../util/utils";
import { shouldUseCache } from "../util/cache-utils";
import { downloadFile } from "./download";

export async function retreiveFromCache(file: ClientFile): Promise<string | undefined> {
    if (shouldUseCache()) {
        const clientExecutablePath = await getExecutableTargetPath(file);
        ghCore.info(`Checking the cache for ${file.clientName} ${file.version}...`);

        try {
            const cacheKey = await ghCache.restoreCache([ clientExecutablePath ], getCacheKey(file));
            if (!cacheKey) {
                ghCore.info(`${file.clientName} ${file.version} was not found in the cache.`);
                return undefined;
            }
        }
        catch (err) {
            ghCore.warning(`Failed to check cache for ${file.clientName} ${file.version}: ${err}`);
            ghCore.debug(`Cache check error: ${JSON.stringify(err)}`);
            return undefined;
        }

        ghCore.info(`📂 ${file.clientName} ${file.version} was found in the cache.`);
        return clientExecutablePath;
    }

    return undefined;
}

/**
 * Download the given file, extract it and move it into the expected location as determined by getExecutableTargetPath.
 * @returns The absolute path to the extracted, relocated executable.
 */
export async function downloadAndInstall(file: ClientFile): Promise<string> {
    const downloadPath = await downloadFile(file);

    let extractedDir: string | undefined;
    if (canExtract(downloadPath)) {
        extractedDir = await extract(downloadPath);

        try {
            await fs.promises.unlink(downloadPath);
            ghCore.info(`Removed ${downloadPath}`);
        }
        catch (err) {
            ghCore.info(`Failed to remove ${downloadPath}: ${err}`);
        }
    }
    else {
        // 'helm' is not an archive before version '3.5.0'
        ghCore.debug(`Download ${file.archiveFileUrl} at ${downloadPath} does not appear to be an archive`);
    }

    let clientExecutableTmpPath;
    if (extractedDir) {
        const executable = getExecutable(file);
        let executableWithoutExe;
        if (getOS() === "windows") {
            executableWithoutExe = executable.substring(0, executable.length - path.extname(executable).length);
        }

        // array consisting of possiblilties of executable file name
        const executableFileGlobArray: string[] = [];

        executableFileGlobArray.push(`${executable}`);

        // as of now, helm has executable in the format '{executable}-{OS}-{arch}'
        executableFileGlobArray.push(`${executable}-${getOS()}-${getArch()}`);

        // also removing '.exe' that gets appended if OS is 'windows'
        executableFileGlobArray.push(`${executableWithoutExe}-${getOS()}-${getArch()}.exe`);

        // executable can also be in form of '{rawOS}-{Arch}-{executable}'
        // e.g. 'darwin-amd64-opm'
        executableFileGlobArray.push(`${process.platform}-${getArch()}-${executable}`);

        // executable can also be in form of '{executable}-{rawOS}-{Arch}'
        // e.g. 'odo-darwin-amd64'
        executableFileGlobArray.push(`${executable}-${process.platform}-${getArch()}`);

        // opm has executable for windows platform in the form of '{OS}-{Arch}-{execuatable}'
        // e.g. 'windows-amd64-opm'
        // also removing '.exe' that gets appended if OS is 'windows'
        executableFileGlobArray.push(`${getOS()}-${getArch()}-${executableWithoutExe}`);

        ghCore.debug(`Executable glob patterns are: ${executableFileGlobArray.join(" ")}`);

        const globResult = await (await ghGlob.create(executableFileGlobArray
            .map((executableGlob) => `${extractedDir}/**/${executableGlob}`).join("\n"))).glob();

        if (globResult.length === 0) {
            throw new Error(`${file.clientName} executable was not found in `
                + `${file.archiveFilename} downloaded from ${file.archiveFileUrl}`);
        }
        else if (globResult.length > 1) {
            ghCore.warning(`Multiple files matching ${executableFileGlobArray.join(" ")} found in `
                + `${file.archiveFilename}: ${joinList(globResult)}. Selecting the first one "${globResult[0]}".`);
        }

        clientExecutableTmpPath = globResult[0];
    }
    else {
        // we assume the downloaded file is the executable itself - we just have to have to move/rename it
        clientExecutableTmpPath = downloadPath;
    }

    const clientExecutableFinalPath = await getExecutableTargetPath(file);
    ghCore.debug(`Move ${clientExecutableTmpPath} to ${clientExecutableFinalPath}`);
    await ghIO.mv(clientExecutableTmpPath, clientExecutableFinalPath);

    const chmod = "755";
    ghCore.debug(`chmod ${chmod} ${clientExecutableFinalPath}`);
    await fs.promises.chmod(clientExecutableFinalPath, chmod);
    return clientExecutableFinalPath;
}

export async function saveIntoCache(clientExecutablePath: string, file: ClientFile): Promise<void> {
    if (shouldUseCache()) {
        ghCore.info(`💾 Saving ${file.clientName} ${file.version} into the cache`);

        try {
            await ghCache.saveCache([ clientExecutablePath ], getCacheKey(file));
        }
        catch (err) {
            ghCore.debug(`Cache upload error: ${JSON.stringify(err)}`);
            ghCore.warning(`Failed to cache ${file.clientName} ${file.version}: ${err}`);
        }
    }
}

async function getExecutableTargetPath(file: ClientFile): Promise<string> {
    return path.join(await getExecutablesTargetDir(), getExecutable(file));
}

function getExecutable(file: ClientFile): string {
    return getOS() === "windows" ? `${file.clientName}.exe` : file.clientName;
}

function getCacheKey(file: ClientFile): string {
    // to uniquely identify cache key for tools installed from GitHub
    if (!file.mirrorDirectoryUrl) {
        return `${file.clientName}_${file.version}_${getOS()}_${getArch()}_${GITHUB}`;
    }
    return `${file.clientName}_${file.version}_${getOS()}_${getArch()}`;
}
