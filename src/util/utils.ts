import * as ghCore from "@actions/core";
import * as http from "@actions/http-client";
import * as ghIO from "@actions/io";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import { IHttpClientResponse } from "@actions/http-client/interfaces";
import {
    ClientDetailOverrides, ClientFile, InstallableClient, MirrorClient,
} from "./types";

export const HttpClient = new http.HttpClient();

export async function assertOkStatus(res: IHttpClientResponse): Promise<void> {
    const status = res.message.statusCode;
    if (status !== undefined && status >= 400) {
        const method = res.message.method?.toUpperCase();
        const url = res.message.url;
        const body = await res.readBody();

        if (url) {
            if (method) {
                throw new Error(`Received status ${status} from ${method} request to ${url}: ${body}`);
            }
            else {
                throw new Error(`Received status ${status} from request to ${url}: ${body}`);
            }
        }
        else if (method) {
            throw new Error(`Received status ${status} from ${method}: ${body}`);
        }
        else {
            throw new Error(`Received status ${status}: ${body}`);
        }
    }
}

const ENVVAR_EXECUTABLES_TARGET_DIR = "OPENSHIFT_BIN";
const TARGET_DIRNAME = "openshift-bin";

let targetDir: string | undefined;
/**
 * @returns The directory that all executables will be installed to.
 * By default, this is /tmp/openshift-bin, to avoid dealing with permissions issues.
 * And /tmp/ is also not cleaned up by the @actions/checkout
 */
export async function getExecutablesTargetDir(): Promise<string> {
    const openshiftBinEnvValue = process.env[ENVVAR_EXECUTABLES_TARGET_DIR];

    if (targetDir) {
        return targetDir;
    }
    if (openshiftBinEnvValue) {
        targetDir = openshiftBinEnvValue;
        ghCore.info(`${ENVVAR_EXECUTABLES_TARGET_DIR} is set to "${openshiftBinEnvValue}"`);
    }
    else {
        let parentDir;

        const tmpDir = getTmpDir();
        if (tmpDir) {
            ghCore.info("Using temporary directory for storage");
            parentDir = tmpDir;
        }
        else {
            ghCore.info("Using CWD for storage");
            parentDir = process.cwd();
        }
        targetDir = path.join(parentDir, TARGET_DIRNAME);
    }

    await ghIO.mkdirP(targetDir);
    ghCore.info(`📁 CLIs will be downloaded to ${targetDir}`);
    ghCore.addPath(targetDir);
    ghCore.info(`Added ${targetDir} to PATH`);

    return targetDir;
}

const INSTALLED_FILENAME = "openshift-clients-installed.json";
export async function writeOutInstalledFile(installed: string): Promise<void> {
    const installedFilePath = path.join(await getExecutablesTargetDir(), INSTALLED_FILENAME);
    await fs.promises.writeFile(installedFilePath, installed);
    ghCore.info(`Wrote out installed versions to ${installedFilePath}`);
}

type OS = "linux" | "macos" | "windows";

let currentOS: OS | undefined;

export function getOS(): OS {
    if (currentOS == null) {
        const rawOS = process.platform;
        if (rawOS === "win32") {
            currentOS = "windows";
        }
        else if (rawOS === "darwin") {
            currentOS = "macos";
        }
        else if (rawOS !== "linux") {
            ghCore.warning(`Unrecognized OS "${rawOS}"`);
            currentOS = "linux";
        }
        else {
            currentOS = "linux";
        }
        ghCore.info(`Current operating system is ${currentOS}`);
    }

    return currentOS;
}

/**
 * The architectures that OpenShift binaries are built for.
 */
enum Architectures {
    AMD64 = "amd64",
    PPC64 = "ppc64le",
    Z64 = "s390x",
    ARM64 = "arm64",
}

type Architecture = `${Architectures}`;

let currentArch: Architecture | undefined;

export function getArch(): Architecture {
    if (currentArch == null) {
        // https://nodejs.org/api/process.html#process_process_arch
        let arch = process.arch;
        if (arch === "x64") {
            arch = Architectures.AMD64;
        }

        if (!Object.values(Architectures).map((a) => a.toString()).includes(arch)) {
            throw new Error(`Unsupported architecture "${arch}"`);
        }

        ghCore.info(`Current architecture is ${arch}`);
        currentArch = arch as Architecture;
    }

    return currentArch;
}

export function getTmpDir(): string {
    // this is what Actions runners use
    const runnerTmp = process.env.RUNNER_TEMP;
    if (runnerTmp) {
        return runnerTmp;
    }

    // fallback
    return os.tmpdir();
}

const SIZE_UNITS = [ "B", "KB", "MB", "GB" ];

/**
 * @returns The size of the resource at the given URL as a human-readable string. Eg, "1.23KB".
 * Returns 'unknown' if there is an error.
 */
export async function getSize(fileUrl: string): Promise<string> {
    try {
        const headRes = await HttpClient.head(fileUrl);
        await assertOkStatus(headRes);
        const contentLengthStr = headRes.message.headers["content-length"];

        let size = Number(contentLengthStr);
        let sizeUnitIndex = 0;
        while (size > 1024 && sizeUnitIndex < SIZE_UNITS.length) {
            size /= 1024;
            sizeUnitIndex++;
        }

        return `${size.toFixed(2)}${SIZE_UNITS[sizeUnitIndex]}`;
    }
    catch (err) {
        // handle errors here because we don't want a problem determining size to fail the entire operation
        ghCore.warning(`Failed to determine size of ${fileUrl} : ${err}`);
        return "unknown";
    }
}

/**
 * Joins a string array into a user-friendly list.
 * Eg, `joinList([ "tim", "erin", "john" ], "and")` => "tim, erin and john"
 */
export function joinList(strings_: readonly string[], andOrOr: "and" | "or" = "and"): string {
    // we have to duplicate "strings" here since we modify the array below and it's passed by reference
    const strings = Array.from(strings_).filter((s) => {
        if (!s) {
            return false;
        }
        return true;
    });

    // separate the last string from the others since we have to prepend andOrOr to it
    const lastString = strings.splice(strings.length - 1, 1)[0];

    let joined = strings.join(", ");
    if (strings.length > 0) {
        joined = `${joined} ${andOrOr} ${lastString}`;
    }
    else {
        joined = lastString;
    }
    return joined;
}

/**
 * The errors messages from octokit HTTP requests can be poor; prepending the status code helps clarify the problem.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
export function getBetterHttpError(err: any): Error {
    const status = err.status;
    if (status && err.message) {
        return new Error(`Received status ${status}: ${err.message}`);
    }
    return err;
}

export function assertDefined(value: unknown): asserts value {
    if (value == null) {
        throw new Error(`${value} must be defined`);
    }
}

/**
 *
 * @returns the assest download path for the provided client and version
 */
export function getGitHubReleaseAssetPath(
    clientName: InstallableClient, clientVersion: string, assetName: string
): string {
    return `https://github.com/${ClientDetailOverrides[clientName]?.github?.repoSlug}/releases/download/${clientVersion}/${assetName}`;
}

// Checks if provided client is downloaded from mirror or not
// Directory URL will always be missing in the clients installed from Github.
// So, considering this as a discriminator
export function isMirrorClient(client: ClientFile): client is MirrorClient {
    return client.mirrorDirectoryUrl != null;
}
