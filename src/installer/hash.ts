import * as ghCore from "@actions/core";
import * as crypto from "crypto";
import * as fs from "fs";

import { HttpClient, getGitHubReleaseAssetPath, isMirrorClient } from "../util/utils";
import { ClientDetailOverrides, ClientFile } from "../util/types";
import { getDirContents } from "../mirror-client-finder/directory-finder";
import { isOCV3 } from "../mirror-client-finder/oc-3-finder";
import { getReleaseAssets } from "../github-client-finder/repository-finder";
import { Inputs } from "../generated/inputs-outputs";

const SHA_FILENAMES = [ "sha256sum.txt", "SHA256_SUM", "checksums.txt", "checksums" ];
type HashAlgorithm = "md5" | "sha256";

/**
 * Verify that the downloadedArchive has the hash it should have according to the hash file in the online directory.
 * @returns void, and throws an error if the verification fails.
 */
export async function verifyHash(downloadedArchivePath: string, clientFile: ClientFile): Promise<void> {
    const correctHash = await getOnlineHash(clientFile);
    if (correctHash == null) {
        return;
    }

    const actualHash = await hashFile(downloadedArchivePath, correctHash.algorithm);
    ghCore.debug(`Correct hash for ${clientFile.archiveFilename} is ${correctHash.hash}`);
    ghCore.debug(`Actual hash for ${clientFile.archiveFilename} is  ${actualHash}`);

    if (correctHash.hash !== actualHash) {
        throw new Error(
            `${correctHash.algorithm} hash for ${downloadedArchivePath} downloaded from ${clientFile.archiveFileUrl} `
            + `did not match the hash downloaded from ${correctHash.hashFileUrl}.`
            + `\nExpected: "${correctHash.hash}"\nReceived: "${actualHash}"`,
        );
    }

    ghCore.info(`${correctHash.algorithm} verification of ${clientFile.archiveFilename} succeeded.`);
}

/**
 * @returns The hash for the given file, using the given algorithm.
 */
async function hashFile(file: string, algorithm: HashAlgorithm): Promise<string> {
    ghCore.debug(`${algorithm} hashing ${file}...`);
    const hash = crypto.createHash(algorithm).setEncoding("hex");

    return new Promise<string>((resolve, reject) => {
        fs.createReadStream(file)
            .on("error", reject)
            .pipe(hash)
            .once("finish", () => {
                hash.end();
                resolve(hash.read());
            });
    });
}

type HashFileContents = { algorithm: HashAlgorithm, hash: string, hashFileUrl: string };

/**
 * Fetches the hashes for the clientFile's directory, then extracts and returns the hash for the given clientFile.
 */
async function getOnlineHash(clientFile: ClientFile): Promise<HashFileContents | undefined> {
    let directoryContents;

    if (isMirrorClient(clientFile)) {
        directoryContents = await getDirContents(clientFile.mirrorDirectoryUrl);
    }
    else {
        directoryContents = await getReleaseAssets(clientFile.clientName, clientFile.version);
    }

    // this is the hash kamel uses - the others use the sha256 txt file
    const md5Filename = `${clientFile.archiveFilename}.md5`;

    // crda checksum file is crda_0.2.3_checksums.txt
    const version = clientFile.version;
    const crdaVersionedShaFilename = `${clientFile.clientName}_${version.slice(1, version.length)}_checksums.txt`;
    const crdaShaFilenames = [ ...SHA_FILENAMES, crdaVersionedShaFilename ];

    const matchedShaFilename = directoryContents.find((file) => crdaShaFilenames.includes(file));

    let algorithm: HashAlgorithm;
    let hashFilename: string;
    if (matchedShaFilename) {
        algorithm = "sha256";
        hashFilename = matchedShaFilename;
    }
    else if (directoryContents.includes(md5Filename)) {
        algorithm = "md5";
        hashFilename = md5Filename;
    }
    else {
        // oc v3 lacks hash files; others should have them.
        if (
            isOCV3(clientFile.clientName, clientFile.versionRange)
            || (!isMirrorClient(clientFile) && ClientDetailOverrides[clientFile.clientName]?.github?.isHashMissing)
            || (isMirrorClient(clientFile) && ClientDetailOverrides[clientFile.clientName]?.mirror?.isHashMissing)
        ) {
            ghCore.info(`Hash verification is not available for ${clientFile.clientName} ${clientFile.version}.`);
        }
        else {
            // should this fail the install?
            // with the warning behaviour, removing the hash file would mean the executables could be compromised.
            // but, at that point, they could also just edit the hashes to match the malicious executables.
            ghCore.warning(`No hash file found for ${clientFile.archiveFilename} - skipping verification.`);
        }
        return undefined;
    }

    let hashFileUrl;
    if (clientFile.mirrorDirectoryUrl) {
        hashFileUrl = `${clientFile.mirrorDirectoryUrl}${hashFilename}`;
    }
    else {
        hashFileUrl = getGitHubReleaseAssetPath(clientFile.clientName, clientFile.version, hashFilename);
    }

    ghCore.info(`⬇️ Downloading hash file ${hashFileUrl}`);

    const hashFileRes = await HttpClient.get(hashFileUrl, { "Content-Type": "text/plain" });
    const hashFileContents = await hashFileRes.readBody();
    let hash;

    if (clientFile.clientName === Inputs.YQ) {
        hash = await fetchHashForyq(clientFile, hashFileContents);
    }
    else {
        hash = parseHashFile(hashFileContents, clientFile.archiveFilename);
    }

    return { algorithm, hash, hashFileUrl };
}

/**
 * @returns The hash for fileToHash, as extracted from the hashFileContents.
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
        throw new Error(`Did not find file "${fileToHash}" in the given hash file`);
    }

    const hash = fileLine[0];
    return hash;
}

async function fetchHashForyq(clientFile: ClientFile, hashFileContents: string): Promise<string> {
    const checksumHashesOrderfileUrl = getGitHubReleaseAssetPath(
        clientFile.clientName, clientFile.version, "checksums_hashes_order",
    );
    const checksumHashesOrderRes = await HttpClient.get(
        checksumHashesOrderfileUrl, { "Content-Type": "text/plain" }
    );
    const checksumHashesOrdercontents = await checksumHashesOrderRes.readBody();
    return parseHashFileForYq(hashFileContents, checksumHashesOrdercontents, clientFile.archiveFilename);
}

/**
 * Since yq has checksum file in different format from other clients.
 * @returns The hash for fileToHash, as extracted from the hashFileContents.
 */
function parseHashFileForYq(hashFileContents: string, checksumHashesOrdercontents: string, fileToHash: string): string {

    // finding the position of 'SHA-256' hash in orders file present at
    // https://github.com/mikefarah/yq/releases/download/v4.9.3/checksums
    const checksumHashesOrder = checksumHashesOrdercontents.split("\n");
    const index = checksumHashesOrder.indexOf("SHA-256");

    // the hash file is present at https://github.com/mikefarah/yq/releases/download/v4.9.3/checksums
    // format of the hash file is: ${filename} ${hash}\n
    // for all filenames in the directory.

    // lines is an array of arrays where the outer array is lines and the inner array is space-split tokens.
    const lines = hashFileContents.split("\n").map((line) => line.split(/\s+/));

    // so, line[0] is the filename and line[index+1] is the sha256
    const fileLine = lines.find((line) => line[0] === fileToHash);
    if (fileLine == null) {
        throw new Error(`Did not find file "${fileToHash}" in the given hash file`);
    }

    const hash = fileLine[index + 1];
    return hash;
}
