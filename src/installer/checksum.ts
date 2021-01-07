import * as ghCore from "@actions/core";
import * as crypto from "crypto";
import * as fs from "fs";

import { HttpClient } from "../util/utils";
import { ClientFile } from "../util/types";
import { getDirContents } from "../client-finder/directory-finder";
import { isOCV3 } from "../client-finder/oc-3-finder";

const SHA_FILENAME = "sha256sum.txt";
type HashAlgorithm = "md5" | "sha256";

export async function verifyChecksum(downloadedArchivePath: string, clientFile: ClientFile): Promise<void> {
    const correctHash = await getOnlineHash(clientFile);
    if (correctHash == null) {
        return;
    }

    const actualHash = await hashFile(downloadedArchivePath, correctHash.algorithm);
    ghCore.debug(`Correct hash for ${clientFile.archiveFilename} is ${correctHash.hash}`);
    ghCore.debug(`Actual hash for ${clientFile.archiveFilename} is  ${actualHash}`);

    if (correctHash.hash !== actualHash) {
        throw new Error(`Checksum for ${downloadedArchivePath} downloaded from ${clientFile.archiveFileUrl} ` +
            `did not match the checksum downloaded from ${correctHash.hashFileUrl}`);
    }

    ghCore.info(`${correctHash.algorithm} verification of ${clientFile.archiveFilename} succeeded.`);
}

async function hashFile(downloadedArchivePath: string, algorithm: HashAlgorithm): Promise<string> {
    const hash = crypto.createHash(algorithm).setEncoding("hex");

    return new Promise<string>((resolve, reject) => {
        fs.createReadStream(downloadedArchivePath)
            .on("error", reject)
            .pipe(hash)
            .once("finish", () => {
                hash.end();
                resolve(hash.read());
            });
    });
}

async function getOnlineHash(clientFile: ClientFile): Promise<{ algorithm: HashAlgorithm, hash: string, hashFileUrl: string } | undefined> {
    const directoryContents = await getDirContents(clientFile.directoryUrl);

    // this is the hash kamel uses - the others use the sha256 txt file
    const md5Filename = clientFile.archiveFilename + ".md5";

    let algorithm: HashAlgorithm;
    let hashFilename: string;
    if (directoryContents.includes(SHA_FILENAME)) {
        algorithm = "sha256";
        hashFilename = SHA_FILENAME;
    }
    else if (directoryContents.includes(md5Filename)) {
        algorithm = "md5";
        hashFilename = md5Filename;
    }
    else {
        // oc v3 lacks hash files; others should have them.
        if (isOCV3(clientFile.clientName, clientFile.versionRange)) {
            ghCore.info("Hash verification is not available for oc v3.");
        }
        else {
            ghCore.warning(`No hash file found under ${clientFile.directoryUrl} for ${clientFile.archiveFilename} - skipping verification.`);
        }
        return undefined;
    }

    const hashFileUrl = `${clientFile.directoryUrl}/${hashFilename}`;
    ghCore.info(`⬇️ Downloading hash file from ${hashFileUrl}`);

    const hashFileRes = await HttpClient.get(hashFileUrl, { "Content-Type": "text/plain" });
    const hashFileContents = await hashFileRes.readBody();
    const hash = parseHashFile(hashFileContents, clientFile.archiveFilename);

    return { algorithm, hash, hashFileUrl };
}

/**
 * @returns The sha or md5 hash for the given file.
 */
function parseHashFile(hashFileContents: string, fileToHash: string): string {
    // the hash file format is:
    // ${hash} ${filename}\n
    // for all filenames in the directory.

    // lines is an array of arrays where the outer array is lines and the inner array is space-split tokens.
    const lines = hashFileContents.split("\n").map((line) => line.split(/\s+/));

    // so, line[0] is the sha and line[1] is the filename
    const fileLine = lines.find((line) => line[1] === fileToHash);
    if (fileLine == null) {
        throw new Error(`Did not find file "${fileToHash}" in the given checksum file`);
    }

    const hash = fileLine[0];
    return hash;
}
