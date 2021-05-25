import * as ghCore from "@actions/core";
import { URL } from "url";
import { Inputs } from "../generated/inputs-outputs";

const SKIP_CACHE_ENVVAR = "CLI_INSTALLER_SKIP_CACHE";
const skipCache = ghCore.getInput(Inputs.SKIP_CACHE);

export function shouldUseCache(): boolean {
    if (isGhes()) {
        ghCore.info(`⏩ GitHub enterprise detected; skipping cache. `
        + "For more information, see https://github.com/actions/cache/issues/505");
        return false;
    }

    if (process.env[SKIP_CACHE_ENVVAR] === "true" || skipCache === "true") {
        ghCore.info(`⏩ ${skipCache === "true" ? `Input ${Inputs.SKIP_CACHE}` : `${SKIP_CACHE_ENVVAR}`} `
        + `is set; skipping cache.`);
        return false;
    }

    return true;
}

/**
 * Checks if the running GitHub server is Enterprise server or not
 * @returns true if running on GitHub Enterprise Server
 */
function isGhes(): boolean {
    const ghUrl = new URL(
        process.env.GITHUB_SERVER_URL || "https://github.com"
    );
    return ghUrl.hostname.toUpperCase() !== "GITHUB.COM";
}
