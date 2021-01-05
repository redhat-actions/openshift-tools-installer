
import * as ghCore from "@actions/core";
import * as ghToolCache from "@actions/tool-cache";
import * as path from "path";
import * as fs from "fs";
import * as crypto from "crypto";
// import got from "got";

import { ClientFile } from "../util/types";
import { canExtract, extract } from "../util/unzip";
import { getOS, getSize, getTmpDir } from "../util/utils";

export async function uncache(file: ClientFile): Promise<string | undefined> {
    const cachedPath = ghToolCache.find(file.clientName, file.version);
    if (!cachedPath) {
        ghCore.info(`${file.clientName} ${file.version} was not found in the cache.`);
        return undefined;
    }

    ghCore.info(`${file.clientName} ${file.version} was found in the cache at ${cachedPath}`);
    return cachedPath;
}

export async function downloadIntoCache(file: ClientFile): Promise<string> {
    const downloadPath = await download(file);

    let extractedDir: string | undefined;
    if (canExtract(downloadPath)) {
        await extract(downloadPath);
    }
    else {
        // as of now, only 'helm' is not an archive
        ghCore.debug(`Download ${file.archiveFileUrl} at ${downloadPath} does not appear to be an archive`);
    }

    let clientExecutablePath;
    let clientExecutableName;
    if (extractedDir) {
        const extractedDirContents = await fs.promises.readdir(extractedDir);
        clientExecutableName = extractedDirContents.find((filename) => filename === file.clientName || filename === `${file.clientName}.exe`);
        if (!clientExecutableName) {
            throw new Error(`${file.clientName} executable was not found in ${file.archiveFilename} downloaded from ${file.archiveFileUrl}. ` +
                `Contents were "${extractedDirContents.join(", ")}"`);
        }
        clientExecutablePath = path.join(extractedDir, clientExecutableName);
    }
    else {
        // we assume the downloaded file is the executable itself - we just have to have cacheFile copy and rename it
        clientExecutablePath = downloadPath;
        clientExecutableName = getOS() === "windows" ? `${file.clientName}.exe` : `${file.clientName}`;
    }

    ghCore.info(`Saving ${file.clientName} ${file.version} into tool cache as ${clientExecutableName}`);
    const cachedDestFile = await ghToolCache.cacheFile(clientExecutablePath, clientExecutableName, file.clientName, file.version);
    return cachedDestFile;
}

/**
 * @returns The path the given file was downloaded to.
 */
async function download(file: ClientFile): Promise<string> {
    // tool-cache download downloads to /tmp/<guid> to prevent collisions. we mimic that behaviour here but keep the file's name
    // so it has the correct extension
    // a GUID is 128 bits = 16 bytes
    const guid = crypto.randomBytes(16).toString("hex");
    const filename = `${guid}-${file.archiveFilename}`;

    const size = await getSize(file.archiveFileUrl);
    ghCore.info(`Downloading ${size} ${file.archiveFileUrl}...`);
    const dlStartTime = Date.now();
    const downloadPath = await ghToolCache.downloadTool(file.archiveFileUrl, path.join(getTmpDir(), filename));
    ghCore.debug(`Downloaded to ${downloadPath}`);
    ghCore.info(`Downloaded ${file.archiveFilename} in ${Date.now() - dlStartTime}ms`);
    return downloadPath;
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
