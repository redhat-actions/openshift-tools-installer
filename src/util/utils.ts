import * as ghCore from "@actions/core";
import * as os from "os";
import got from "got";

type OS = "linux" | "macos" | "windows";

let currentOS: OS;

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

let currentArch: Architecture;

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
    const runnerTmp = process.env["RUNNER_TEMP"];
    if (runnerTmp) {
        return runnerTmp;
    }

    // fallback
    return os.tmpdir();
}

const SIZE_UNITS = [ "B", "KB", "MB", "GB" ];

export async function getSize(fileUrl: string): Promise<string> {
    try {
        const headRes = await got.head(fileUrl);
        const contentLengthStr = headRes.headers["content-length"];

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
        ghCore.warning(`Failed to determine size of ${fileUrl}: ${err}`);
        return "unknown";
    }
}

/**
 * Joins a string array into a user-friendly list.
 * Eg, `joinList([ "tim", "erin", "john" ], "and")` => "tim, erin and john" (no oxford comma because it doesn't work with 'or')
 */
export function joinList(strings_: readonly string[], andOrOr: "and" | "or"): string {
    const strings = Array.from(strings_).filter((s) => {
        if (!s) {
            return false;
        }
        return true;
    });

    // separate the last string from the others since we have to prepend andOrOr to it
    const lastString = strings.splice(strings.length - 1, 1)[0];

    let joined: string = strings.join(", ");
    if (strings.length > 0) {
        joined = `${joined} ${andOrOr} ${lastString}`;
    }
    else {
        joined = lastString;
    }
    return joined;
}