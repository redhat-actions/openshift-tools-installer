
import * as ghCore from "@actions/core";
import * as ghCache from "@actions/cache";
import * as ghIO from "@actions/io";
import * as path from "path";
import * as fs from "fs";

import { ClientFile } from "./util/types";
import { canExtract, extract } from "./util/unzip";
import { getOS } from "./util/utils";
import { downloadFile } from "./download";

export async function retreiveFromCache(file: ClientFile): Promise<string | undefined> {
    const clientPath = await getExecutableTargetPath(file);

    const cacheKey = await ghCache.restoreCache([ clientPath ], getCacheKey(file));
    if (!cacheKey) {
        ghCore.info(`${file.clientName} ${file.version} was not found in the cache.`);
        return undefined;
    }

    ghCore.info(`${file.clientName} ${file.version} was found in the cache`);
    return clientPath;
}

export async function downloadAndCache(file: ClientFile): Promise<string> {
    const downloadPath = await downloadFile(file);

    let extractedDir: string | undefined;
    if (canExtract(downloadPath)) {
        extractedDir = await extract(downloadPath);
    }
    else {
        // as of now, only 'helm' is not an archive
        ghCore.debug(`Download ${file.archiveFileUrl} at ${downloadPath} does not appear to be an archive`);
    }

    let clientExecutableTmpPath;
    let clientExecutableName;
    if (extractedDir) {
        const extractedDirContents = await fs.promises.readdir(extractedDir);
        clientExecutableName = extractedDirContents.find((filename) => filename === file.clientName || filename === `${file.clientName}.exe`);
        if (!clientExecutableName) {
            throw new Error(`${file.clientName} executable was not found in ${file.archiveFilename} downloaded from ${file.archiveFileUrl}. ` +
                `Contents were "${extractedDirContents.join(", ")}"`);
        }
        clientExecutableTmpPath = path.join(extractedDir, clientExecutableName);
    }
    else {
        // we assume the downloaded file is the executable itself - we just have to have cacheFile copy and rename it
        clientExecutableTmpPath = downloadPath;
        clientExecutableName = getOS() === "windows" ? `${file.clientName}.exe` : `${file.clientName}`;
    }

    const clientExecutableFinalPath = await getExecutableTargetPath(file);
    ghCore.info(`Move ${clientExecutableTmpPath} to ${clientExecutableFinalPath}`);
    await ghIO.mv(clientExecutableTmpPath, clientExecutableFinalPath);
    const chmod = "755";
    ghCore.info(`chmod ${chmod} ${clientExecutableFinalPath}`);
    await fs.promises.chmod(clientExecutableFinalPath, chmod);

    ghCore.info(`Saving ${file.clientName} ${file.version} into cache`);
    await ghCache.saveCache([ clientExecutableFinalPath ], getCacheKey(file));

    return clientExecutableFinalPath;
}

const TARGET_DIRNAME = "openshift-clis";

let targetDir: string | undefined;
export async function getExecutablesTargetDir(): Promise<string> {
    if (targetDir) {
        return targetDir;
    }

    let parentDir;

    const runnerWorkdir = process.env["GITHUB_WORKSPACE"];
    if (runnerWorkdir) {
        parentDir = runnerWorkdir;
    }
    else {
        parentDir = process.cwd();
    }

    targetDir = path.join(parentDir, TARGET_DIRNAME);
    await ghIO.mkdirP(targetDir);
    ghCore.info(`Created ${targetDir}`);
    ghCore.addPath(targetDir);
    ghCore.info(`Added ${targetDir} to PATH`);

    return targetDir;
}

async function getExecutableTargetPath(file: ClientFile): Promise<string> {
    return path.join(await getExecutablesTargetDir(), getExecutable(file));
}

function getExecutable(file: ClientFile): string {
    return getOS() === "windows" ? `${file.clientName}.exe` : file.clientName;
}

function getCacheKey(file: ClientFile): string {
    return `${file.clientName}_${file.version}`;
}

/*
const SHA_FILENAME = "sha256sum.txt";

async function getChecksum(directory: string, filename: string): Promise<string | undefined> {
    const shaFileUrl = `${directory}/${SHA_FILENAME}`;
    ghCore.debug(`Fetching sha file from ${shaFileUrl}`);

    const shaFile = (await got.get(shaFileUrl)).body;

    // the shafile format is:
    // ${checksum} ${filename}\n
    // for all filenames in the directory.

    // lines is an array of arrays where the outer array is lines and the inner array is space-split tokens.
    const lines = shaFile.split("\n").map((line) => line.split(/\s+/));

    // so, line[0] is the sha and line[1] is the filename
    const fileLine = lines.find((line) => line[1] === filename);
    if (fileLine == null) {
        throw new Error(`Did not find to find file "${filename}" in ${shaFileUrl}`);
    }

    const sha = fileLine[0];
    ghCore.debug(`Checksum for ${filename} is ${sha}`);
    return sha;
}

*/
