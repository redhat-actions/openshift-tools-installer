import * as ghCore from "@actions/core";
import * as ghCache from "@actions/cache";
import * as ghIO from "@actions/io";
import * as ghGlob from "@actions/glob";
import * as path from "path";
import * as fs from "fs";

import { ClientFile } from "../util/types";
import { canExtract, extract } from "../util/unzip";
import {
    getArch, getExecutablesTargetDir, getOS, joinList,
} from "../util/utils";
import { downloadFile } from "./download";

// use for local development which the cache won't work for
const SKIP_CACHE_ENVVAR = "CLI_INSTALLER_SKIP_CACHE";

export async function retreiveFromCache(file: ClientFile): Promise<string | undefined> {
    const clientExecutablePath = await getExecutableTargetPath(file);

    if (process.env[SKIP_CACHE_ENVVAR]) {
        ghCore.info(`${SKIP_CACHE_ENVVAR} is set; skipping cache lookup`);
        return undefined;
    }

    ghCore.info(`Checking the cache for ${file.clientName} ${file.version}...`);
    const cacheKey = await ghCache.restoreCache([ clientExecutablePath ], getCacheKey(file));
    if (!cacheKey) {
        ghCore.info(`${file.clientName} ${file.version} was not found in the cache.`);
        return undefined;
    }

    ghCore.info(`⏩ ${file.clientName} ${file.version} was found in the cache`);
    return clientExecutablePath;
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
        const execuatbleFileGlob = `${extractedDir}/**/${executable}`;

        // as of now, helm has executable in the format '{executable}-{OS}-{arch}'
        const execuatbleWithArchFileGlob = `${extractedDir}/**/${executable}-${getOS()}-${getArch()}`;

        ghCore.debug(`Executable glob pattern is: ${execuatbleFileGlob}`);
        ghCore.debug(`Executable with OS and arch glob pattern is: ${execuatbleWithArchFileGlob}`);
        const patterns = [ execuatbleFileGlob, execuatbleWithArchFileGlob ];
        const globResult = await (await ghGlob.create(patterns.join("\n"))).glob();

        if (globResult.length === 0) {
            throw new Error(`${file.clientName} executable was not found in `
                + `${file.archiveFilename} downloaded from ${file.archiveFileUrl}.`);
        }
        else if (globResult.length > 1) {
            ghCore.warning(`Multiple files matching ${patterns.join(" ")} found in ${file.archiveFilename}: `
                + `${joinList(globResult)}. Selecting the first one "${globResult[0]}".`);
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
    if (process.env[SKIP_CACHE_ENVVAR]) {
        ghCore.info(`${SKIP_CACHE_ENVVAR} is set; skipping cache saving`);
        return;
    }

    ghCore.info(`💾 Saving ${file.clientName} ${file.version} into the cache`);

    try {
        await ghCache.saveCache([ clientExecutablePath ], getCacheKey(file));
    }
    catch (err) {
        ghCore.debug(`Cache upload error: ${JSON.stringify(err)}`);
        ghCore.warning(`Failed to cache ${file.clientName} ${file.version}: ${err}`);
    }
}

async function getExecutableTargetPath(file: ClientFile): Promise<string> {
    return path.join(await getExecutablesTargetDir(), getExecutable(file));
}

function getExecutable(file: ClientFile): string {
    return getOS() === "windows" ? `${file.clientName}.exe` : file.clientName;
}

function getCacheKey(file: ClientFile): string {
    return `${file.clientName}_${file.version}_${getOS()}_${getArch()}`;
}
