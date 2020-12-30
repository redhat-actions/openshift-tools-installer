
import * as ghCore from "@actions/core";
import * as semver from "semver";

import { Inputs } from './generated/inputs-outputs';

const LATEST = "latest";

export async function run() {

    const clientsToInstall: { [key in Inputs]?: string } = {};

    for (const input of Object.values(Inputs)) {
        const clientVersion = ghCore.getInput(input);
        ghCore.info(`The raw version of ${input} to install is "${clientVersion}"`);

        if (clientVersion) {
            clientsToInstall[input] = parseVersion(clientVersion);
        }
    }

    console.log("The clients to install are: ", clientsToInstall);
}

function parseVersion(rawVersion: string): string {
    let version = rawVersion;

    if (version === LATEST) {
        return LATEST;
    }

    if (rawVersion.startsWith("v")) {
        rawVersion = rawVersion.substring(1, rawVersion.length);
    }

    const coerced = semver.coerce(rawVersion);
    if (coerced == null) {
        throw new Error(`Could not coerce "${rawVersion}"`);
    }

    return coerced.version;
}

run()
.catch(ghCore.setFailed);
