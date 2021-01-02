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
            console.error(`Unrecognized OS "${rawOS}"`);
            currentOS = "linux";
        }
        else {
            currentOS = "linux";
        }
        console.log(`Current operating system is ${currentOS}`);
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

        console.log(`Current architecture is ${arch}`);
        currentArch = arch as Architecture;
    }

    return currentArch;
}
